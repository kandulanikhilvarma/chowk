import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Heart, Settings } from "lucide-react";
import { SignIn, SignOut } from "@/components/auth/sign-in";
import { MyAds, type MyAd } from "@/components/listing/my-ads";
import { buttonClass } from "@/components/ui/button";
import { photoBase } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Chowk", robots: { index: false } };

// Module-level helper, so reading the clock stays out of the component body (react-hooks/purity).
function isExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() < Date.now();
}

export default async function MePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    return (
      <div className="mx-auto max-w-sm space-y-6 px-4 pt-10">
        <h1 className="text-3xl font-bold">My Chowk</h1>
        <p className="text-ink-2">Sign in to see your ads, chats and saved searches.</p>
        <SignIn next="/me" />
      </div>
    );
  }

  const [profile, listings] = await Promise.all([
    supabase.from("profiles").select("display_name, is_guest").eq("id", claims.sub).single(),
    supabase
      .from("listings")
      .select("id, title, status, price_paise, price_type, expires_at, created_at, demo_image_url, images:listing_images(thumb_path, position)")
      .eq("user_id", claims.sub)
      .neq("status", "removed")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (profile.error) throw new Error(`profile read failed: ${profile.error.message}`);
  if (listings.error) throw new Error(`my ads read failed: ${listings.error.message}`);

  const ads: MyAd[] = listings.data.map((l) => {
    const cover = [...l.images].sort((a, b) => a.position - b.position)[0];
    return {
      id: l.id,
      title: l.title,
      status: l.status,
      pricePaise: l.price_paise,
      priceType: l.price_type,
      expired: isExpired(l.expires_at),
      imageUrl: cover ? photoBase + cover.thumb_path : l.demo_image_url,
      createdAt: l.created_at,
    };
  });

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 pt-6 md:pt-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{profile.data.display_name}</h1>
        <Link href={`/u/${claims.sub}`} className={buttonClass({ variant: "secondary" })}>
          Public profile
        </Link>
      </div>

      {profile.data.is_guest && (
        <section className="space-y-3 rounded-card bg-surface p-5 ring-1 ring-line">
          <h2 className="font-display text-xl font-bold">Save your account</h2>
          <p className="text-sm text-ink-2">
            You use a guest account. It stays on this device only. Add Google so you do not lose your ads and chats.
          </p>
          <SignIn next="/me" isGuest />
        </section>
      )}

      <nav aria-label="My lists" className="grid grid-cols-2 gap-3">
        <Link href="/me/saved" className={buttonClass({ variant: "secondary" })}>
          <Heart className="size-5" aria-hidden />
          Watchlist
        </Link>
        <Link href="/me/searches" className={buttonClass({ variant: "secondary" })}>
          <Bell className="size-5" aria-hidden />
          Saved searches
        </Link>
        <Link href="/me/settings" className={buttonClass({ variant: "secondary" })}>
          <Settings className="size-5" aria-hidden />
          Settings
        </Link>
      </nav>

      <section aria-labelledby="my-ads" className="space-y-3">
        <h2 id="my-ads" className="text-xl font-bold">
          My ads
        </h2>
        <MyAds ads={ads} />
      </section>

      {!profile.data.is_guest && <SignOut />}
    </div>
  );
}
