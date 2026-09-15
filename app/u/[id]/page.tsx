import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BadgeCheck, CalendarDays, Handshake, Star } from "lucide-react";
import { ListingCard, type ListingCardData } from "@/components/listing/listing-card";
import { Badge } from "@/components/ui/badge";
import { photoBase } from "@/lib/listings";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };
type Stats = { deals: number; reliable_raters: number; friendly_raters: number; level: string; member_since: string; reply_rate: number | null; reply_minutes: number | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const levelLabel: Record<string, string> = { newcomer: "Newcomer", trusted: "Trusted", regular: "Regular" };

const getProfile = cache(async (id: string) => {
  if (!UUID.test(id)) return null;
  const { data, error } = await supabasePublic
    .from("profiles")
    .select("id, display_name, is_business, is_guest, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`profile ${id} failed: ${error.message}`);
  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await getProfile((await params).id);
  return profile ? { title: profile.display_name } : {};
}

export default async function ProfilePage({ params }: Props) {
  const profile = await getProfile((await params).id);
  if (!profile) notFound();

  const [{ data: stats }, { data: rows, error }] = await Promise.all([
    supabasePublic.rpc("profile_public_stats", { p_user: profile.id }),
    supabasePublic
      .from("listings")
      .select("id, title, price_paise, price_type, kind, locality, created_at, is_demo, demo_image_url, city:cities(name), images:listing_images(thumb_path, position)")
      .eq("user_id", profile.id)
      .in("status", ["active", "reserved"])
      .gt("expires_at", new Date().toISOString())
      .order("bumped_at", { ascending: false })
      .limit(24),
  ]);
  if (error) throw new Error(`listings for ${profile.id} failed: ${error.message}`);

  const s = stats as Stats | null;
  const listings: ListingCardData[] = (rows ?? []).map((r) => {
    const thumb = [...r.images].sort((a, b) => a.position - b.position)[0]?.thumb_path;
    return {
      id: r.id,
      title: r.title,
      pricePaise: r.price_paise,
      priceType: r.price_type,
      kind: r.kind,
      city: r.city?.name ?? "",
      locality: r.locality,
      createdAt: r.created_at,
      imageUrl: thumb ? photoBase + thumb : r.demo_image_url,
      isDemo: r.is_demo,
    };
  });
  const since = new Date(profile.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 pt-4 md:pt-8">
      <header className="flex flex-wrap items-center gap-4 rounded-card bg-surface p-5 ring-1 ring-line">
        <span className="grid size-16 place-items-center rounded-full bg-primary-soft font-display text-3xl font-bold text-primary">
          {profile.display_name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="truncate text-2xl font-bold">{profile.display_name}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge tone="primary">{levelLabel[s?.level ?? "newcomer"]}</Badge>
            <Badge>{profile.is_business ? "Business" : "Private seller"}</Badge>
            {profile.is_guest && <Badge>Guest account</Badge>}
          </div>
          <p className="flex items-center gap-1 text-sm text-ink-2">
            <CalendarDays className="size-4" aria-hidden />
            Member since {since}
          </p>
        </div>
      </header>

      <section aria-label="Trust" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Handshake} value={s?.deals ?? 0} label="Deals done" />
        <Stat icon={BadgeCheck} value={s?.reliable_raters ?? 0} label="Rated reliable" />
        <Stat icon={Star} value={s?.friendly_raters ?? 0} label="Rated friendly" />
        <div className="rounded-card bg-surface p-4 ring-1 ring-line">
          <p className="font-display text-2xl font-bold">{s?.reply_rate != null ? `${s.reply_rate}%` : "New"}</p>
          <p className="text-sm text-ink-2">
            {s?.reply_minutes != null ? `Replies in about ${s.reply_minutes} min` : "Reply rate shows after 3 chats"}
          </p>
        </div>
      </section>

      <section aria-labelledby="ads">
        <h2 id="ads" className="mb-4 text-2xl font-bold">
          Active ads
        </h2>
        {listings.length ? (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {listings.map((listing) => (
              <li key={listing.id}>
                <ListingCard listing={listing} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-card bg-surface p-6 text-center text-ink-2 ring-1 ring-line">No active ads right now.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Star; value: number; label: string }) {
  return (
    <div className="rounded-card bg-surface p-4 ring-1 ring-line">
      <p className="flex items-center gap-2 font-display text-2xl font-bold">
        <Icon className="size-5 text-success" aria-hidden />
        {value}
      </p>
      <p className="text-sm text-ink-2">{label}</p>
    </div>
  );
}
