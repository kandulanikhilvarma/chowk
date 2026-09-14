import type { ComponentProps } from "react";

// Filter pill. aria-pressed tells screen readers the on or off state.
export function Chip({ selected = false, className = "", ...props }: { selected?: boolean } & ComponentProps<"button">) {
  const tone = selected
    ? "border-transparent bg-primary-soft text-primary"
    : "border-line bg-surface text-ink hover:bg-surface-2";
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`pressable inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium ${tone} ${className}`}
      {...props}
    />
  );
}
