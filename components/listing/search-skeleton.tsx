import { ListingGridSkeleton, Skeleton } from "@/components/ui/skeleton";

// Same shell as SearchView: heading, the four filter controls, then the results grid.
// Holding the shape stops the filter bar from jumping when results land.
export function SearchSkeleton({ title }: { title?: string }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-4 md:pt-8">
      {title ? <h1 className="text-2xl font-bold md:text-3xl">{title}</h1> : <Skeleton className="h-8 w-48" />}
      <div aria-hidden className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
      <div aria-hidden className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
      <ListingGridSkeleton count={8} label="Loading results" />
    </div>
  );
}
