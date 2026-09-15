import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BadgeCheck, CalendarDays, MapPin, MessageCircle, Share2, ShieldAlert, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import type { Json } from "@/lib/database.types";
import { formatPrice, priceLabel, timeAgo } from "@/lib/format";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };
type AttributeField = { key: string; label: string; type: string; unit?: string };
type SellerStats = { deals: number; reliable_raters: number; friendly_raters: number; level: string; member_since: string; reply_rate: number | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const photoBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/`;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chowk-kandula.vercel.app";

const conditionLabel: Record<string, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  for_parts: "For parts",
};

const levelLabel: Record<string, string> = { newcomer: "Newcomer", trusted: "Trusted", regular: "Regular" };

// Metadata and the page need the same row; cache() makes it one query per request.
const getListing = cache(async (id: string) => {
  if (!UUID.test(id)) return null;
  const { data, error } = await supabasePublic
    .from("listings")
    .select(
      "id, title, description, price_paise, price_type, kind, condition, attributes, status, locality, created_at, is_demo, demo_image_url, user_id, category:categories(slug, name, attribute_schema), city:cities(name), images:listing_images(path, thumb_path, position), seller:profiles!listings_user_id_fkey(display_name, is_business)",
    )
    .eq("id", id)
    .maybeSingle();
  // A query error must surface as an error page, never as a silent 404.
  if (error) throw new Error(`listing ${id} failed: ${error.message}`);
  return data;
});

function photos(listing: NonNullable<Awaited<ReturnType<typeof getListing>>>) {
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getListing((await params).id);
  if (!listing) return {};
  const image = photos(listing)[0];
  const description = `${priceLabel(listing.price_paise, listing.price_type)} in ${listing.locality ? `${listing.locality}, ` : ""}${listing.city?.name ?? "India"}. ${listing.description.slice(0, 120)}`;
  return {
    title: listing.title,
    description,
    openGraph: { title: listing.title, description, images: image ? [image] : undefined },
  };
}

export default async function ListingPage({ params }: Props) {
  const listing = await getListing((await params).id);
  if (!listing) notFound();

  const { data: stats } = await supabasePublic.rpc("profile_public_stats", { p_user: listing.user_id });
  const seller = stats as SellerStats | null;
  const gallery = photos(listing);
  const attributes = [
    ...(listing.condition ? [{ label: "Condition", value: conditionLabel[listing.condition] }] : []),
    ...attributeRows(listing.category?.attribute_schema ?? [], listing.attributes),
  ];
  const url = `${siteUrl}/l/${listing.id}`;
  const place = `${listing.locality ? `${listing.locality}, ` : ""}${listing.city?.name ?? ""}`;
  const shareText = encodeURIComponent(`${listing.title}, ${priceLabel(listing.price_paise, listing.price_type)} on Chowk: ${url}`);

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
      availability: listing.status === "sold" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      url,
    },
  }).replace(/</g, "\\u003c");

  return (
    <article className="mx-auto max-w-6xl px-4 pt-4 md:pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink-2">
        <Link href="/s" className="hover:text-ink hover:underline">
          All ads
        </Link>
        {listing.category && (
          <>
            {" / "}
            <Link href={`/c/${listing.category.slug}`} className="hover:text-ink hover:underline">
              {listing.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section aria-label="Photos">
            {gallery.length ? (
              <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-card">
                {gallery.map((src, i) => (
                  <li key={src} className="aspect-[4/3] w-full shrink-0 snap-center overflow-hidden rounded-card bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- photos arrive resized from the browser; skips the Vercel Hobby image quota */}
                    <img
                      src={src}
                      alt={`${listing.title}, photo ${i + 1} of ${gallery.length}`}
                      loading={i === 0 ? "eager" : "lazy"}
                      className="size-full object-cover"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid aspect-[4/3] place-items-center rounded-card bg-surface-2 text-ink-2">No photos</div>
            )}
            {listing.is_demo && (
              <p className="mt-2 text-xs text-ink-2">Demo ad. The photo comes from Unsplash. Nobody sells this item.</p>
            )}
          </section>

          <header className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {listing.kind === "wanted" && <Badge tone="primary">Wanted</Badge>}
              {listing.status === "reserved" && <Badge tone="accent">Reserved</Badge>}
              {listing.status === "sold" && <Badge tone="success">Sold</Badge>}
              {listing.is_demo && <Badge>Demo</Badge>}
            </div>
            <p className="flex items-baseline gap-2">
              <span className={`font-display text-3xl font-extrabold ${listing.price_type === "free" ? "text-success" : "text-ink"}`}>
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

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section aria-labelledby="seller" className="space-y-3 rounded-card bg-surface p-4 ring-1 ring-line">
            <h2 id="seller" className="sr-only">
              Seller
            </h2>
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-primary-soft font-display text-xl font-bold text-primary">
                {(listing.seller?.display_name ?? "C").charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="font-semibold text-ink">{listing.seller?.display_name ?? "Chowk member"}</p>
                <p className="text-sm text-ink-2">
                  {levelLabel[seller?.level ?? "newcomer"]}
                  {listing.seller?.is_business ? " · Business" : " · Private seller"}
                </p>
              </div>
            </div>
            {seller && (
              <ul className="grid grid-cols-3 gap-2 text-center text-sm">
                <li className="rounded-field bg-surface-2 p-2">
                  <span className="block font-display text-lg font-bold">{seller.deals}</span>
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
            )}
            {listing.status !== "sold" && (
              <ButtonLink href={`/messages?listing=${listing.id}`} className="w-full">
                <MessageCircle className="size-5" aria-hidden />
                {listing.kind === "wanted" ? "I have this" : "Chat with seller"}
              </ButtonLink>
            )}
            <ButtonLink
              href={`https://wa.me/?text=${shareText}`}
              variant="secondary"
              className="w-full"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Share2 className="size-5" aria-hidden />
              Share on WhatsApp
            </ButtonLink>
          </section>

          <section aria-labelledby="safety" className="space-y-2 rounded-card bg-danger-soft p-4 text-sm text-ink">
            <h2 id="safety" className="flex items-center gap-2 font-semibold text-danger">
              <ShieldAlert className="size-5" aria-hidden />
              Stay safe
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Meet in a busy public place. Check the item before you pay.</li>
              <li>Never pay an advance or a courier fee.</li>
              <li>You never scan a QR code to receive money.</li>
              <li>Never share an OTP with anyone.</li>
            </ul>
            {listing.price_paise != null && listing.price_paise > 0 && (
              <p className="text-ink-2">Pay {formatPrice(listing.price_paise)} only after you have the item in your hands.</p>
            )}
          </section>
        </aside>
      </div>
    </article>
  );
}
