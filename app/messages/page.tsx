import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ImageOff, MessageCircle } from "lucide-react";
import { AdStrip, coverUrl } from "@/components/chat/ad-strip";
import { StartChat } from "@/components/chat/start-chat";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { priceLabel, timeAgo } from "@/lib/format";
import { supabasePublic } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Chats", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { searchParams: Promise<{ listing?: string | string[] }> };

export default async function MessagesPage({ searchParams }: Props) {
  const { listing } = await searchParams;
  const supabase = await createClient();
  const claims = (await supabase.auth.getClaims()).data?.claims;
  const uid = claims?.sub;

  if (typeof listing === "string") {
    if (!UUID.test(listing)) notFound();
    // Chatting needs a signed-in account. Sign-in brings the visitor back to this ad.
    if (!uid || claims.is_anonymous) redirect(`/login?next=${encodeURIComponent(`/messages?listing=${listing}`)}`);
    return <NewChat listingId={listing} uid={uid} />;
  }

  const empty = (
    <EmptyState icon={MessageCircle} title="No chats yet" action={<ButtonLink href="/s">Find something</ButtonLink>}>
      Open an ad and tap Chat with seller. Your chats show up here.
    </EmptyState>
  );
  if (!uid) return empty;

  const { data: rows, error } = await supabase
    .from("conversations")
    .select(
      "id, buyer_id, last_message_at, buyer_last_read_at, seller_last_read_at, listing:listings(title, demo_image_url, images:listing_images(thumb_path, position)), buyer:profiles!conversations_buyer_id_fkey(display_name), seller:profiles!conversations_seller_id_fkey(display_name)",
    )
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`chats read failed: ${error.message}`);
  if (!rows.length) return empty;

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 pt-6 md:pt-10">
      <h1 className="text-3xl font-bold">Chats</h1>
      <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface ring-1 ring-line">
        {rows.map((c) => {
          const buying = c.buyer_id === uid;
          const read = buying ? c.buyer_last_read_at : c.seller_last_read_at;
          const unread = !read || new Date(read) < new Date(c.last_message_at);
          const name = (buying ? c.seller : c.buyer)?.display_name ?? "Chowk member";
          const cover = c.listing ? coverUrl(c.listing) : null;
          return (
            <li key={c.id}>
              <Link href={`/messages/${c.id}`} className="flex items-center gap-3 p-3 hover:bg-surface-2">
                <span className="size-12 shrink-0 overflow-hidden rounded-field bg-surface-2">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element -- photos arrive resized from the browser
                    <img src={cover} alt="" loading="lazy" className="size-full object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-ink-2">
                      <ImageOff className="size-5" aria-hidden />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-ink ${unread ? "font-bold" : "font-medium"}`}>{name}</span>
                    <Badge>{buying ? "Buying" : "Selling"}</Badge>
                  </span>
                  <span className="block truncate text-sm text-ink-2">{c.listing?.title ?? "Ad removed"}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1 text-xs text-ink-2">
                  {timeAgo(c.last_message_at)}
                  {unread && (
                    <span className="size-2.5 rounded-full bg-accent">
                      <span className="sr-only">Unread</span>
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

async function NewChat({ listingId, uid }: { listingId: string; uid: string }) {
  const supabase = await createClient();
  const { data: chat, error: chatError } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", uid)
    .maybeSingle();
  if (chatError) throw new Error(`chat lookup failed: ${chatError.message}`);
  if (chat) redirect(`/messages/${chat.id}`);

  const { data: ad, error } = await supabasePublic
    .from("listings")
    .select(
      "id, title, price_paise, price_type, kind, status, user_id, demo_image_url, images:listing_images(thumb_path, position), seller:profiles!listings_user_id_fkey(display_name)",
    )
    .eq("id", listingId)
    .maybeSingle();
  if (error) throw new Error(`listing ${listingId} failed: ${error.message}`);
  if (!ad) notFound();

  const open = ad.status === "active" || ad.status === "reserved";

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 pt-6 md:pt-10">
      <h1 className="text-2xl font-bold">Message {ad.seller?.display_name ?? "the seller"}</h1>
      <AdStrip id={ad.id} title={ad.title} price={priceLabel(ad.price_paise, ad.price_type)} status={ad.status} imageUrl={coverUrl(ad)} />
      {ad.user_id === uid ? (
        <p className="rounded-card bg-surface p-4 text-ink-2 ring-1 ring-line">This is your ad. People who write to you show up in Chats.</p>
      ) : open ? (
        <StartChat listingId={ad.id} wanted={ad.kind === "wanted"} />
      ) : (
        <p className="rounded-card bg-surface p-4 text-ink-2 ring-1 ring-line">This ad is no longer available.</p>
      )}
    </div>
  );
}
