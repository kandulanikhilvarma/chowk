"use server";

import { revalidatePath } from "next/cache";
import { getCities } from "@/lib/listings";
import { toSearchArgs } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/server";

export type AdAction = "reserve" | "activate" | "pause" | "sold" | "renew" | "bump" | "delete";
export type AdResult = { error?: string; notice?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nextStatus = { reserve: "reserved", activate: "active", pause: "paused" } as const;
const SESSION_ENDED = { error: "Your session ended. Sign in again." };

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ? supabase : null;
}

function failure(error: { code?: string; message: string }, context: string): AdResult {
  if (error.code === "P0001") return { error: error.message };
  if (error.code === "P0002") return { error: "Ad not found." };
  console.error(context, error);
  return { error: "That did not work. Try again." };
}

// One entry point for the My ads buttons. RLS and the RPCs make sure the caller owns the ad.
export async function manageAd(id: string, action: AdAction): Promise<AdResult> {
  if (!UUID.test(id)) return { error: "Ad not found." };
  const supabase = await signedIn();
  if (!supabase) return SESSION_ENDED;

  let result: { error: { code?: string; message: string } | null; data?: unknown };
  let notice: string | undefined;

  switch (action) {
    case "reserve":
    case "activate":
    case "pause":
      // Sold ads stay sold: deals and ratings depend on that.
      result = await supabase
        .from("listings")
        .update({ status: nextStatus[action] })
        .eq("id", id)
        .in("status", ["active", "reserved", "paused"])
        .select("id");
      if (!result.error && !(result.data as unknown[]).length) return { error: "Ad not found." };
      break;
    case "sold":
      result = await supabase.rpc("mark_sold", { p_listing: id });
      notice = "Marked as sold. Open chats get a note.";
      break;
    case "renew":
      result = await supabase.rpc("renew_listing", { p_listing: id });
      notice = "Your ad stays online for 60 more days.";
      break;
    case "bump":
      result = await supabase.rpc("bump_listing", { p_listing: id });
      notice = "Your ad is back at the top of the list.";
      break;
    case "delete": {
      const { data: images } = await supabase.from("listing_images").select("path, thumb_path").eq("listing_id", id);
      result = await supabase.from("listings").delete().eq("id", id).select("id");
      if (!result.error && !(result.data as unknown[]).length) return { error: "Ad not found." };
      // ponytail: files go after the row, so a storage hiccup leaves orphan files, never a broken ad.
      if (!result.error && images?.length) {
        const { error } = await supabase.storage.from("listing-images").remove(images.flatMap((i) => [i.path, i.thumb_path]));
        if (error) console.error("photo cleanup failed", id, error);
      }
      notice = "Ad deleted.";
      break;
    }
  }

  if (result.error) return failure(result.error, `manageAd ${action} ${id}`);

  revalidatePath("/me");
  revalidatePath(`/l/${id}`);
  revalidatePath("/");
  return { notice };
}

export async function setFavorite(listingId: string, saved: boolean): Promise<AdResult> {
  if (!UUID.test(listingId)) return { error: "Ad not found." };
  const supabase = await signedIn();
  if (!supabase) return SESSION_ENDED;

  const { error } = saved
    ? await supabase.from("favorites").insert({ listing_id: listingId })
    : await supabase.from("favorites").delete().eq("listing_id", listingId);
  // 23505: already on the watchlist, which is the state the user asked for.
  if (error && error.code !== "23505") return failure(error, `setFavorite ${listingId}`);

  revalidatePath("/me/saved");
  return {};
}

// Takes the raw search URL params and validates them the same way the search page does.
export async function saveSearch(raw: Record<string, string>, routeCategory?: string): Promise<AdResult> {
  const supabase = await signedIn();
  if (!supabase) return SESSION_ENDED;

  const cities = await getCities();
  const city = cities.find((c) => c.slug === raw.city);
  const { args } = toSearchArgs(raw, routeCategory, city && { lat: city.lat, lng: city.lng });

  let category: { id: number; name: string } | null = null;
  if (args.p_category) {
    const { data } = await supabase.from("categories").select("id, name").eq("slug", args.p_category).maybeSingle();
    category = data;
  }

  const place = city ? `near ${city.name}` : args.p_lat !== undefined ? "near my location" : null;
  const label = [args.p_q && `"${args.p_q}"`, category?.name, place].filter(Boolean).join(" ") || "All new ads";

  const { error } = await supabase.from("saved_searches").insert({
    label: label.slice(0, 80),
    query: {
      q: args.p_q,
      category_id: category?.id,
      kind: args.p_kind,
      min_paise: args.p_min_paise,
      max_paise: args.p_max_paise,
      lat: args.p_lat,
      lng: args.p_lng,
      radius_km: args.p_radius_km,
      days: args.p_days,
      seller: args.p_seller,
      photos: args.p_has_photos,
    },
  });
  if (error) return failure(error, "saveSearch");

  revalidatePath("/me/searches");
  return { notice: "Search saved. You get a notice when a new ad matches." };
}

export async function deleteSavedSearch(id: number): Promise<AdResult> {
  if (!Number.isSafeInteger(id)) return { error: "Search not found." };
  const supabase = await signedIn();
  if (!supabase) return SESSION_ENDED;

  const { error } = await supabase.from("saved_searches").delete().eq("id", id);
  if (error) return failure(error, `deleteSavedSearch ${id}`);

  revalidatePath("/me/searches");
  return {};
}
