import { cache } from "react";
import type { ListingCardData } from "@/components/listing/listing-card";
import type { Database } from "@/lib/database.types";
import { supabasePublic } from "@/lib/supabase/public";

type Fn = Database["public"]["Functions"]["search_listings"];
export type SearchArgs = Fn["Args"];
type SearchRow = Fn["Returns"][number];

export const photoBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/`;

// Uploaded thumbs live in Storage; demo rows carry a hotlinked Unsplash URL instead.
export function toCard(row: SearchRow): ListingCardData {
  return {
    id: row.id,
    title: row.title,
    pricePaise: row.price_paise,
    priceType: row.price_type,
    kind: row.kind,
    status: row.status,
    previousPricePaise: row.previous_price_paise,
    lat: row.lat,
    lng: row.lng,
    city: row.city,
    locality: row.locality,
    distanceKm: row.distance_km,
    createdAt: row.created_at,
    // Demo photos come from Unsplash at 800 px; cards show at most about 300 CSS px.
    imageUrl: row.thumb_path ? photoBase + row.thumb_path : row.demo_image_url?.replace("w=800&h=600", "w=480&h=360"),
  };
}

// One query per request, shared by the city picker and the radius origin.
export const getCities = cache(async () => {
  const { data, error } = await supabasePublic.rpc("list_cities");
  if (error) throw new Error(`list_cities failed: ${error.message}`);
  return data;
});

export async function searchListings(args: SearchArgs = {}): Promise<ListingCardData[]> {
  const { data, error } = await supabasePublic.rpc("search_listings", args);
  if (error) throw new Error(`search_listings failed: ${error.message}`);
  return data.map(toCard);
}

// Top-level categories in menu order. Home tiles and the search filter share one query per request.
export const getTopCategories = cache(async () => {
  const { data, error } = await supabasePublic
    .from("categories")
    .select("slug, name")
    .is("parent_id", null)
    .order("position");
  if (error) throw new Error(`categories failed: ${error.message}`);
  return data;
});

// A seller's live ads, newest bump first. The profile page lists them all; the ad page shows a few others.
export async function sellerListings(userId: string, { excludeId, limit = 24 }: { excludeId?: string; limit?: number } = {}) {
  let query = supabasePublic
    .from("listings")
    .select(
      "id, title, price_paise, price_type, kind, status, locality, created_at, demo_image_url, city:cities(name), images:listing_images(thumb_path, position)",
    )
    .eq("user_id", userId)
    .in("status", ["active", "reserved"])
    .gt("expires_at", new Date().toISOString())
    .order("bumped_at", { ascending: false })
    .limit(limit);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw new Error(`listings for ${userId} failed: ${error.message}`);
  return data.map(
    (r): ListingCardData => ({
      id: r.id,
      title: r.title,
      pricePaise: r.price_paise,
      priceType: r.price_type,
      kind: r.kind,
      status: r.status,
      city: r.city?.name ?? "",
      locality: r.locality,
      createdAt: r.created_at,
      imageUrl: thumbUrl(r.images) ?? r.demo_image_url?.replace("w=800&h=600", "w=480&h=360"),
    }),
  );
}

export function thumbUrl(images: { thumb_path: string | null; position: number }[]) {
  const first = [...images].sort((a, b) => a.position - b.position)[0]?.thumb_path;
  return first ? photoBase + first : undefined;
}
