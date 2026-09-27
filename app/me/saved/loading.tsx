import { ListingGridSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-6 md:pt-10">
      <h1 className="text-3xl font-bold">Watchlist</h1>
      <ListingGridSkeleton count={4} label="Loading your watchlist" />
    </div>
  );
}
