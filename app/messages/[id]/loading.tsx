import { Skeleton } from "@/components/ui/skeleton";

// Mirrors ChatRoom: the ad header, a run of bubbles, then the composer.
export default function Loading() {
  const bubbles = [
    { mine: false, w: "w-40" },
    { mine: true, w: "w-28" },
    { mine: false, w: "w-52" },
    { mine: true, w: "w-36" },
  ];
  return (
    <div role="status" aria-label="Loading chat" className="mx-auto flex max-w-2xl flex-col px-4 pt-3 md:pt-6">
      <div className="flex items-center gap-3 rounded-card bg-surface p-3 ring-1 ring-line">
        <Skeleton className="size-12 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3.5 w-1/4" />
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {bubbles.map(({ mine, w }, i) => (
          <div key={i} className={mine ? "flex justify-end" : "flex justify-start"}>
            <Skeleton className={`h-10 rounded-card ${w}`} />
          </div>
        ))}
      </div>
      <Skeleton className="mt-4 h-12 rounded-full" />
    </div>
  );
}
