export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`rounded-field bg-surface-2 motion-safe:animate-pulse ${className}`} />;
}

// Mirrors ListingCard so the grid does not resize when the real cards arrive.
export function ListingCardSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// Chats and notifications share one row: leading square or circle, two lines, a trailing time.
export function RowListSkeleton({
  count = 6,
  avatar = "square",
  label,
}: {
  count?: number;
  avatar?: "square" | "circle";
  label: string;
}) {
  return (
    <ul
      role="status"
      aria-label={label}
      className="divide-y divide-line overflow-hidden rounded-card bg-surface ring-1 ring-line"
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex items-center gap-3 p-3">
          <Skeleton className={avatar === "circle" ? "size-10 shrink-0 rounded-full" : "size-12 shrink-0"} />
          <span className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3.5 w-2/3" />
          </span>
          <Skeleton className="h-3 w-10 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

export function ListingGridSkeleton({ count = 8, label = "Loading ads" }: { count?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}
