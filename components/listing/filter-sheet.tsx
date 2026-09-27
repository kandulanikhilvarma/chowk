"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";

// The less-used filters live in a bottom sheet so results start on the first screen of a phone.
// The fields stay inside the search <form> in the DOM (a modal dialog only moves them to the top layer),
// so they submit with it. A new URL means the search ran, so the sheet closes.
export function FilterSheet({ count, children, footer }: { count: number; children: ReactNode; footer: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const params = useSearchParams();

  useEffect(() => dialog.current?.close(), [params]);

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
        className="pressable inline-flex h-11 items-center justify-center gap-2 rounded-field border border-line bg-surface px-3 text-[15px] font-medium text-ink hover:bg-surface-2"
      >
        <SlidersHorizontal className="size-4.5" aria-hidden />
        Filters
        {count > 0 && (
          <span className="font-price grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary">
            {count}
          </span>
        )}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="filters-title"
        // A click on the dim area outside the panel lands on the dialog itself.
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="sheet bg-surface p-0 text-ink shadow-lift"
      >
        <div className="flex max-h-[88dvh] flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 id="filters-title" className="text-xl font-bold">
              Filters
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close filters"
              className="pressable grid size-11 place-items-center rounded-full hover:bg-surface-2"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="grid gap-3 overflow-y-auto overscroll-contain p-4 sm:grid-cols-2">{children}</div>
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        </div>
      </dialog>
    </>
  );
}
