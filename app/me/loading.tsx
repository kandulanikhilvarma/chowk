import { Skeleton } from "@/components/ui/skeleton";

// The name in the heading is not known yet, so it stays a bar until the profile lands.
export default function Loading() {
  return (
    <div role="status" aria-label="Loading your profile" className="mx-auto max-w-xl space-y-6 px-4 pt-6 md:pt-10">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-20 rounded-card" />
      </div>
      <Skeleton className="h-24 rounded-card" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-28 rounded-card" />
      </div>
    </div>
  );
}
