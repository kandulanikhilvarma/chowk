import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { BadgeCheck, CalendarDays, Clock, MapPin, MessageCircle, ShieldCheck, Star } from "lucide-react";
import { FavoriteButton } from "@/components/listing/favorite-button";
import { Gallery } from "@/components/listing/gallery";
import type { ListingCardData } from "@/components/listing/listing-card";
import { ListingRail } from "@/components/listing/listing-rail";
import { RecordView } from "@/components/listing/recently-viewed";
import { ShareButton } from "@/components/listing/share-button";
import { ReportButton } from "@/components/safety/report-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ListingGridSkeleton } from "@/components/ui/skeleton";
import { badgeLabel, levelLabel } from "@/lib/badges";
import type { Json } from "@/lib/database.types";
import { awayLabel, formatPrice, priceLabel, timeAgo } from "@/lib/format";
import { getCities, photoBase, searchListings, sellerListings, thumbUrl } from "@/lib/listings";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };
type AttributeField = { key: string; label: string; type: string; unit?: string };
type SellerStats = {
  deals: number;
  reliable_raters: number;
  friendly_raters: number;
  level: string;
  member_since: string;
  reply_rate: number | null;
  reply_minutes: number | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chowk-kandula.vercel.app";

const conditionLabel: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  for_parts: "For parts",
};

// Metadata and the page need the same row; cache() makes it one query per request.
const getListing = cache(async (id: string) => {
  if (!UUID.test(id)) return null;
  const { data, error } = await supabasePublic
    .from("listings")
    .select(
      "id, title, description, price_paise, price_type, kind, condition, attributes, status, locality, created_at, demo_image_url, user_id, category:categories(slug, name, attribute_schema), city:cities(name, slug), images:listing_images(path, thumb_path, position), seller:profiles!listings_user_id_fkey(display_name, is_business, avatar_url, away_until)",
    )
    .eq("id", id)
    .maybeSingle();
  // A query error must surface as an error page, never as a silent 404.
  if (error) throw new Error(`listing ${id} failed: ${error.message}`);
  return data;
});

type Listing = NonNullable<Awaited<ReturnType<typeof getListing>>>;

function photos(listing: Listing) {
  const uploaded = [...listing.images].sort((a, b) => a.position - b.position).map((i) => photoBase + i.path);
  return uploaded.length ? uploaded : listing.demo_image_url ? [listing.demo_image_url] : [];
}

function attributeRows(schema: Json, values: Json) {
  if (!Array.isArray(schema) || !values || typeof values !== "object" || Array.isArray(values)) return [];
  return (schema as AttributeField[]).flatMap((field) => {
    const v = (values as Record<string, Json>)[field.key];
    if (v === undefined || v === null || v === "") return [];
    const shown = typeof v === "boolean" ? (v ? "Yes" : "No") : `${v}${field.unit ? ` ${field.unit}` : ""}`;
    return [{ label: field.label, value: shown }];
  });
}

function monthYear(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getListing((await params).id);
  if (!listing) return {};
  const description = `${priceLabel(listing.price_paise, listing.price_type)} in ${listing.locality ? `${listing.locality}, ` : ""}${listing.city?.name ?? "India"}. ${listing.description.slice(0, 120)}`;
  return {
    title: listing.title,
    description,
    // opengraph-image.tsx in this folder makes the share picture.
    openGraph: { title: listing.title, description },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ListingPage({ params }: Props) {
  const listing = await getListing((await params).id);
  if (!listing) notFound();

  const { data: stats } = await supabasePublic.rpc("profile_public_stats", { p_user: listing.user_id });
  const seller = stats as SellerStats | null;
  const sellerName = listing.seller?.display_name ?? "Chowk member";
  const away = awayLabel(listing.seller?.away_until);
  const badges = seller
    ? [badgeLabel("friendly", seller.friendly_raters), badgeLabel("reliable", seller.reliable_raters)].filter((b): b is string => !!b)
    : [];
  const gallery = photos(listing);
  const attributes = [
    ...(listing.condition ? [{ label: "Condition", value: conditionLabel[listing.condition] }] : []),
    ...attributeRows(listing.category?.attribute_schema ?? [], listing.attributes),
  ];
  const url = `${siteUrl}/l/${listing.id}`;
  const place = `${listing.locality ? `${listing.locality}, ` : ""}${listing.city?.name ?? ""}`;
  const sold = listing.status === "sold";

  // What this device remembers for "Recently viewed". Card fields only.
  const card: ListingCardData = {
    id: listing.id,
    title: listing.title,
    pricePaise: listing.price_paise,
    priceType: listing.price_type,
    kind: listing.kind,
    city: listing.city?.name ?? "",
    locality: listing.locality,
    createdAt: listing.created_at,
    imageUrl: thumbUrl(listing.images) ?? listing.demo_image_url?.replace("w=800&h=600", "w=480&h=360"),
  };

  // "<" is escaped so a title cannot close the script tag.
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description,
    image: gallery,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: listing.price_paise != null ? listing.price_paise / 100 : 0,
      availability: sold ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      url,
    },
  }).replace(/</g, "\\u003c");

  return (
    <article className="mx-auto max-w-6xl space-y-10 px-4 pt-4 md:pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <RecordView listing={card} />

      <div>
        <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink-2">
          <Link href="/s" className="underline-offset-4 hover:text-ink hover:underline">
            All ads
          </Link>
          {listing.category && (
            <>
              {" / "}
              <Link href={`/c/${listing.category.slug}`} className="underline-offset-4 hover:text-ink hover:underline">
                {listing.category.name}
              </Link>
            </>
          )}
        </nav>

        {sold && (
          <p role="status" className="mb-4 flex flex-wrap items-center gap-x-2 rounded-card bg-success-soft px-4 py-3 text-sm text-ink">
            <BadgeCheck className="size-5 text-success" aria-hidden />
            This ad is sold.
            <a href="#similar" className="font-semibold text-primary underline-offset-4 hover:underline">
              See similar ads nearby
            </a>
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <Gallery id={listing.id} title={listing.title} photos={gallery} />

            <header className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {listing.kind === "wanted" && <Badge tone="primary">Wanted</Badge>}
                {listing.status === "reserved" && <Badge tone="warning">Reserved</Badge>}
                {sold && <Badge tone="success">Sold</Badge>}
              </div>
              <p className="flex items-baseline gap-2">
                <span className={`font-price text-3xl font-extrabold ${listing.price_type === "free" ? "text-success" : "text-ink"}`}>
                  {priceLabel(listing.price_paise, listing.price_type)}
                </span>
                {listing.price_type === "negotiable" && <span className="text-sm text-ink-2">Negotiable</span>}
              </p>
              <h1 className="text-2xl font-bold md:text-3xl">{listing.title}</h1>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" aria-hidden />
                  {place}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-4" aria-hidden />
                  Posted {timeAgo(listing.created_at)}
                </span>
              </p>
            </header>

            {attributes.length > 0 && (
              <section aria-labelledby="details">
                <h2 id="details" className="mb-3 text-xl font-bold">
                  Details
                </h2>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-card bg-surface p-4 ring-1 ring-line sm:grid-cols-3">
                  {attributes.map((a) => (
                    <div key={a.label}>
                      <dt className="text-xs text-ink-2">{a.label}</dt>
                      <dd className="font-medium text-ink capitalize">{a.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {listing.description && (
              <section aria-labelledby="description">
                <h2 id="description" className="mb-3 text-xl font-bold">
                  Description
                </h2>
                <p className="whitespace-pre-line text-ink">{listing.description}</p>
              </section>
            )}
          </div>

          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <section aria-labelledby="seller" className="space-y-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-line">
              <h2 id="seller" className="sr-only">
                Seller
              </h2>
              <div className="flex items-center gap-3">
                <Avatar name={sellerName} src={listing.seller?.avatar_url} />
                <div className="min-w-0">
                  <Link href={`/u/${listing.user_id}`} className="font-semibold text-ink underline-offset-4 hover:underline">
                    {sellerName}
                  </Link>
                  <p className="text-sm text-ink-2">
                    {levelLabel[seller?.level ?? "newcomer"]}
                    {listing.seller?.is_business ? " · Business" : " · Private seller"}
                  </p>
                </div>
              </div>
              {(badges.length > 0 || away) && (
                <div className="flex flex-wrap gap-1.5">
                  {away && <Badge tone="warning">{away}</Badge>}
                  {badges.map((b) => (
                    <Badge key={b} tone="success">
                      {b}
                    </Badge>
                  ))}
                </div>
              )}
              {seller && (
                <>
                  <ul className="grid grid-cols-3 gap-2 text-center text-sm">
                    <li className="rounded-field bg-surface-2 p-2">
                      <span className="font-price block text-lg font-bold">{seller.deals}</span>
                      <span className="text-xs text-ink-2">Deals</span>
                    </li>
                    <li className="rounded-field bg-surface-2 p-2">
                      <BadgeCheck className="mx-auto size-5 text-success" aria-hidden />
                      <span className="text-xs text-ink-2">{seller.reliable_raters} reliable</span>
                    </li>
                    <li className="rounded-field bg-surface-2 p-2">
                      <Star className="mx-auto size-5 text-accent" aria-hidden />
                      <span className="text-xs text-ink-2">{seller.friendly_raters} friendly</span>
                    </li>
                  </ul>
                  <ul className="space-y-1.5 text-sm text-ink-2">
                    <li className="flex items-center gap-2">
                      <Clock className="size-4 shrink-0" aria-hidden />
                      {seller.reply_rate != null
                        ? `Replies to ${seller.reply_rate}% of chats${seller.reply_minutes != null ? `, usually in about ${seller.reply_minutes} min` : ""}`
                        : "Reply rate shows after 3 chats"}
                    </li>
                    <li className="flex items-center gap-2">
                      <CalendarDays className="size-4 shrink-0" aria-hidden />
                      On Chowk since {monthYear(seller.member_since)}
                    </li>
                  </ul>
                </>
              )}
              {!sold && (
                <ButtonLink href={`/messages?listing=${listing.id}`} className="w-full">
                  <MessageCircle className="size-5" aria-hidden />
                  {listing.kind === "wanted" ? "I have this" : "Chat with seller"}
                </ButtonLink>
              )}
              <ShareButton
                title={listing.title}
                text={`${listing.title}, ${priceLabel(listing.price_paise, listing.price_type)} on Chowk`}
                url={url}
              />
              {!sold && <FavoriteButton listingId={listing.id} />}
            </section>

            {/* Neutral on purpose. A red box on every ad trains people to skip it; red is kept for live scam warnings in chat. */}
            <section aria-labelledby="safety" className="space-y-2 rounded-card bg-surface p-4 text-sm text-ink ring-1 ring-line">
              <h2 id="safety" className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="size-5 text-primary" aria-hidden />
                Stay safe
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-ink-2 marker:text-primary">
                <li>Meet in a busy public place. Check the item before you pay.</li>
                <li>Never pay an advance or a courier fee.</li>
                <li>You never scan a QR code to receive money.</li>
                <li>Never share an OTP with anyone.</li>
                {listing.category?.slug === "mobiles" && (
                  <li>
                    Check the IMEI number on{" "}
                    <a href="https://sancharsaathi.gov.in" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
                      Sanchar Saathi
                    </a>{" "}
                    to see if the phone is reported stolen.
                  </li>
                )}
                {(listing.category?.slug === "vehicles" || listing.category?.slug === "bikes") && (
                  <li>
                    Compare the RC with the ID of the seller, and check it on{" "}
                    <a href="https://parivahan.gov.in" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
                      Parivahan
                    </a>
                    .
                  </li>
                )}
              </ul>
              {listing.price_paise != null && listing.price_paise > 0 && (
                <p className="font-medium text-ink">Pay {formatPrice(listing.price_paise)} only after you have the item in your hands.</p>
              )}
            </section>

            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <ReportButton listingId={listing.id} />
              <Link href="/safety" className="text-sm text-primary underline-offset-4 hover:underline">
                More safety tips
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={<ListingGridSkeleton count={4} label="Loading similar ads" />}>
        <MoreAds listing={listing} sellerName={sellerName} />
      </Suspense>
    </article>
  );
}

// Keeps a sold or not-quite-right ad from being a dead end. Similar ads come from the same category,
// nearest to the ad's city first with no radius cap, so a thin area still shows something (each card
// shows its distance). The seller rail skips any ad already shown as similar, so no card repeats.
async function MoreAds({ listing, sellerName }: { listing: Listing; sellerName: string }) {
  const city = (await getCities()).find((c) => c.slug === listing.city?.slug);
  const [nearby, sellerAds] = await Promise.all([
    listing.category
      ? searchListings({
          p_category: listing.category.slug,
          p_lat: city?.lat,
          p_lng: city?.lng,
          p_sort: city ? "nearest" : "newest",
          p_limit: 10,
        })
      : [],
    sellerListings(listing.user_id, { excludeId: listing.id, limit: 8 }),
  ]);
  const similar = nearby.filter((l) => l.id !== listing.id).slice(0, 4);
  const shown = new Set(similar.map((l) => l.id));
  const fromSeller = sellerAds.filter((l) => !shown.has(l.id)).slice(0, 4);

  return (
    <div id="similar" className="scroll-mt-20 space-y-10">
      <ListingRail
        id="similar-ads"
        title={city ? `Similar ads, nearest to ${city.name}` : "Similar ads"}
        href={listing.category ? `/c/${listing.category.slug}${city ? `?city=${city.slug}` : ""}` : "/s"}
        listings={similar}
      />
      <ListingRail id="seller-ads" title={`More from ${sellerName}`} href={`/u/${listing.user_id}`} listings={fromSeller} />
    </div>
  );
}
