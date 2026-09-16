export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`rounded-field bg-surface-2 motion-safe:animate-pulse ${className}`} />;
}

// Placeholder for a page of listing cards while search results load.
export function ResultsSkeleton() {
  return (
    <div role="status" aria-label="Loading ads" className="mx-auto max-w-6xl space-y-4 px-4 pt-4 md:pt-8">
      <Skeleton className="h-9 w-2/3 max-w-sm" />
      <Skeleton className="h-9 w-full" />
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="space-y-2">
            <Skeleton className="aspect-[4/3] w-full rounded-card" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-4/5" />
          </li>
        ))}
      </ul>
    </div>
  );
}
