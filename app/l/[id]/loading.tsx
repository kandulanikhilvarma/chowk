import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading the ad" className="mx-auto grid max-w-6xl gap-6 px-4 pt-4 md:pt-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-4">
        <Skeleton className="aspect-[4/3] w-full rounded-card" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-64 w-full rounded-card" />
    </div>
  );
}
