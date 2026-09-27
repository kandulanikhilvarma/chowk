"use client";

import { useRef, useState, ViewTransition, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { listingPhotoName } from "@/components/listing/listing-card";

const arrow =
  "pressable absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/90 text-ink shadow-card ring-1 ring-line hover:bg-surface disabled:opacity-0";

// Swipe on a phone, arrows and thumbnails on a desktop, full screen on tap. The track is plain CSS
// scroll snap, so it works before hydration and the counter follows whatever scrolled it.
export function Gallery({ id, title, photos }: { id: string; title: string; photos: string[] }) {
  const track = useRef<HTMLUListElement>(null);
  const big = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const count = photos.length;
  const alt = (i: number) => `${title}, photo ${i + 1} of ${count}`;

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(count - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") go(index + 1);
    if (e.key === "ArrowLeft") go(index - 1);
  };

  if (count === 0) {
    return <div className="grid aspect-[4/3] place-items-center rounded-card bg-surface-2 text-ink-2">No photos</div>;
  }

  const first = (
    // eslint-disable-next-line @next/next/no-img-element -- photos arrive resized from the browser; skips the Vercel Hobby image quota
    <img src={photos[0]} alt={alt(0)} fetchPriority="high" className="size-full object-cover" />
  );

  return (
    <section aria-label="Photos" aria-roledescription="carousel" onKeyDown={onKey} className="space-y-2">
      <div className="group relative">
        <ul
          ref={track}
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-card [scrollbar-width:none]"
        >
          {photos.map((src, i) => (
            <li
              key={src}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              className="aspect-[4/3] w-full shrink-0 snap-center overflow-hidden bg-surface-2"
            >
              <button
                type="button"
                onClick={() => big.current?.showModal()}
                aria-label={`Open ${alt(i)} full screen`}
                className="size-full cursor-zoom-in"
              >
                {i === 0 ? (
                  <ViewTransition name={listingPhotoName(id)} share="morph" default="none">
                    {first}
                  </ViewTransition>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- see above
                  <img src={src} alt={alt(i)} loading="lazy" decoding="async" className="size-full object-cover" />
                )}
              </button>
            </li>
          ))}
        </ul>

        {count > 1 && (
          <>
            <span
              aria-live="polite"
              className="font-price pointer-events-none absolute right-3 bottom-3 rounded-full bg-ink/75 px-2.5 py-1 text-xs font-semibold text-bg"
            >
              {index + 1} / {count}
            </span>
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              aria-label="Previous photo"
              className={`${arrow} left-3 hidden md:grid md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100`}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={index === count - 1}
              aria-label="Next photo"
              className={`${arrow} right-3 hidden md:grid md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100`}
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        )}
        <span className="pointer-events-none absolute top-3 right-3 hidden rounded-full bg-ink/75 p-2 text-bg md:group-hover:block">
          <Expand className="size-4" aria-hidden />
        </span>
      </div>

      {count > 1 && (
        <ul className="hidden gap-2 overflow-x-auto md:flex" aria-label="Choose a photo">
          {photos.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={`pressable block size-16 overflow-hidden rounded-field ring-2 ${i === index ? "ring-primary" : "ring-transparent opacity-70 hover:opacity-100"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
                <img src={src} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={big}
        aria-label={`Photos of ${title}`}
        onKeyDown={onKey}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
      >
        <div className="relative grid size-full place-items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
          <img src={photos[index]} alt={alt(index)} className="max-h-full max-w-full object-contain" />
          <button
            type="button"
            onClick={() => big.current?.close()}
            aria-label="Close"
            className="pressable absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-white/15 hover:bg-white/25"
          >
            <X className="size-5" aria-hidden />
          </button>
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(index - 1)}
                disabled={index === 0}
                aria-label="Previous photo"
                className="pressable absolute left-3 grid size-12 place-items-center rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-0"
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                disabled={index === count - 1}
                aria-label="Next photo"
                className="pressable absolute right-3 grid size-12 place-items-center rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-0"
              >
                <ChevronRight className="size-6" aria-hidden />
              </button>
              <span className="font-price absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm">
                {index + 1} / {count}
              </span>
            </>
          )}
        </div>
      </dialog>
    </section>
  );
}
