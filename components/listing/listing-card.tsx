import Link from "next/link";
import { ImageOff, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistance, priceLabel, timeAgo, type PriceType } from "@/lib/format";

export type ListingCardData = {
  id: string;
  title: string;
  pricePaise: number | null;
  priceType: PriceType;
  kind: "offer" | "wanted";
  city: string;
  locality?: string | null;
  distanceKm?: number | null;
  createdAt: string;
  imageUrl?: string | null;
  isDemo?: boolean;
};

// priority: the first cards on screen load at once, because one of them is usually the largest paint.
export function ListingCard({ listing: l, priority = false }: { listing: ListingCardData; priority?: boolean }) {
  return (
    <Link
      href={`/l/${l.id}`}
      className="group pressable block overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {l.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- photos arrive resized from the browser; skips the Vercel Hobby image quota
          <img
            src={l.imageUrl}
            alt=""
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            className="size-full object-cover transition-transform duration-200 ease-(--ease-out) group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center text-ink-2">
            <ImageOff className="size-8" aria-hidden />
          </div>
        )}
        <div className="absolute inset-x-2 top-2 flex justify-between">
          {l.kind === "wanted" ? <Badge tone="primary">Wanted</Badge> : <span />}
          {l.isDemo && <Badge>Demo</Badge>}
        </div>
      </div>
      <div className="space-y-1 p-3">
        <p className="flex items-baseline gap-2">
          <span className={`font-display text-xl font-bold ${l.priceType === "free" ? "text-success" : "text-ink"}`}>
            {priceLabel(l.pricePaise, l.priceType, true)}
          </span>
          {l.priceType === "negotiable" && <span className="text-xs text-ink-2">Negotiable</span>}
        </p>
        <h3 className="line-clamp-2 min-h-10 text-sm leading-5 text-ink">{l.title}</h3>
        <p className="flex items-center gap-1 truncate text-xs text-ink-2">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {l.locality ? `${l.locality}, ` : ""}
            {l.city}
            {l.distanceKm != null && ` · ${formatDistance(l.distanceKm)}`}
          </span>
        </p>
        <p className="text-xs text-ink-2">{timeAgo(l.createdAt)}</p>
      </div>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card bg-surface ring-1 ring-line">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
