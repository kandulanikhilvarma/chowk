"use client";

import { LocateFixed } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

// Coordinates are rounded to 2 decimals (about 1 km) before they enter the URL,
// so a shared search link never carries someone's exact position.
export function NearMe({ className = "" }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [state, setState] = useState<"idle" | "busy" | "blocked">("idle");

  function locate() {
    if (!("geolocation" in navigator)) return setState("blocked");
    setState("busy");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = new URLSearchParams(params);
        next.set("lat", coords.latitude.toFixed(2));
        next.set("lng", coords.longitude.toFixed(2));
        next.set("sort", "nearest");
        next.delete("city");
        next.delete("page");
        setState("idle");
        router.push(`${pathname}?${next}`);
      },
      () => setState("blocked"),
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }

  return (
    <button
      type="button"
      onClick={locate}
      disabled={state === "busy"}
      className={`pressable inline-flex h-11 items-center justify-center gap-2 rounded-field border border-line bg-surface px-3 text-[15px] font-medium text-ink hover:bg-surface-2 disabled:opacity-60 ${className}`}
    >
      <LocateFixed className="size-4.5" aria-hidden />
      {state === "busy" ? "Finding you" : state === "blocked" ? "Location is off" : "Near me"}
    </button>
  );
}
