"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { listingSchema } from "@/lib/listing-schema";
import { getCities } from "@/lib/listings";
import { findProhibited } from "@/lib/prohibited";
import { createClient } from "@/lib/supabase/server";

export type PostResult = { id: string } | { error: string; fields?: Record<string, string[] | undefined> };

// Reachable by direct POST, so every check runs here again. Writes go through RLS as the user.
export async function createListing(input: unknown): Promise<PostResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const uid = auth?.claims.sub;
  if (!uid) return { error: "Your session ended. Sign in again, then post." };

  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the marked fields.", fields: z.flattenError(parsed.error).fieldErrors };
  const l = parsed.data;

  const banned = findProhibited(`${l.title} ${l.description}`);
  if (banned) return { error: `Chowk does not allow ${banned.group}. Remove "${banned.term}" or read the terms.` };

  if (l.photos.some((p) => !p.path.startsWith(`${uid}/`) || !p.thumbPath.startsWith(`${uid}/`))) {
    return { error: "A photo upload did not finish. Add the photos again." };
  }

  const [cities, category, profile] = await Promise.all([
    getCities(),
    supabase.from("categories").select("attribute_schema").eq("id", l.categoryId).maybeSingle(),
    supabase.from("profiles").select("terms_accepted_at").eq("id", uid).single(),
  ]);
  const city = cities.find((c) => c.id === l.cityId);
  if (!city) return { error: "Choose a city.", fields: { cityId: ["Choose a city."] } };
  if (category.error || !category.data) return { error: "Choose a category.", fields: { categoryId: ["Choose a category."] } };
  if (profile.error) throw new Error(`profile read failed: ${profile.error.message}`);

  if (!profile.data.terms_accepted_at) {
    if (!l.acceptTerms) return { error: "Accept the terms to post your first ad." };
    const { error } = await supabase.from("profiles").update({ terms_accepted_at: new Date().toISOString() }).eq("id", uid);
    if (error) throw new Error(`terms update failed: ${error.message}`);
  }

  // Keep only the fields this category defines, and drop empty values.
  const keys = new Set(
    Array.isArray(category.data.attribute_schema)
      ? category.data.attribute_schema.map((f) => (f as { key?: string })?.key)
      : [],
  );
  const attributes = Object.fromEntries(Object.entries(l.attributes).filter(([k, v]) => keys.has(k) && v !== ""));

  const noPrice = l.priceType === "free" || l.priceType === "swap";
  const { data: row, error } = await supabase
    .from("listings")
    .insert({
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
    })
    .select("id")
    .single();
  if (error) {
    // P0001 is a rule from a trigger, such as the daily ad limit. Its message is written for people.
    if (error.code === "P0001") return { error: error.message };
    console.error("listing insert failed", error);
    return { error: "The ad could not be saved. Try again." };
  }

  if (l.photos.length) {
    const { error: photoError } = await supabase.from("listing_images").insert(
      l.photos.map((p, position) => ({
        listing_id: row.id,
        path: p.path,
        thumb_path: p.thumbPath,
        position,
        width: p.width,
        height: p.height,
      })),
    );
    if (photoError) {
      console.error("listing_images insert failed", photoError);
      await supabase.from("listings").delete().eq("id", row.id);
      return { error: "The photos could not be saved. Try again." };
    }
  }

  revalidatePath("/");
  return { id: row.id };
}
