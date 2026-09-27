import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the ad page: breadcrumb, photo and details on the left, the seller card on the right.
export default function Loading() {
  return (
    <article className="mx-auto max-w-6xl px-4 pt-4 md:pt-8">
      <Skeleton className="mb-3 h-5 w-40" />
      <div role="status" aria-label="Loading ad" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Skeleton className="aspect-[4/3] rounded-card" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="space-y-3 rounded-card bg-surface p-4 ring-1 ring-line">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-11 w-full rounded-full" />
        </div>
      </div>
    </article>
  );
}
