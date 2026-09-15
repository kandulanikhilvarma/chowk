export type PriceType = "fixed" | "negotiable" | "free" | "swap";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** 1234500 paise -> "₹12,345" (Indian digit grouping). */
export function formatPrice(paise: number): string {
  return inr.format(Math.round(paise / 100));
}

/** Card form: "₹85,000", "₹4.5 L", "₹1.23 Cr". Truncates, so a price never reads higher than it is. */
export function formatPriceShort(paise: number): string {
  const rupees = paise / 100;
  const cut = (n: number) => String(n < 10 ? Math.floor(n * 100) / 100 : Math.floor(n * 10) / 10);
  if (rupees >= 1e7) return `₹${cut(rupees / 1e7)} Cr`;
  if (rupees >= 1e5) return `₹${cut(rupees / 1e5)} L`;
  return formatPrice(paise);
}

export function priceLabel(paise: number | null, type: PriceType, short = false): string {
  if (type === "free") return "Free";
  if (type === "swap") return "Swap";
  if (paise == null) return "Ask for price";
  return short ? formatPriceShort(paise) : formatPrice(paise);
}

/** Rounded to 0.5 km with a floor, so the seller's exact spot never shows. */
export function formatDistance(km: number): string {
  if (km < 1) return "< 1 km";
  const rounded = km < 10 ? Math.round(km * 2) / 2 : Math.round(km);
  return `${rounded} km`;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(date: string | Date, now: Date = new Date()): string {
  const seconds = (new Date(date).getTime() - now.getTime()) / 1000;
  const abs = Math.abs(seconds);
  if (abs < 60) return "Just now";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  return rtf.format(Math.round(seconds / (86400 * 30)), "month");
}
