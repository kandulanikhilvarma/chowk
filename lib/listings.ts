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
    city: row.city,
    locality: row.locality,
    distanceKm: row.distance_km,
    createdAt: row.created_at,
    // Demo photos come from Unsplash at 800 px; cards show at most about 300 CSS px.
    imageUrl: row.thumb_path ? photoBase + row.thumb_path : row.demo_image_url?.replace("w=800&h=600", "w=480&h=360"),
    isDemo: row.is_demo,
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
