import Form from "next/form";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { LayoutGrid, Map as MapIcon, MapPin, Search, SearchX, X } from "lucide-react";
import { FilterSheet } from "@/components/listing/filter-sheet";
import { ResultsMap } from "@/components/listing/results-map";
import { ListingCard } from "@/components/listing/listing-card";
import { NearMe } from "@/components/listing/near-me";
import { SaveSearchButton } from "@/components/listing/save-search-button";
import { RecordSearch, RememberCity, SearchInput } from "@/components/shell/recent-searches";
import { buttonClass } from "@/components/ui/button";
import { getCities, searchListings } from "@/lib/listings";
import { cityFromHeader, PAGE_SIZE, RADII, toSearchArgs, type RawParams } from "@/lib/search-params";

type Category = { slug: string; name: string };

const field = "h-11 w-full rounded-field border border-line bg-surface px-3 text-[15px] text-ink";
const rupees = new Intl.NumberFormat("en-IN");

// Filters that sit in the sheet. Each one names itself for its removable chip; a value outside the
// allowed set gets no label, so it neither counts nor shows (toSearchArgs drops it as well).
const sheetFilters: Record<string, (value: string, categories: Category[]) => string | undefined> = {
  category: (v, cats) => cats.find((c) => c.slug === v)?.name,
  price_type: (v) => ({ fixed: "Fixed price", negotiable: "Negotiable", free: "Free", swap: "Swap" })[v],
  kind: (v) => ({ offer: "Offers only", wanted: "Wanted only" })[v],
  sort: (v) =>
    ({ newest: "Newest first", nearest: "Nearest first", price_asc: "Price: low to high", price_desc: "Price: high to low" })[v],
  days: (v) => ({ "1": "Last 24 hours", "7": "Last 7 days", "30": "Last 30 days" })[v],
  seller: (v) => ({ private: "Private sellers", business: "Businesses" })[v],
  min: (v) => (Number(v) >= 0 && v !== "" ? `From ₹${rupees.format(Number(v))}` : undefined),
  max: (v) => (Number(v) >= 0 && v !== "" ? `Up to ₹${rupees.format(Number(v))}` : undefined),
  photos: (v) => (v === "1" ? "With photos" : undefined),
};

export async function SearchView({
  raw: urlRaw,
  path,
  title,
  category,
  categories,
}: {
  raw: RawParams;
  path: string;
  title: string;
  category?: string;
  categories: Category[];
}) {
  const cities = await getCities();
  // A plain browse (no query, no filters) starts at the city this device last searched in, else the
  // visitor city from Vercel. Any submitted form sends city, even "Anywhere in India" as city="",
  // so a search the person shaped is never changed.
  const plain = Object.keys(urlRaw).length === 0;
  const remembered = plain ? (await cookies()).get("chowk_city")?.value : undefined;
  const rememberedCity = cities.find((c) => c.slug === remembered);
  const fromIp = plain && !rememberedCity && remembered !== "any";
  const guessed = rememberedCity ?? (fromIp ? cityFromHeader((await headers()).get("x-vercel-ip-city"), cities) : undefined);
  let raw = guessed ? { ...urlRaw, city: guessed.slug } : urlRaw;
  const value = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : "");
  let city = cities.find((c) => c.slug === value("city"));
  let { args, page } = toSearchArgs(raw, category, city && { lat: city.lat, lng: city.lng });
  let rows = await searchListings(args);
  // An empty guessed city is a bad first look. Show all of India and say so.
  const guessEmpty = guessed && rows.length === 0 && page === 1;
  if (guessEmpty) {
    raw = urlRaw;
    city = undefined;
    ({ args, page } = toSearchArgs(raw, category));
    rows = await searchListings(args);
  }
  const listings = rows.slice(0, PAGE_SIZE);
  const hasNext = rows.length > PAGE_SIZE;
  const nearBrowser = !city && args.p_lat !== undefined;
  const first = (page - 1) * PAGE_SIZE + 1;

  const hrefWith = (drop: string[], p = 1) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(raw)) if (typeof v === "string" && v && k !== "page" && !drop.includes(k)) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${path}?${qs}` : path;
  };

  const mapView = value("view") === "map";
  const viewHref = (map: boolean) => {
    const base = hrefWith(["view"]);
    return map ? `${base}${base.includes("?") ? "&" : "?"}view=map` : base;
  };

  const active = Object.entries(sheetFilters).flatMap(([key, label]) => {
    const text = value(key) ? label(value(key), categories) : undefined;
    return text && !(key === "category" && category) ? [{ key, text }] : [];
  });
  const clearAll = hrefWith(Object.keys(sheetFilters));

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 pt-4 md:pt-8">
      <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>

      <Form
        action={path}
        role="search"
        className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,1fr)_11rem_9.5rem_auto_auto_auto]"
      >
        {nearBrowser && (
          <>
            <input type="hidden" name="lat" value={value("lat")} />
            <input type="hidden" name="lng" value={value("lng")} />
          </>
        )}
        {mapView && <input type="hidden" name="view" value="map" />}
        <label className="col-span-2 md:col-span-1">
          <span className="sr-only">Search</span>
          <SearchInput defaultValue={value("q")} placeholder="Phones, bikes, sofas, books" className={field} />
        </label>
        <RecordSearch q={value("q")} />
        {typeof urlRaw.city === "string" && <RememberCity slug={urlRaw.city} />}
        <label>
          <span className="sr-only">City</span>
          <select name="city" defaultValue={city?.slug ?? ""} className={field}>
            <option value="">{nearBrowser ? "Near my location" : "Anywhere in India"}</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Distance</span>
          <select name="radius" defaultValue={String(args.p_radius_km ?? 25)} className={field}>
            {RADII.map((r) => (
              <option key={r} value={r}>
                Within {r} km
              </option>
            ))}
          </select>
        </label>
        <NearMe />
        <FilterSheet
          count={active.length}
          footer={
            <>
              <Link href={clearAll} className="text-sm font-semibold text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                Clear filters
              </Link>
              <button type="submit" className={buttonClass()}>
                Show results
              </button>
            </>
          }
        >
          {!category && (
            <label className="space-y-1">
              <span className="text-sm font-medium">Category</span>
              <select name="category" defaultValue={value("category")} className={field}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="space-y-1">
            <span className="text-sm font-medium">Sort</span>
            <select name="sort" defaultValue={value("sort")} className={field}>
              <option value="">Best match</option>
              <option value="newest">Newest first</option>
              <option value="nearest">Nearest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Price type</span>
            <select name="price_type" defaultValue={value("price_type")} className={field}>
              <option value="">Any price</option>
              <option value="fixed">Fixed price</option>
              <option value="negotiable">Negotiable</option>
              <option value="free">Free</option>
              <option value="swap">Swap</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Ad type</span>
            <select name="kind" defaultValue={value("kind")} className={field}>
              <option value="">Offers and wanted</option>
              <option value="offer">Offers</option>
              <option value="wanted">Wanted</option>
            </select>
          </label>
          <fieldset className="grid grid-cols-2 gap-2 sm:col-span-2">
            <legend className="mb-1 text-sm font-medium">Price in rupees</legend>
            <label>
              <span className="sr-only">Minimum price in rupees</span>
              <input name="min" type="number" min={0} inputMode="numeric" defaultValue={value("min")} placeholder="Min ₹" className={field} />
            </label>
            <label>
              <span className="sr-only">Maximum price in rupees</span>
              <input name="max" type="number" min={0} inputMode="numeric" defaultValue={value("max")} placeholder="Max ₹" className={field} />
            </label>
          </fieldset>
          <label className="space-y-1">
            <span className="text-sm font-medium">Posted within</span>
            <select name="days" defaultValue={value("days")} className={field}>
              <option value="">Any time</option>
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Seller</span>
            <select name="seller" defaultValue={value("seller")} className={field}>
              <option value="">All sellers</option>
              <option value="private">Private sellers</option>
              <option value="business">Businesses</option>
            </select>
          </label>
          <label className="flex h-11 items-center gap-2 self-end rounded-field border border-line bg-surface px-3 text-[15px] text-ink sm:col-span-2">
            <input type="checkbox" name="photos" value="1" defaultChecked={value("photos") === "1"} className="size-5 accent-primary" />
            Only ads with photos
          </label>
        </FilterSheet>
        <button type="submit" className={buttonClass({ className: "col-span-2 md:col-span-1" })}>
          <Search className="size-4.5" aria-hidden />
          Search
        </button>
      </Form>

      {active.length > 0 && (
        <ul aria-label="Active filters" className="flex flex-wrap items-center gap-2">
          {active.map(({ key, text }) => (
            <li key={key}>
              <Link
                href={hrefWith([key])}
                aria-label={`Remove filter: ${text}`}
                className="pressable inline-flex h-9 items-center gap-1.5 rounded-full bg-primary-soft pr-2.5 pl-3.5 text-sm font-medium text-primary hover:bg-primary hover:text-on-primary"
              >
                {text}
                <X className="size-4" aria-hidden />
              </Link>
            </li>
          ))}
          {active.length > 1 && (
            <li>
              <Link href={clearAll} className="px-2 text-sm font-semibold text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                Clear all
              </Link>
            </li>
          )}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-x-1 text-sm text-ink-2">
          <MapPin className="size-4" aria-hidden />
          {args.p_radius_km !== undefined ? (
            <>
              Within {args.p_radius_km} km of {city ? city.name : "your location"}
              {guessed && (rememberedCity ? " (your last search)" : " (from your internet connection)")}
            </>
          ) : guessEmpty ? (
            <>No ads near {guessed.name} yet. Showing ads from all of India.</>
          ) : (
            <>All of India</>
          )}
          {listings.length > 0 && (
            <span className="font-price">
              {" · "}Ads {first} to {first + listings.length - 1}
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Show results as" className="inline-flex rounded-full bg-surface-2 p-1 text-sm font-medium">
            {[
              { map: false, label: "List", Icon: LayoutGrid },
              { map: true, label: "Map", Icon: MapIcon },
            ].map(({ map, label, Icon }) => (
              <Link
                key={label}
                href={viewHref(map)}
                aria-current={map === mapView ? "page" : undefined}
                className={`pressable inline-flex h-8 items-center gap-1.5 rounded-full px-3 ${map === mapView ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:text-ink"}`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
          <SaveSearchButton
            raw={Object.fromEntries(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string" && e[0] !== "view"))}
            category={category}
          />
        </div>
      </div>

      {mapView && listings.length > 0 && <ResultsMap listings={listings} />}

      {listings.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-card bg-surface px-6 py-14 text-center ring-1 ring-line">
          <SearchX className="size-10 text-ink-2" aria-hidden />
          <p className="font-display text-xl font-bold">No ads match this search</p>
          <p className="max-w-sm text-sm text-ink-2">
            Try fewer words, a larger distance or fewer filters. You can also post a Wanted ad and let sellers find you.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {active.length > 0 && (
              <Link href={clearAll} className={buttonClass({ variant: "secondary" })}>
                Clear filters
              </Link>
            )}
            <Link href="/post" className={buttonClass({ variant: "accent" })}>
              Post a Wanted ad
            </Link>
          </div>
        </div>
      ) : (
        <>
          <h2 className="sr-only">Ads</h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {listings.map((listing, i) => (
              <li key={listing.id}>
                <ListingCard listing={listing} priority={i < 4} />
              </li>
            ))}
          </ul>
        </>
      )}

      {(page > 1 || hasNext) && (
        <nav aria-label="Pages" className="flex items-center justify-between">
          {page > 1 ? (
            <Link href={hrefWith([], page - 1)} className={buttonClass({ variant: "secondary" })}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="font-price text-sm text-ink-2">Page {page}</span>
          {hasNext ? (
            <Link href={hrefWith([], page + 1)} className={buttonClass({ variant: "secondary" })}>
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
