"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { listingSchema } from "@/lib/listing-schema";
import { getCities } from "@/lib/listings";
import { findProhibited } from "@/lib/prohibited";
import { createClient } from "@/lib/supabase/server";
import { isRcNumber } from "@/lib/vehicle";

export type PostResult = { id: string } | { error: string; fields?: Record<string, string[] | undefined> };
type Supabase = Awaited<ReturnType<typeof createClient>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_ENDED = { error: "Your session ended. Sign in again, then save." };

function failure(error: { code?: string; message: string }, context: string) {
  // P0001 is a rule from a trigger, such as the daily ad limit. Its message is written for people.
  if (error.code === "P0001") return { error: error.message };
  console.error(context, error);
  return { error: "The ad could not be saved. Try again." };
}

// Shared by create and edit. Server Actions are reachable by direct POST, so nothing from the form is trusted.
async function prepare(supabase: Supabase, uid: string, input: unknown) {
  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the marked fields.", fields: z.flattenError(parsed.error).fieldErrors };
  const l = parsed.data;

  const banned = findProhibited(`${l.title} ${l.description}`);
  if (banned) return { error: `Chowk does not allow ${banned.group}. Remove "${banned.term}" or read the terms.` };

  if (l.photos.some((p) => !p.path.startsWith(`${uid}/`) || !p.thumbPath.startsWith(`${uid}/`))) {
    return { error: "A photo upload did not finish. Add the photos again." };
  }

  const [cities, category] = await Promise.all([
    getCities(),
    supabase.from("categories").select("attribute_schema").eq("id", l.categoryId).maybeSingle(),
  ]);
  const city = cities.find((c) => c.id === l.cityId);
  if (!city) return { error: "Choose a city.", fields: { cityId: ["Choose a city."] } };
  if (category.error || !category.data) return { error: "Choose a category.", fields: { categoryId: ["Choose a category."] } };

  // Keep only the fields this category defines, and drop empty values.
  const keys = new Set(
    Array.isArray(category.data.attribute_schema)
      ? category.data.attribute_schema.map((f) => (f as { key?: string })?.key)
      : [],
  );
  const attributes = Object.fromEntries(Object.entries(l.attributes).filter(([k, v]) => keys.has(k) && v !== ""));
  const rc = attributes.rc_number;
  if (typeof rc === "string" && !isRcNumber(rc)) {
    return { error: "Enter the RC number like MH 12 AB 1234, or leave it empty." };
  }
  const noPrice = l.priceType === "free" || l.priceType === "swap";

  return {
    acceptTerms: l.acceptTerms,
    row: {
      kind: l.kind,
      title: l.title,
      description: l.description,
      category_id: l.categoryId,
      price_type: l.priceType,
      price_paise: noPrice ? null : l.priceRupees! * 100,
      condition: l.kind === "wanted" ? null : l.condition,
      attributes,
      city_id: city.id,
      locality: l.locality || null,
      pincode: l.pincode || null,
      location: `SRID=4326;POINT(${city.lng} ${city.lat})`,
    },
    photos: l.photos.map((p, position) => ({
      path: p.path,
      thumb_path: p.thumbPath,
      position,
      width: p.width,
      height: p.height,
    })),
  };
}

export async function createListing(input: unknown): Promise<PostResult> {
  const supabase = await createClient();
  const uid = (await supabase.auth.getClaims()).data?.claims.sub;
  if (!uid) return SESSION_ENDED;

  const prepared = await prepare(supabase, uid, input);
  if (prepared.error !== undefined) return { error: prepared.error, fields: prepared.fields };

  const profile = await supabase.from("profiles").select("terms_accepted_at").eq("id", uid).single();
  if (profile.error) throw new Error(`profile read failed: ${profile.error.message}`);
  if (!profile.data.terms_accepted_at) {
    if (!prepared.acceptTerms) return { error: "Accept the terms to post your first ad." };
    const { error } = await supabase.from("profiles").update({ terms_accepted_at: new Date().toISOString() }).eq("id", uid);
    if (error) throw new Error(`terms update failed: ${error.message}`);
  }

  const { data: row, error } = await supabase.from("listings").insert(prepared.row).select("id").single();
  if (error) return failure(error, "listing insert failed");

  if (prepared.photos.length) {
    const { error: photoError } = await supabase
      .from("listing_images")
      .insert(prepared.photos.map((p) => ({ ...p, listing_id: row.id })));
    if (photoError) {
      console.error("listing_images insert failed", photoError);
      await supabase.from("listings").delete().eq("id", row.id);
      return { error: "The photos could not be saved. Try again." };
    }
  }

  revalidatePath("/");
  return { id: row.id };
}

export async function updateListing(id: string, input: unknown): Promise<PostResult> {
  if (!UUID.test(id)) return { error: "Ad not found." };
  const supabase = await createClient();
  const uid = (await supabase.auth.getClaims()).data?.claims.sub;
  if (!uid) return SESSION_ENDED;

  const prepared = await prepare(supabase, uid, input);
  if (prepared.error !== undefined) return { error: prepared.error, fields: prepared.fields };

  const updated = await supabase
    .from("listings")
    .update(prepared.row)
    .eq("id", id)
    .eq("user_id", uid)
    .neq("status", "removed")
    .select("id");
  if (updated.error) return failure(updated.error, `listing update failed ${id}`);
  if (!updated.data.length) return { error: "Ad not found." };

  // Positions are unique per ad, so a reorder cannot update rows in place. Replace the set instead.
  const old = await supabase
    .from("listing_images")
    .delete()
    .eq("listing_id", id)
    .select("path, thumb_path, position, width, height");
  if (old.error) return failure(old.error, `listing_images delete failed ${id}`);

  if (prepared.photos.length) {
    const { error } = await supabase.from("listing_images").insert(prepared.photos.map((p) => ({ ...p, listing_id: id })));
    if (error) {
      console.error("listing_images insert failed", id, error);
      if (old.data.length) await supabase.from("listing_images").insert(old.data.map((p) => ({ ...p, listing_id: id })));
      return { error: "The photos could not be saved. Your old photos stay." };
    }
  }

  const kept = new Set(prepared.photos.flatMap((p) => [p.path, p.thumb_path]));
  const unused = old.data.flatMap((p) => [p.path, p.thumb_path]).filter((p) => !kept.has(p));
  if (unused.length) {
    const { error } = await supabase.storage.from("listing-images").remove(unused);
    if (error) console.error("photo cleanup failed", id, error);
  }

  revalidatePath(`/l/${id}`);
  revalidatePath("/me");
  revalidatePath("/");
  return { id };
}
