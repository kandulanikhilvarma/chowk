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

const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&h=600&q=70`;
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

// ponytail: static demo cards until Phase 3 reads real listings from Supabase.
const demo: ListingCardData[] = [
  { id: "demo-1", title: "iPhone 13, 128 GB, battery 89%, with bill and box", pricePaise: 3_850_000, priceType: "negotiable", kind: "offer", city: "Hyderabad", locality: "Madhapur", distanceKm: 1.8, createdAt: hoursAgo(2), imageUrl: photo("photo-1585060544812-6b45742d762f"), isDemo: true },
  { id: "demo-2", title: "Royal Enfield Classic 350, 2021, 18,000 km, first owner", pricePaise: 14_500_000, priceType: "fixed", kind: "offer", city: "Bengaluru", locality: "Koramangala", distanceKm: 4.2, createdAt: hoursAgo(5), imageUrl: photo("photo-1622185135505-2d795003994a"), isDemo: true },
  { id: "demo-3", title: "UPSC and NCERT book set, free to a student", pricePaise: null, priceType: "free", kind: "offer", city: "Vijayawada", locality: "Benz Circle", distanceKm: 0.6, createdAt: hoursAgo(8), imageUrl: photo("photo-1524995997946-a1c2e315a42f"), isDemo: true },
  { id: "demo-4", title: "3 seater fabric sofa, 2 years old, no stains", pricePaise: 1_200_000, priceType: "negotiable", kind: "offer", city: "Pune", locality: "Baner", distanceKm: 2.6, createdAt: hoursAgo(26), imageUrl: photo("photo-1560184897-67f4a3f9a7fa"), isDemo: true },
  { id: "demo-5", title: "Looking for an acoustic guitar for a beginner", pricePaise: 500_000, priceType: "negotiable", kind: "wanted", city: "Chennai", locality: "Adyar", distanceKm: 3.1, createdAt: hoursAgo(30), imageUrl: photo("photo-1525201548942-d8732f6617a0"), isDemo: true },
  { id: "demo-6", title: "Ladies cycle, 26 inch, swap for a kids cycle", pricePaise: null, priceType: "swap", kind: "offer", city: "Kolkata", locality: "Salt Lake", distanceKm: 5.4, createdAt: hoursAgo(50), imageUrl: photo("photo-1523740856324-f2ce89135981"), isDemo: true },
];

export default function Home() {
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

      <section aria-labelledby="fresh">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="fresh" className="text-2xl font-bold">
            Fresh near you
          </h2>
          <Link href="/s" className="text-sm font-semibold text-primary hover:underline">
            See all
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {demo.map((listing) => (
            <li key={listing.id}>
              <ListingCard listing={listing} />
            </li>
          ))}
        </ul>
      </section>

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
