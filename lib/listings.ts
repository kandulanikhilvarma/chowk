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
    imageUrl: row.thumb_path ? photoBase + row.thumb_path : row.demo_image_url,
    isDemo: row.is_demo,
  };
}

export async function searchListings(args: SearchArgs = {}): Promise<ListingCardData[]> {
  const { data, error } = await supabasePublic.rpc("search_listings", args);
  if (error) throw new Error(`search_listings failed: ${error.message}`);
  return data.map(toCard);
}
