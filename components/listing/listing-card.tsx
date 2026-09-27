import Link from "next/link";
import { ViewTransition } from "react";
import { ImageOff, MapPin, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/lib/database.types";
import { formatDistance, priceLabel, timeAgo, type PriceType } from "@/lib/format";

export type ListingCardData = {
  id: string;
  title: string;
  pricePaise: number | null;
  priceType: PriceType;
  kind: "offer" | "wanted";
  status?: Enums<"listing_status">;
  /** The last higher price, set by the database when the seller lowers it. */
  previousPricePaise?: number | null;
  /** The ~500 m grid centre the database stores, for map pins. Never the seller's spot. */
  lat?: number | null;
  lng?: number | null;
  city: string;
  locality?: string | null;
  distanceKm?: number | null;
  createdAt: string;
  imageUrl?: string | null;
};

// The photo morphs into the ad page gallery on navigation. Two cards with the same name on one page
// cancel the transition, so a rail that can repeat an ad from another rail passes morph={false}.
export function listingPhotoName(id: string) {
  return `listing-photo-${id}`;
}

// priority: the first cards on screen load at once, because one of them is usually the largest paint.
export function ListingCard({
  listing: l,
  priority = false,
  morph = true,
}: {
  listing: ListingCardData;
  priority?: boolean;
  morph?: boolean;
}) {
  const dropped = l.previousPricePaise != null && l.pricePaise != null && l.previousPricePaise > l.pricePaise;
  const photo = l.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- photos arrive resized from the browser; skips the Vercel Hobby image quota
    <img
      src={l.imageUrl}
      alt=""
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className="size-full object-cover transition-transform duration-300 ease-(--ease-out) motion-safe:group-hover:scale-[1.04]"
    />
  ) : (
    <div className="grid size-full place-items-center text-ink-2">
      <ImageOff className="size-8" aria-hidden />
    </div>
  );

  return (
    <Link
      href={`/l/${l.id}`}
      className="group pressable lift block overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {morph ? (
          <ViewTransition name={listingPhotoName(l.id)} share="morph" default="none">
            {photo}
          </ViewTransition>
        ) : (
          photo
        )}
        <div className="absolute inset-x-2 top-2 flex flex-wrap gap-1">
          {l.kind === "wanted" && <Badge tone="primary">Wanted</Badge>}
          {l.status === "reserved" && <Badge tone="warning">Reserved</Badge>}
          {l.status === "sold" && <Badge tone="success">Sold</Badge>}
          {dropped && (
            <Badge tone="success">
              <TrendingDown className="size-3.5" aria-hidden />
              Price dropped
            </Badge>
          )}
        </div>
      </div>
      <div className="space-y-1 p-3">
        <p className="flex items-baseline gap-2">
          <span className={`font-price text-xl font-bold ${l.priceType === "free" ? "text-success" : "text-ink"}`}>
            {priceLabel(l.pricePaise, l.priceType, true)}
          </span>
          {dropped ? (
            <span className="text-xs text-ink-2">
              <span className="sr-only">Price dropped, was </span>
              <s className="font-price">{priceLabel(l.previousPricePaise!, l.priceType, true)}</s>
            </span>
          ) : (
            l.priceType === "negotiable" && <span className="text-xs text-ink-2">Negotiable</span>
          )}
        </p>
        <h3 className="line-clamp-2 min-h-10 text-sm leading-5 text-ink group-hover:text-primary">{l.title}</h3>
        {/* The place truncates; the distance never does, because it is what a nearby search is about. */}
        <p data-place className="flex items-center gap-1 text-xs text-ink-2">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {l.locality ? `${l.locality}, ` : ""}
            {l.city}
          </span>
          {l.distanceKm != null && <span className="shrink-0">· {formatDistance(l.distanceKm)}</span>}
        </p>
        <p className="text-xs text-ink-2">{timeAgo(l.createdAt)}</p>
      </div>
    </Link>
  );
}
