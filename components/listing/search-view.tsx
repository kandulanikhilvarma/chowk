import Link from "next/link";
import { SearchX } from "lucide-react";
import { ListingCard } from "@/components/listing/listing-card";
import { buttonClass } from "@/components/ui/button";
import { searchListings } from "@/lib/listings";
import { PAGE_SIZE, toSearchArgs, type RawParams } from "@/lib/search-params";

type Category = { slug: string; name: string };

const field = "h-11 w-full rounded-field border border-line bg-surface px-3 text-[15px] text-ink";

export async function SearchView({
  raw,
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
  const { args, page } = toSearchArgs(raw, category);
  const rows = await searchListings(args);
  const listings = rows.slice(0, PAGE_SIZE);
  const hasNext = rows.length > PAGE_SIZE;
  const value = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string) : "");

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

      <form action={path} role="search" className="grid grid-cols-2 gap-2 md:grid-cols-6">
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
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
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
        <button type="submit" className={buttonClass({ className: "col-span-2 md:col-span-1" })}>
          Show results
        </button>
      </form>

      {listings.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-card bg-surface px-6 py-14 text-center ring-1 ring-line">
          <SearchX className="size-10 text-ink-2" aria-hidden />
          <p className="font-display text-xl font-bold">No ads match this search</p>
          <p className="max-w-sm text-sm text-ink-2">Try fewer words or remove a filter. You can also post a Wanted ad and let sellers find you.</p>
          <Link href="/post" className={buttonClass({ variant: "accent" })}>
            Post a Wanted ad
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {listings.map((listing) => (
            <li key={listing.id}>
              <ListingCard listing={listing} />
            </li>
          ))}
        </ul>
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
