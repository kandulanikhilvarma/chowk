"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { ListingCardData } from "@/components/listing/listing-card";
import { priceLabel } from "@/lib/format";

// Centre of India, for a search with nothing to show.
const INDIA: [number, number] = [22.5, 79];

// Pins sit on the ~500 m grid centre the database stores, never the seller's spot. Leaflet loads only
// when someone opens the map. Popups are built from DOM nodes with textContent, so a title cannot inject HTML.
export function ResultsMap({ listings }: { listings: ListingCardData[] }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !box.current) return;
      map = L.map(box.current, { scrollWheelZoom: false, zoomControl: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 17,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const points: [number, number][] = [];
      for (const l of listings) {
        if (l.lat == null || l.lng == null) continue;
        points.push([l.lat, l.lng]);
        const pin = document.createElement("span");
        pin.className = "map-pin font-price";
        pin.textContent = priceLabel(l.pricePaise, l.priceType, true);

        const popup = document.createElement("a");
        popup.href = `/l/${l.id}`;
        popup.className = "map-popup";
        const title = document.createElement("strong");
        title.textContent = l.title;
        const place = document.createElement("span");
        place.textContent = `${l.locality ? `${l.locality}, ` : ""}${l.city}`;
        popup.append(title, place);

        L.marker([l.lat, l.lng], { icon: L.divIcon({ className: "", html: pin, iconSize: undefined }), title: l.title })
          .bindPopup(popup)
          .addTo(map);
      }
      if (points.length) map.fitBounds(points, { padding: [32, 32], maxZoom: 14 });
      else map.setView(INDIA, 4);
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [listings]);

  const pinned = listings.filter((l) => l.lat != null).length;
  return (
    <div className="space-y-2">
      <div
        ref={box}
        role="region"
        aria-label={`Map of ${pinned} ads`}
        className="h-[60dvh] min-h-80 overflow-hidden rounded-card bg-surface-2 ring-1 ring-line"
      />
      <p className="text-xs text-ink-2">Pins show the area, rounded to about 500 m. The exact place is never shared.</p>
    </div>
  );
}
