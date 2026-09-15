import Link from "next/link";
import {
  Baby,
  Bike,
  BookOpen,
  Car,
  Home as HomeIcon,
  IndianRupee,
  Laptop,
  Music,
  PawPrint,
  Search,
  Shirt,
  ShieldCheck,
  Smartphone,
  Sofa,
  Star,
  Wrench,
} from "lucide-react";
import { ListingCard, type ListingCardData } from "@/components/listing/listing-card";
import { ButtonLink } from "@/components/ui/button";
import { searchListings } from "@/lib/listings";

// ponytail: one minute of staleness keeps the home page cached; add revalidateTag on post when that feels slow.
export const revalidate = 60;

const categories = [
  { slug: "mobiles", label: "Mobiles", icon: Smartphone },
  { slug: "vehicles", label: "Cars", icon: Car },
  { slug: "bikes", label: "Bikes", icon: Bike },
  { slug: "furniture", label: "Furniture", icon: Sofa },
  { slug: "electronics", label: "Electronics", icon: Laptop },
  { slug: "property", label: "Property", icon: HomeIcon },
  { slug: "fashion", label: "Fashion", icon: Shirt },
  { slug: "books", label: "Books", icon: BookOpen },
  { slug: "kids", label: "Kids", icon: Baby },
  { slug: "hobbies", label: "Hobbies", icon: Music },
  { slug: "pets", label: "Pets", icon: PawPrint },
  { slug: "services", label: "Services", icon: Wrench },
];

const trust = [
  { icon: IndianRupee, title: "Free for everyone", body: "No listing fees. No commission. You keep every rupee." },
  { icon: ShieldCheck, title: "Safety built in", body: "Chowk warns you about common scams before you pay." },
  { icon: Star, title: "Trust you can see", body: "Friendly and reliable badges come only from real deals." },
];

export default async function Home() {
  const [fresh, free] = await Promise.all([
    searchListings({ p_limit: 8 }),
    searchListings({ p_price_type: "free", p_limit: 4 }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 pt-4 md:pt-8">
      <section className="relative isolate overflow-hidden rounded-card bg-[#2B3A8C] px-5 py-8 text-white md:px-10 md:py-14">
        <svg
          aria-hidden
          viewBox="0 0 200 200"
          className="absolute -right-16 -bottom-16 -z-10 size-44 text-white opacity-[0.08] md:-right-6 md:-bottom-6 md:size-80"
        >
          <path d="M85 0h30v200H85zM0 85h200v30H0z" fill="currentColor" />
          <rect x="62" y="62" width="76" height="76" rx="18" fill="#2B3A8C" stroke="currentColor" strokeWidth="14" />
        </svg>
        <h1 className="max-w-xl text-3xl font-extrabold md:text-4xl">Sell it. Find it. Around the corner.</h1>
        <p className="mt-3 max-w-lg text-base text-white/85 md:text-lg">
          Chowk is free for everyone. Post an ad in one minute, chat safely, and meet people near you.
        </p>

        <form action="/s" role="search" className="mt-6 max-w-lg md:hidden">
          <label className="relative block">
            <span className="sr-only">Search Chowk</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#555A6E]" />
            <input
              name="q"
              type="search"
              placeholder="What are you looking for?"
              className="h-12 w-full rounded-full bg-white pr-4 pl-12 text-base text-[#16182B] placeholder:text-[#555A6E]"
            />
          </label>
        </form>

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/post" variant="accent" size="lg">
            Post an ad
          </ButtonLink>
          <ButtonLink href="/s" variant="ghost" size="lg" className="text-white ring-1 ring-white/40 hover:bg-white/10">
            Explore near you
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="categories">
        <h2 id="categories" className="mb-4 text-2xl font-bold">
          Browse categories
        </h2>
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {categories.map(({ slug, label, icon: Icon }) => (
            <li key={slug}>
              <Link
                href={`/c/${slug}`}
                className="pressable flex flex-col items-center gap-2 rounded-card p-2 text-center hover:bg-surface"
              >
                <span className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="text-xs font-medium text-ink">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ListingRail id="fresh" title="Fresh on Chowk" href="/s" listings={fresh} />
      <ListingRail id="free" title="Free to a good home" href="/s?price_type=free" listings={free} />

      <section aria-label="Why Chowk" className="grid gap-3 md:grid-cols-3">
        {trust.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-3 rounded-card bg-surface p-4 ring-1 ring-line">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success-soft text-success">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="font-semibold text-ink">{title}</h3>
              <p className="mt-0.5 text-sm text-ink-2">{body}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function ListingRail({ id, title, href, listings }: { id: string; title: string; href: string; listings: ListingCardData[] }) {
  if (listings.length === 0) return null;
  return (
    <section aria-labelledby={id}>
      <div className="mb-4 flex items-end justify-between">
        <h2 id={id} className="text-2xl font-bold">
          {title}
        </h2>
        <Link href={href} className="text-sm font-semibold text-primary hover:underline">
          See all
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {listings.map((listing) => (
          <li key={listing.id}>
            <ListingCard listing={listing} />
          </li>
        ))}
      </ul>
    </section>
  );
}
