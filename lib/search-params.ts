import type { SearchArgs } from "@/lib/listings";

export type RawParams = Record<string, string | string[] | undefined>;
export type Origin = { lat: number; lng: number };

export const PAGE_SIZE = 24;
export const PRICE_TYPES = ["fixed", "negotiable", "free", "swap"] as const;
export const KINDS = ["offer", "wanted"] as const;
export const SORTS = ["newest", "nearest", "price_asc", "price_desc", "relevance"] as const;
export const RADII = [2, 5, 10, 25, 50, 100] as const;
export const DAYS = [1, 7, 30] as const;
export const SELLERS = ["private", "business"] as const;
const DEFAULT_RADIUS = 25;

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

function coordinate(value: string | undefined, limit: number) {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : undefined;
}

// URL values are untrusted: anything outside the allowed sets is dropped, never passed to the RPC.
// The origin is the chosen city first, then a browser location in lat/lng. Radius applies only with an origin.
// Fetches one extra row so the page knows whether a next page exists.
export function toSearchArgs(
  raw: RawParams,
  category?: string,
  cityOrigin?: Origin,
): { args: SearchArgs; page: number } {
  const get = (key: string) => first(raw[key]);
  const page = Math.max(1, Math.floor(Number(get("page"))) || 1);
  const q = get("q")?.slice(0, 100);

  const lat = coordinate(get("lat"), 90);
  const lng = coordinate(get("lng"), 180);
  const origin = cityOrigin ?? (lat !== undefined && lng !== undefined ? { lat, lng } : undefined);
  const radius = origin ? (RADII.find((r) => r === Number(get("radius"))) ?? DEFAULT_RADIUS) : undefined;

  let sort = oneOf(get("sort"), SORTS) ?? (q ? "relevance" : "newest");
  if (sort === "nearest" && !origin) sort = "newest";

  return {
    page,
    args: {
      p_q: q,
      p_category: category ?? get("category"),
      p_price_type: oneOf(get("price_type"), PRICE_TYPES),
      p_kind: oneOf(get("kind"), KINDS),
      p_min_paise: rupeesToPaise(get("min")),
      p_max_paise: rupeesToPaise(get("max")),
      p_days: DAYS.find((d) => d === Number(get("days"))),
      p_seller: oneOf(get("seller"), SELLERS),
      p_has_photos: get("photos") === "1" || undefined,
      p_lat: origin?.lat,
      p_lng: origin?.lng,
      p_radius_km: radius,
      p_sort: sort,
      p_limit: PAGE_SIZE + 1,
      p_offset: (page - 1) * PAGE_SIZE,
    },
  };
}

// Vercel sends the visitor city URL-encoded (for example "New%20Delhi"). Old names still in common use map to the list names.
const CITY_ALIASES: Record<string, string> = {
  bangalore: "bengaluru",
  bombay: "mumbai",
  "new delhi": "delhi",
  gurgaon: "gurugram",
  calcutta: "kolkata",
  madras: "chennai",
  mysore: "mysuru",
  mangalore: "mangaluru",
  trivandrum: "thiruvananthapuram",
  cochin: "kochi",
  allahabad: "prayagraj",
  pondicherry: "puducherry",
  vizag: "visakhapatnam",
  baroda: "vadodara",
};

export function cityFromHeader<T extends { slug: string; name: string }>(header: string | null, cities: T[]): T | undefined {
  if (!header) return undefined;
  let name: string;
  try {
    name = decodeURIComponent(header).trim().toLowerCase();
  } catch {
    return undefined;
  }
  const wanted = CITY_ALIASES[name] ?? name;
  return cities.find((c) => c.slug === wanted || c.name.toLowerCase() === wanted);
}
