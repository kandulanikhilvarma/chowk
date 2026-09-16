import { headers } from "next/headers";
import Link from "next/link";
import { MapPin, SearchX } from "lucide-react";
import { ListingCard } from "@/components/listing/listing-card";
import { NearMe } from "@/components/listing/near-me";
import { SaveSearchButton } from "@/components/listing/save-search-button";
import { buttonClass } from "@/components/ui/button";
import { getCities, searchListings } from "@/lib/listings";
import { cityFromHeader, PAGE_SIZE, RADII, toSearchArgs, type RawParams } from "@/lib/search-params";

type Category = { slug: string; name: string };

const field = "h-11 w-full rounded-field border border-line bg-surface px-3 text-[15px] text-ink";

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
  // A plain browse (no query, no filters) starts at the visitor city from Vercel. Any submitted form
  // sends city, even "Anywhere in India" as city="", so a search the person shaped is never changed.
  const guessed =
    Object.keys(urlRaw).length === 0
      ? cityFromHeader((await headers()).get("x-vercel-ip-city"), cities)
      : undefined;
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

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(raw)) if (typeof v === "string" && v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${path}?${qs}` : path;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-4 md:pt-8">
      <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>

      <form action={path} role="search" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {nearBrowser && (
          <>
            <input type="hidden" name="lat" value={value("lat")} />
            <input type="hidden" name="lng" value={value("lng")} />
          </>
        )}
        <label className="col-span-2 md:col-span-2">
          <span className="sr-only">Search</span>
          <input name="q" type="search" defaultValue={value("q")} placeholder="Phones, bikes, sofas, books" className={field} />
        </label>
        {!category && (
          <label>
            <span className="sr-only">Category</span>
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
        <label>
          <span className="sr-only">Price type</span>
          <select name="price_type" defaultValue={value("price_type")} className={field}>
            <option value="">Any price</option>
            <option value="fixed">Fixed price</option>
            <option value="negotiable">Negotiable</option>
            <option value="free">Free</option>
            <option value="swap">Swap</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Ad type</span>
          <select name="kind" defaultValue={value("kind")} className={field}>
            <option value="">Offers and wanted</option>
            <option value="offer">Offers</option>
            <option value="wanted">Wanted</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Sort</span>
          <select name="sort" defaultValue={value("sort")} className={field}>
            <option value="">Best match</option>
            <option value="newest">Newest</option>
            <option value="nearest">Nearest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Posted within</span>
          <select name="days" defaultValue={value("days")} className={field}>
            <option value="">Any time</option>
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Seller</span>
          <select name="seller" defaultValue={value("seller")} className={field}>
            <option value="">All sellers</option>
            <option value="private">Private sellers</option>
            <option value="business">Businesses</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Minimum price in rupees</span>
          <input name="min" type="number" min={0} inputMode="numeric" defaultValue={value("min")} placeholder="Min ₹" className={field} />
        </label>
        <label>
          <span className="sr-only">Maximum price in rupees</span>
          <input name="max" type="number" min={0} inputMode="numeric" defaultValue={value("max")} placeholder="Max ₹" className={field} />
        </label>
        <label className="flex h-11 items-center gap-2 rounded-field border border-line bg-surface px-3 text-[15px] text-ink">
          <input type="checkbox" name="photos" value="1" defaultChecked={value("photos") === "1"} className="size-5 accent-primary" />
          With photos
        </label>
        {/* The span fills the last row: a category page has one select less. */}
        <button type="submit" className={buttonClass({ className: category ? "col-span-2 md:col-span-3" : "col-span-2" })}>
          Show results
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {args.p_radius_km !== undefined ? (
          <p className="flex items-center gap-1 text-sm text-ink-2">
            <MapPin className="size-4" aria-hidden />
            Ads within {args.p_radius_km} km of {city ? city.name : "your location"}
            {guessed && " (from your internet connection)"}
          </p>
        ) : guessEmpty ? (
          <p className="flex items-center gap-1 text-sm text-ink-2">
            <MapPin className="size-4" aria-hidden />
            No ads near {guessed.name} yet. Showing ads from all of India.
          </p>
        ) : (
          <span />
        )}
        <SaveSearchButton
          raw={Object.fromEntries(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string"))}
          category={category}
        />
      </div>

      {listings.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-card bg-surface px-6 py-14 text-center ring-1 ring-line">
          <SearchX className="size-10 text-ink-2" aria-hidden />
          <p className="font-display text-xl font-bold">No ads match this search</p>
          <p className="max-w-sm text-sm text-ink-2">
            Try fewer words, a larger distance or fewer filters. You can also post a Wanted ad and let sellers find you.
          </p>
          <Link href="/post" className={buttonClass({ variant: "accent" })}>
            Post a Wanted ad
          </Link>
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
            <Link href={pageHref(page - 1)} className={buttonClass({ variant: "secondary" })}>
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink-2">Page {page}</span>
          {hasNext ? (
            <Link href={pageHref(page + 1)} className={buttonClass({ variant: "secondary" })}>
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
