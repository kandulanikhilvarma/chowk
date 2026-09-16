"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, BadgeCheck, Handshake, IndianRupee, PartyPopper, Send, ShieldAlert, Star } from "lucide-react";
import { AdStrip } from "@/components/chat/ad-strip";
import { BlockButton } from "@/components/safety/block-button";
import { ReportButton } from "@/components/safety/report-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { badgeLabel, levelLabel } from "@/lib/badges";
import type { Tables } from "@/lib/database.types";
import { formatPrice } from "@/lib/format";
import { scamWarnings } from "@/lib/scam";
import { createClient } from "@/lib/supabase/browser";

export type ChatMessage = Pick<Tables<"messages">, "id" | "sender_id" | "kind" | "body" | "offer_paise" | "offer_state" | "created_at">;

type Failure = { code?: string; message: string };
type Props = {
  conversationId: string;
  me: string;
  role: "buyer" | "seller";
  other: { id: string; name: string; level: string; friendlyRaters: number; reliableRaters: number };
  listing: { id: string; title: string; price: string; status: string; imageUrl: string | null };
  initialMessages: ChatMessage[];
  deal: { id: string; buyerConfirmed: boolean; sellerConfirmed: boolean } | null;
  met: { buyer: boolean; seller: boolean };
  reviewed: boolean;
  blocked: boolean;
};

const COLUMNS = "id, sender_id, kind, body, offer_paise, offer_state, created_at";
const QUICK = {
  buyer: ["Is it still available?", "What is your last price?", "Where can we meet?"],
  seller: ["Yes, it is still available.", "Sorry, it is already sold.", "Can we meet tomorrow?"],
};
const offerState = { pending: "Waiting for an answer", accepted: "Accepted", declined: "Declined" };
// ponytail: India time on the server and in the browser, so hydration text matches. Use the viewer's zone outside India.
const clock = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

function problem(error: Failure) {
  if (error.code === "P0001") return error.message;
  if (error.code === "P0002") return "Not found. Reload the page.";
  if (error.code === "42501") return "You cannot send messages here. The ad is closed, or one of you blocked the other.";
  console.error("chat action failed", error);
  return "That did not work. Try again.";
}

export function ChatRoom({ conversationId, me, role, other, listing, initialMessages, deal, met, reviewed, blocked }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [live, setLive] = useState(false);
  const [text, setText] = useState("");
  const [offer, setOffer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const metRef = useRef(met);
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    metRef.current = met;
  }, [met]);

  useEffect(() => {
    const supabase = createClient();
    const markRead = () =>
      supabase.rpc("mark_read", { p_conversation: conversationId }).then(({ error }) => {
        if (error) console.error("mark_read failed", error);
      });
    const byConversation = `conversation_id=eq.${conversationId}`;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: byConversation }, ({ new: row }) => {
        const m = row as ChatMessage;
        setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
        if (m.sender_id !== me) markRead();
        // Deal steps post a system message, so reload the server parts of the page.
        if (m.kind === "system") router.refresh();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: byConversation }, ({ new: row }) => {
        const m = row as ChatMessage;
        setMessages((list) => list.map((x) => (x.id === m.id ? m : x)));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${conversationId}` }, ({ new: row }) => {
        if (!!row.buyer_met_at !== metRef.current.buyer || !!row.seller_met_at !== metRef.current.seller) router.refresh();
      })
      // Send stays off until the channel is live, so no reply can arrive unseen.
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    markRead();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, me, router]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const run = (action: () => PromiseLike<{ error: Failure | null }>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const { error } = await action();
      if (error) return setError(problem(error));
      after?.();
      router.refresh();
    });

  const send = (body: string, offerPaise: number | null = null) =>
    startTransition(async () => {
      setError(null);
      const { data, error } = await createClient()
        .from("messages")
        .insert({ conversation_id: conversationId, kind: offerPaise ? "offer" : "text", body, offer_paise: offerPaise })
        .select(COLUMNS)
        .single();
      if (error) return setError(problem(error));
      setMessages((list) => (list.some((x) => x.id === data.id) ? list : [...list, data]));
      setText("");
      setOffer(null);
    });

  const sendOffer = () => {
    const rupees = Number(offer);
    if (!Number.isInteger(rupees) || rupees <= 0 || rupees > 1_000_000_000) return setError("Enter the offer in whole rupees.");
    send(`Offer: ${formatPrice(rupees * 100)}`, rupees * 100);
  };

  const answer = (id: number, accept: boolean) =>
    run(
      () => createClient().rpc("respond_offer", { p_message: id, p_accept: accept }),
      () => setMessages((list) => list.map((x) => (x.id === id ? { ...x, offer_state: accept ? "accepted" : "declined" } : x))),
    );

  const open = listing.status === "active" || listing.status === "reserved";
  const badges = [badgeLabel("friendly", other.friendlyRaters), badgeLabel("reliable", other.reliableRaters)].filter(
    (b): b is string => !!b,
  );
  const dealDone = !!deal?.buyerConfirmed && !!deal.sellerConfirmed;
  const iConfirmed = role === "buyer" ? deal?.buyerConfirmed : deal?.sellerConfirmed;
  const iMet = role === "buyer" ? met.buyer : met.seller;

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 pt-3 md:pt-6">
      <header className="space-y-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Link
            href="/messages"
            aria-label="All chats"
            className="pressable grid size-10 shrink-0 place-items-center rounded-full text-ink hover:bg-surface-2"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">
              <Link href={`/u/${other.id}`} className="hover:underline">
                {other.name}
              </Link>
            </h1>
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-2">
              {levelLabel[other.level] ?? "Newcomer"}
              {badges.map((b) => (
                <Badge key={b} tone="success">
                  {b}
                </Badge>
              ))}
            </p>
          </div>
          <span className={`text-xs font-medium ${live ? "text-success" : "text-ink-2"}`}>{live ? "Live" : "Connecting"}</span>
        </div>
        <AdStrip {...listing} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <ReportButton userId={other.id} label={`Report ${other.name}`} />
          <BlockButton userId={other.id} name={other.name} blocked={blocked} />
        </div>
      </header>

      <p className="mt-3 flex gap-2 rounded-field bg-danger-soft px-3 py-2 text-sm text-ink">
        <ShieldAlert className="size-5 shrink-0 text-danger" aria-hidden />
        Meet in a busy public place. Check the item before you pay. Never pay in advance.
      </p>

      <ol aria-label="Messages" aria-live="polite" className="space-y-3 py-4">
        {messages.map((m) => {
          if (m.kind === "system") {
            return (
              <li key={m.id} className="text-center text-xs font-medium text-ink-2">
                {m.body}
              </li>
            );
          }
          const mine = m.sender_id === me;
          const warnings = mine ? [] : scamWarnings(m.body);
          return (
            <li key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] rounded-card px-3 py-2 ${mine ? "bg-primary text-on-primary" : "bg-surface text-ink ring-1 ring-line"}`}>
                {m.kind === "offer" && m.offer_paise != null ? (
                  <>
                    <span className="block text-xs font-semibold">{mine ? "Your offer" : "Offer"}</span>
                    <span className="block font-display text-2xl font-bold">{formatPrice(m.offer_paise)}</span>
                    <span className="block text-xs">{offerState[m.offer_state ?? "pending"]}</span>
                  </>
                ) : (
                  <p className="break-words whitespace-pre-line">{m.body}</p>
                )}
              </div>
              {!mine && m.kind === "offer" && m.offer_state === "pending" && (
                <div className="mt-1.5 flex gap-2">
                  <Chip disabled={pending} onClick={() => answer(m.id, true)}>
                    Accept
                  </Chip>
                  <Chip disabled={pending} onClick={() => answer(m.id, false)}>
                    Decline
                  </Chip>
                </div>
              )}
              {warnings.map((w) => (
                <p key={w.signal} role="note" className="mt-1 flex max-w-[85%] gap-1.5 rounded-field bg-danger-soft px-2 py-1 text-xs text-ink">
                  <ShieldAlert className="size-4 shrink-0 text-danger" aria-hidden />
                  {w.warning}
                </p>
              ))}
              <time dateTime={m.created_at} className="mt-0.5 text-[11px] text-ink-2">
                {clock.format(new Date(m.created_at))}
              </time>
            </li>
          );
        })}
        <li ref={endRef} aria-hidden />
      </ol>

      {(deal || messages.length > 1) && (
        <section aria-label="Deal" className="mb-4 space-y-3 rounded-card bg-surface p-4 ring-1 ring-line">
          {!deal && role === "seller" && open && (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                if (window.confirm(`Mark this ad as sold to ${other.name}? Then you both confirm and rate each other.`)) {
                  run(() => createClient().rpc("mark_sold", { p_listing: listing.id, p_conversation: conversationId }));
                }
              }}
            >
              <Handshake className="size-5" aria-hidden />
              Mark sold to {other.name}
            </Button>
          )}
          {!deal && role === "buyer" && (
            <p className="text-sm text-ink-2">When you agree, the seller marks the ad as sold to you. Then you both confirm and rate each other.</p>
          )}
          {deal &&
            !dealDone &&
            (iConfirmed ? (
              <p className="text-sm text-ink-2">Waiting for {other.name} to confirm the deal.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm">{other.name} marked this item as sold to you. Did you get it?</p>
                <Button disabled={pending} onClick={() => run(() => createClient().rpc("confirm_deal", { p_deal: deal.id }))}>
                  Confirm the deal
                </Button>
              </div>
            ))}
          {deal && dealDone && !reviewed && (
            <ReviewForm
              who={role === "buyer" ? "seller" : "buyer"}
              busy={pending}
              onSend={(friendly, reliable, comment) =>
                run(() =>
                  createClient().rpc("submit_review", {
                    p_deal: deal.id,
                    p_friendly: friendly,
                    p_reliable: reliable,
                    p_comment: comment.trim() || undefined,
                  }),
                )
              }
            />
          )}
          {dealDone && reviewed && (
            <p className="flex items-center gap-2 font-semibold text-success">
              <PartyPopper className="size-5" aria-hidden />
              Deal done. Thank you for rating {other.name}.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm">
            {iMet ? (
              <span className="text-ink-2">You said you met in person.</span>
            ) : (
              <Chip disabled={pending} onClick={() => run(() => createClient().rpc("mark_met", { p_conversation: conversationId }))}>
                We met in person
              </Chip>
            )}
            {!(met.buyer && met.seller) && <span className="text-ink-2">Pay with UPI opens when you both tap this.</span>}
          </div>
          {met.buyer &&
            met.seller &&
            (role === "buyer" ? (
              <UpiHandoff conversationId={conversationId} sellerName={other.name} title={listing.title} />
            ) : (
              <p className="text-sm text-ink-2">
                The buyer can pay you with UPI now.{" "}
                <Link href="/me/settings" className="text-primary underline">
                  Check your UPI ID
                </Link>
                .
              </p>
            ))}
        </section>
      )}

      {error && (
        <p role="alert" className="mb-2 text-sm text-danger">
          {error}
        </p>
      )}

      {open && !blocked ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) send(text.trim());
          }}
          className="sticky bottom-16 space-y-2 border-t border-line bg-bg py-3 md:bottom-0"
        >
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
            {QUICK[role].map((q) => (
              <Chip key={q} onClick={() => setText(q)}>
                {q}
              </Chip>
            ))}
            {role === "buyer" && offer === null && (
              <Chip onClick={() => setOffer("")}>
                <IndianRupee className="size-4" aria-hidden />
                Make an offer
              </Chip>
            )}
          </div>
          {offer !== null && (
            <div className="flex items-end gap-2">
              <label className="flex-1 space-y-1">
                <span className="text-sm font-medium">Offer in rupees</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  className="h-11 w-full rounded-field border border-line bg-surface px-3 text-ink"
                />
              </label>
              <Button disabled={!live || pending} onClick={sendOffer}>
                Send offer
              </Button>
              <Button variant="ghost" onClick={() => setOffer(null)}>
                Cancel
              </Button>
            </div>
          )}
          {scamWarnings(text).map((w) => (
            <p key={w.signal} role="note" className="flex gap-1.5 text-xs text-danger">
              <ShieldAlert className="size-4 shrink-0" aria-hidden />
              {w.warning}
            </p>
          ))}
          <div className="flex items-end gap-2">
            <label className="flex-1">
              <span className="sr-only">Message</span>
              <textarea
                rows={1}
                maxLength={2000}
                value={text}
                placeholder="Write a message"
                onChange={(e) => setText(e.target.value)}
                className="block max-h-32 min-h-11 w-full resize-none rounded-field border border-line bg-surface px-3 py-2.5 text-ink placeholder:text-ink-2"
              />
            </label>
            <Button type="submit" disabled={!live || pending || !text.trim()}>
              <Send className="size-5" aria-hidden />
              Send
            </Button>
          </div>
        </form>
      ) : (
        <p className="border-t border-line py-4 text-center text-sm text-ink-2">
          {blocked ? `You blocked ${other.name}. Unblock them to send messages.` : "This ad is closed. You cannot send new messages."}
        </p>
      )}
    </div>
  );
}

function ReviewForm({ who, busy, onSend }: { who: string; busy: boolean; onSend: (friendly: boolean, reliable: boolean, comment: string) => void }) {
  const [friendly, setFriendly] = useState(true);
  const [reliable, setReliable] = useState(true);
  const [comment, setComment] = useState("");
  return (
    <div className="space-y-3">
      <p className="font-semibold">Rate the {who}</p>
      <div className="flex gap-2">
        <Chip selected={friendly} onClick={() => setFriendly(!friendly)}>
          <Star className="size-4" aria-hidden />
          Friendly
        </Chip>
        <Chip selected={reliable} onClick={() => setReliable(!reliable)}>
          <BadgeCheck className="size-4" aria-hidden />
          Reliable
        </Chip>
      </div>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Comment (optional)</span>
        <textarea
          maxLength={500}
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="block w-full rounded-field border border-line bg-surface px-3 py-2 text-ink"
        />
      </label>
      <Button disabled={busy} onClick={() => onSend(friendly, reliable, comment)}>
        Send rating
      </Button>
    </div>
  );
}

// The database returns the UPI ID only after both people tapped "We met in person".
function UpiHandoff({ conversationId, sellerName, title }: { conversationId: string; sellerName: string; title: string }) {
  const [upi, setUpi] = useState<string | null>();

  useEffect(() => {
    let current = true;
    createClient()
      .rpc("handoff_upi", { p_conversation: conversationId })
      .then(({ data, error }) => {
        if (error) console.error("handoff_upi failed", error);
        if (current) setUpi(data ?? null);
      });
    return () => {
      current = false;
    };
  }, [conversationId]);

  if (upi === undefined) return null;
  if (!upi) return <p className="text-sm text-ink-2">{sellerName} has not added a UPI ID. Pay in cash, or ask them to add one.</p>;

  const href = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(sellerName)}&tn=${encodeURIComponent(title.slice(0, 40))}&cu=INR`;
  return (
    <div className="space-y-2">
      <a href={href} className={buttonClass({ variant: "accent" })}>
        <IndianRupee className="size-5" aria-hidden />
        Pay {sellerName} with UPI
      </a>
      <p className="text-xs text-ink-2">
        Pay only when the item is in your hands. You send money here. You never scan a code or enter a PIN to receive money.
      </p>
    </div>
  );
}
