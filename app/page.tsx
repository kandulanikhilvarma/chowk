import Link from "next/link";
import { Suspense } from "react";
import {
  Baby,
  Bike,
  BookOpen,
  Car,
  Gift,
  Home as HomeIcon,
  IndianRupee,
  Laptop,
  type LucideIcon,
  Music,
  PackageOpen,
  PawPrint,
  Search,
  Shirt,
  ShieldCheck,
  Smartphone,
  Sofa,
  Sparkles,
  Star,
  Tag,
  Wrench,
} from "lucide-react";
import { ListingRail } from "@/components/listing/listing-rail";
import { RecentlyViewed } from "@/components/listing/recently-viewed";
import { SearchInput } from "@/components/shell/recent-searches";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListingGridSkeleton, Skeleton } from "@/components/ui/skeleton";
import { getTopCategories, searchListings } from "@/lib/listings";

// ponytail: one minute of staleness keeps the home page cached; add revalidateTag on post when that feels slow.
export const revalidate = 60;

// Labels and order come from the categories table; only the icons live here. A new category shows a tag icon.
const icons: Record<string, LucideIcon> = {
  mobiles: Smartphone,
  vehicles: Car,
  bikes: Bike,
  furniture: Sofa,
  electronics: Laptop,
  property: HomeIcon,
  fashion: Shirt,
  books: BookOpen,
  kids: Baby,
  hobbies: Music,
  pets: PawPrint,
  services: Wrench,
};

const trust = [
  { icon: IndianRupee, title: "Free for everyone", body: "No listing fees. No commission. You keep every rupee." },
  { icon: ShieldCheck, title: "Safety built in", body: "Chowk warns you about common scams before you pay." },
  { icon: Star, title: "Trust you can see", body: "Friendly and reliable badges come only from real deals." },
];

export default async function Home() {
  const categories = await getTopCategories();

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 pt-4 md:pt-8">
      <section className="relative isolate overflow-hidden rounded-card bg-brand-deep px-5 py-8 text-white md:px-10 md:py-16">
        <svg
          aria-hidden
          viewBox="0 0 200 200"
          className="absolute -right-16 -bottom-16 -z-10 size-44 text-white opacity-[0.08] md:-right-6 md:-bottom-6 md:size-80"
        >
          <path d="M85 0h30v200H85zM0 85h200v30H0z" fill="currentColor" />
          <rect x="62" y="62" width="76" height="76" rx="18" className="fill-brand-deep" stroke="currentColor" strokeWidth="14" />
        </svg>
        <h1 className="max-w-2xl text-hero font-extrabold tracking-tight text-balance">Sell it. Find it. Around the corner.</h1>
        <p className="mt-3 max-w-lg text-base text-pretty text-white/85 md:text-lg">
          Chowk is free for everyone. Post an ad in one minute, chat safely, and meet people near you.
        </p>

        <form action="/s" role="search" className="mt-6 max-w-lg md:hidden">
          <label className="relative block">
            <span className="sr-only">Search Chowk</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-field-on-brand-2" />
            <SearchInput
              placeholder="What are you looking for?"
              className="h-12 w-full rounded-full bg-white pr-4 pl-12 text-base text-field-on-brand placeholder:text-field-on-brand-2"
            />
          </label>
        </form>

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/post" variant="accent" size="lg">
            Post an ad
          </ButtonLink>
          <ButtonLink href="/s" variant="ghost" size="lg" className="text-white ring-1 ring-white/40 hover:bg-white/10 hover:ring-white/70">
            Explore near you
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="categories">
        <h2 id="categories" className="mb-4 text-2xl font-bold">
          Browse categories
        </h2>
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {categories.map(({ slug, name }) => {
            const Icon = icons[slug] ?? Tag;
            return (
              <li key={slug}>
                <Link
                  href={`/c/${slug}`}
                  className="group pressable flex flex-col items-center gap-2 rounded-card p-2 text-center hover:bg-surface"
                >
                  <span className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary transition-transform duration-200 ease-(--ease-out) group-hover:bg-primary group-hover:text-on-primary motion-safe:group-hover:-translate-y-0.5">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <span className="text-xs font-medium text-ink">{name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* The hero and the categories are static, so they paint while the ads are still loading. */}
      <Suspense fallback={<RailsFallback />}>
        <Rails />
      </Suspense>

      <RecentlyViewed />

      {/* One surface split by hairlines, not three cards. Nothing here is elevated above
          the rest, so a row of boxes would only add borders. */}
      <section aria-label="Why Chowk" className="overflow-hidden rounded-card bg-surface ring-1 ring-line">
        <ul className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          {trust.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3 p-5">
              <Icon className="size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-sm text-ink-2">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

async function Rails() {
  const [fresh, free] = await Promise.all([
    searchListings({ p_limit: 8 }),
    searchListings({ p_price_type: "free", p_limit: 4 }),
  ]);

  // A new region with no ads yet should ask for the first one, not show a gap.
  if (fresh.length === 0) {
    return (
      <section className="rounded-card bg-surface ring-1 ring-line">
        <EmptyState
          icon={PackageOpen}
          title="Nothing posted yet"
          action={
            <ButtonLink href="/post" variant="accent">
              Post the first ad
            </ButtonLink>
          }
        >
          Chowk is new here. The first ads get the most views.
        </EmptyState>
      </section>
    );
  }

  return (
    <>
      <ListingRail
        id="fresh"
        title="Fresh on Chowk"
        href="/s?sort=newest"
        listings={fresh}
        priority={4}
        icon={<Sparkles className="size-5 text-primary" aria-hidden />}
      />
      {/* A free ad is often in "Fresh" too, and two morph names on one page cancel the transition. */}
      <ListingRail
        id="free"
        title="Free to a good home"
        href="/s?price_type=free"
        listings={free}
        morph={false}
        icon={<Gift className="size-5 text-success" aria-hidden />}
      />
    </>
  );
}

// Same two rails at the same heights, so the trust cards below never jump.
function RailsFallback() {
  return (
    <>
      {[8, 4].map((count) => (
        <section key={count}>
          <div className="mb-4 flex items-end justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>
          <ListingGridSkeleton count={count} />
        </section>
      ))}
    </>
  );
}
