import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { coverUrl } from "@/components/chat/ad-strip";
import { ChatRoom } from "@/components/chat/chat-room";
import { priceLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Chat", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Stats = { level: string; friendly_raters: number; reliable_raters: number };

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const uid = (await supabase.auth.getClaims()).data?.claims.sub;
  if (!uid) redirect(`/login?next=/messages/${id}`);

  const [conversation, messages, deal] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        "id, listing_id, buyer_id, seller_id, buyer_met_at, seller_met_at, listing:listings(id, title, price_paise, price_type, status, demo_image_url, images:listing_images(thumb_path, position)), buyer:profiles!conversations_buyer_id_fkey(display_name), seller:profiles!conversations_seller_id_fkey(display_name)",
      )
      .eq("id", id)
      .maybeSingle(),
    // ponytail: first 500 messages only; page backwards when chats get that long.
    supabase
      .from("messages")
      .select("id, sender_id, kind, body, offer_paise, offer_state, created_at")
      .eq("conversation_id", id)
      .order("created_at")
      .limit(500),
    supabase.from("deals").select("id, buyer_confirmed_at, seller_confirmed_at, reviews(reviewer_id)").eq("conversation_id", id).maybeSingle(),
  ]);
  if (conversation.error) throw new Error(`chat ${id} failed: ${conversation.error.message}`);
  if (messages.error) throw new Error(`messages ${id} failed: ${messages.error.message}`);
  if (deal.error) throw new Error(`deal ${id} failed: ${deal.error.message}`);

  // RLS hides chats the user is not part of, so they look the same as missing ones.
  const c = conversation.data;
  if (!c) notFound();

  const role = c.buyer_id === uid ? "buyer" : "seller";
  const otherId = role === "buyer" ? c.seller_id : c.buyer_id;
  const { data: stats } = await supabase.rpc("profile_public_stats", { p_user: otherId });
  const s = stats as Stats | null;
  const l = c.listing;

  return (
    <ChatRoom
      conversationId={c.id}
      me={uid}
      role={role}
      other={{
        id: otherId,
        name: (role === "buyer" ? c.seller : c.buyer)?.display_name ?? "Chowk member",
        level: s?.level ?? "newcomer",
        friendlyRaters: s?.friendly_raters ?? 0,
        reliableRaters: s?.reliable_raters ?? 0,
      }}
      listing={
        l
          ? { id: l.id, title: l.title, price: priceLabel(l.price_paise, l.price_type), status: l.status, imageUrl: coverUrl(l) }
          : { id: c.listing_id, title: "Ad removed", price: "", status: "removed", imageUrl: null }
      }
      initialMessages={messages.data}
      deal={
        deal.data
          ? { id: deal.data.id, buyerConfirmed: !!deal.data.buyer_confirmed_at, sellerConfirmed: !!deal.data.seller_confirmed_at }
          : null
      }
      met={{ buyer: !!c.buyer_met_at, seller: !!c.seller_met_at }}
      reviewed={!!deal.data?.reviews.some((r) => r.reviewer_id === uid)}
    />
  );
}
