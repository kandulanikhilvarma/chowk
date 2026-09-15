// Brand mark: four roads meet at a square, the chowk. Fixed brand colors in both themes.
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="9" fill="#2B3A8C" />
      <rect x="13.5" width="5" height="32" fill="#F4A300" />
      <rect y="13.5" width="32" height="5" fill="#F4A300" />
      <rect x="10" y="10" width="12" height="12" rx="3" fill="#2B3A8C" stroke="#F4A300" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="2.2" fill="#FBF8F3" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-2xl leading-none font-extrabold tracking-tight text-ink">chowk</span>
    </span>
  );
}
