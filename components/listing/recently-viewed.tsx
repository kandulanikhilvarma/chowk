"use client";

import { useEffect } from "react";
import { History } from "lucide-react";
import { ListingCard, type ListingCardData } from "@/components/listing/listing-card";
import { clearLocal, pushLocal, useLocalList } from "@/lib/local-list";

const KEY = "chowk:recent";

// Stays on this device only. Nothing about browsing history reaches the server.
export function RecordView({ listing }: { listing: ListingCardData }) {
  useEffect(() => pushLocal(KEY, listing, 12, (a, b) => a.id === b.id), [listing]);
  return null;
}

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const list = useLocalList<ListingCardData>(KEY)
    .filter((l) => l.id !== excludeId)
    .slice(0, 4);

  if (list.length === 0) return null;
  return (
    <section aria-labelledby="recent">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 id="recent" className="flex items-center gap-2 text-2xl font-bold">
          <History className="size-5 text-ink-2" aria-hidden />
          Recently viewed
        </h2>
        <button
          type="button"
          onClick={() => clearLocal(KEY)}
          className="text-sm font-semibold text-ink-2 underline-offset-4 hover:text-ink hover:underline"
        >
          Clear
        </button>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {list.map((listing) => (
          <li key={listing.id}>
            {/* The same ad can sit in a rail above, and two morph names on one page cancel the transition. */}
            <ListingCard listing={listing} morph={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}
