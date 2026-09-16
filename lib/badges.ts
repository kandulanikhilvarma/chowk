export type BadgeKind = "friendly" | "reliable";

// Levels at 1, 3 and 6 different raters. Guest raters do not count (the database sets reviews.counts).
const TIERS: [min: number, prefix: string][] = [
  [6, "Extra"],
  [3, "Very"],
  [1, ""],
];

export function badgeLabel(kind: BadgeKind, raters: number): string | null {
  const tier = TIERS.find(([min]) => raters >= min);
  if (!tier) return null;
  return tier[1] ? `${tier[1]} ${kind}` : kind.charAt(0).toUpperCase() + kind.slice(1);
}

export const levelLabel: Record<string, string> = { newcomer: "Newcomer", trusted: "Trusted", regular: "Regular" };

// Mirrors active_ad_limit() and bump_listing() in the database. The database enforces them; this only shows them.
export const levelPerks: Record<string, { activeAds: number; bumpDays: number; next?: string }> = {
  newcomer: { activeAds: 20, bumpDays: 7, next: "Finish your first deal to become Trusted and have up to 50 active ads." },
  trusted: { activeAds: 50, bumpDays: 7, next: "Finish 5 deals with 3 reliable ratings to become Regular: 100 active ads, and move ads up every 3 days." },
  regular: { activeAds: 100, bumpDays: 3 },
};
