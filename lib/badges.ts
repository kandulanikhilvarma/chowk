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
