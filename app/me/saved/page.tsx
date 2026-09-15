import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FavoriteButton } from "@/components/listing/favorite-button";
import { ListingCard } from "@/components/listing/listing-card";
import { ButtonLink } from "@/components/ui/button";
import { photoBase } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Watchlist", robots: { index: false } };

export default async function SavedPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/login?next=/me/saved");

  const { data, error } = await supabase
    .from("favorites")
    .select(
      "created_at, listing:listings(id, title, price_paise, price_type, kind, locality, created_at, is_demo, demo_image_url, city:cities(name), images:listing_images(thumb_path, position))",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`watchlist read failed: ${error.message}`);

  // RLS hides ads that were sold long ago, expired or removed, so their rows come back without a listing.
  const listings = data.flatMap((f) => (f.listing ? [f.listing] : []));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-6 md:pt-10">
      <h1 className="text-3xl font-bold">Watchlist</h1>
      {listings.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-card bg-surface px-6 py-10 text-center ring-1 ring-line">
          <p className="font-display text-xl font-bold">Your watchlist is empty</p>
          <p className="max-w-xs text-sm text-ink-2">Save ads you like. You get a notice when the price drops.</p>
          <ButtonLink href="/s">Browse ads</ButtonLink>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {listings.map((l) => {
            const cover = [...l.images].sort((a, b) => a.position - b.position)[0];
            return (
              <li key={l.id} className="space-y-2">
                <ListingCard
                  listing={{
                    id: l.id,
                    title: l.title,
                    pricePaise: l.price_paise,
                    priceType: l.price_type,
                    kind: l.kind,
                    city: l.city?.name ?? "",
                    locality: l.locality,
                    createdAt: l.created_at,
                    imageUrl: cover ? photoBase + cover.thumb_path : l.demo_image_url,
                    isDemo: l.is_demo,
                  }}
                />
                <FavoriteButton listingId={l.id} initialSaved />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
