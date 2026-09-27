import Link from "next/link";
import type { ReactNode } from "react";
import { ListingCard, type ListingCardData } from "@/components/listing/listing-card";

// A titled row of cards. Renders nothing when empty, so callers decide what an empty state says.
export function ListingRail({
  id,
  title,
  href,
  listings,
  morph = true,
  priority = 0,
  icon,
}: {
  id: string;
  title: string;
  href?: string;
  listings: ListingCardData[];
  morph?: boolean;
  priority?: number;
  icon?: ReactNode;
}) {
  if (listings.length === 0) return null;
  return (
    <section aria-labelledby={id}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 id={id} className="flex items-center gap-2 text-2xl font-bold">
          {icon}
          {title}
        </h2>
        {href && (
          <Link href={href} className="shrink-0 text-sm font-semibold text-primary underline-offset-4 hover:underline">
            See all
          </Link>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {listings.map((listing, i) => (
          <li key={listing.id}>
            <ListingCard listing={listing} morph={morph} priority={i < priority} />
          </li>
        ))}
      </ul>
    </section>
  );
}
