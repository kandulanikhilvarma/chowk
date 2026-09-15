import type { SearchArgs } from "@/lib/listings";

export type RawParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 24;
export const PRICE_TYPES = ["fixed", "negotiable", "free", "swap"] as const;
export const KINDS = ["offer", "wanted"] as const;
export const SORTS = ["newest", "price_asc", "price_desc", "relevance"] as const;

function first(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() || undefined;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function rupeesToPaise(value: string | undefined) {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
}

// URL values are untrusted: anything outside the allowed sets is dropped, never passed to the RPC.
// Fetches one extra row so the page knows whether a next page exists.
export function toSearchArgs(raw: RawParams, category?: string): { args: SearchArgs; page: number } {
  const get = (key: string) => first(raw[key]);
  const page = Math.max(1, Math.floor(Number(get("page"))) || 1);
  const q = get("q")?.slice(0, 100);

  return {
    page,
    args: {
      p_q: q,
      p_category: category ?? get("category"),
      p_price_type: oneOf(get("price_type"), PRICE_TYPES),
      p_kind: oneOf(get("kind"), KINDS),
      p_min_paise: rupeesToPaise(get("min")),
      p_max_paise: rupeesToPaise(get("max")),
      p_sort: oneOf(get("sort"), SORTS) ?? (q ? "relevance" : "newest"),
      p_limit: PAGE_SIZE + 1,
      p_offset: (page - 1) * PAGE_SIZE,
    },
  };
}
