"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Handshake,
  Image as ImageIcon,
  ImagePlus,
  IndianRupee,
  Send,
  ShieldAlert,
  Star,
  X,
} from "lucide-react";
import { AdStrip } from "@/components/chat/ad-strip";
import { BlockButton } from "@/components/safety/block-button";
import { ReportButton } from "@/components/safety/report-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { badgeLabel, levelLabel } from "@/lib/badges";
import type { Tables } from "@/lib/database.types";
import { formatPrice } from "@/lib/format";
import { PhotoError, resizeImage } from "@/lib/images";
import { scamWarnings } from "@/lib/scam";
import { createClient } from "@/lib/supabase/browser";

export type ChatMessage = Pick<
  Tables<"messages">,
  "id" | "sender_id" | "kind" | "body" | "offer_paise" | "offer_state" | "image_path" | "created_at"
>;

type Failure = { code?: string; message: string };
type Props = {
  conversationId: string;
  me: string;
  role: "buyer" | "seller";
  other: { id: string; name: string; level: string; friendlyRaters: number; reliableRaters: number; away: string | null };
  listing: { id: string; title: string; price: string; status: string; imageUrl: string | null };
  initialMessages: ChatMessage[];
  deal: { id: string; buyerConfirmed: boolean; sellerConfirmed: boolean } | null;
  met: { buyer: boolean; seller: boolean };
  reviewed: boolean;
  blocked: boolean;
};

const COLUMNS = "id, sender_id, kind, body, offer_paise, offer_state, image_path, created_at";
// Chat photos live in a private bucket; the page reads them through links that expire after an hour.
const PHOTO_LINK_SECONDS = 3600;
const CHAT_PHOTO_PX = 1280;
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
  // Messages already on the page at load stay still; only ones that arrive afterwards animate in.
  const [loadedIds] = useState(() => new Set(initialMessages.map((m) => m.id)));
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastTypingSent = useRef(0);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Signs any photo path on screen that has no link yet, in one call.
  useEffect(() => {
    const missing = messages.flatMap((m) => (m.image_path && !photoUrls[m.image_path] ? [m.image_path] : []));
    if (!missing.length) return;
    let current = true;
    createClient()
      .storage.from("chat-images")
      .createSignedUrls(missing, PHOTO_LINK_SECONDS)
      .then(({ data, error }) => {
        if (error) return console.error("chat photo links failed", error);
        if (!current) return;
        setPhotoUrls((urls) => {
          const next = { ...urls };
          for (const s of data) if (s.path && s.signedUrl) next[s.path] = s.signedUrl;
          return next;
        });
      });
    return () => {
      current = false;
    };
  }, [messages, photoUrls]);

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
        if (m.sender_id !== me) {
          markRead();
          setTyping(false);
        }
        // Deal steps post a system message, so reload the server parts of the page.
        if (m.kind === "system") router.refresh();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: byConversation }, ({ new: row }) => {
        const m = row as ChatMessage;
        // An offer answer can arrive before the catch-up fetch has the offer, so add it if it is missing.
        setMessages((list) =>
          list.some((x) => x.id === m.id) ? list.map((x) => (x.id === m.id ? m : x)) : [...list, m].sort((a, b) => a.id - b.id),
        );
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${conversationId}` }, ({ new: row }) => {
        if (!!row.buyer_met_at !== metRef.current.buyer || !!row.seller_met_at !== metRef.current.seller) router.refresh();
      })
      // Typing and presence carry only a user id, never message text. A typing signal lasts 3 seconds
      // unless another one arrives, so a closed tab never leaves "typing" stuck on.
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.from === me) return;
        setTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 3000);
      })
      .on("presence", { event: "sync" }, () => {
        const people = Object.values(channel.presenceState<{ user: string }>()).flat();
        setOnline(people.some((p) => p.user !== me));
      })
      // Send stays off until the channel is live. Each time it goes live (first join or a reconnect),
      // fetch the chat again: inserts sent while the channel was down never arrive as events.
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
        if (status !== "SUBSCRIBED") return;
        void channel.track({ user: me });
        supabase
          .from("messages")
          .select(COLUMNS)
          .eq("conversation_id", conversationId)
          .order("created_at")
          .limit(500)
          .then(({ data, error }) => {
            if (error) return console.error("chat catch-up failed", error);
            setMessages((list) => {
              const byId = new Map(list.map((m) => [m.id, m]));
              for (const m of data) byId.set(m.id, m);
              return [...byId.values()].sort((a, b) => a.id - b.id);
            });
          });
      });

    channelRef.current = channel;
    markRead();
    return () => {
      clearTimeout(typingTimer.current);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, me, router]);

  // At most one typing signal every 2 seconds while the person types.
  const signalTyping = () => {
    const now = Date.now();
    if (now - lastTypingSent.current < 2000) return;
    lastTypingSent.current = now;
    void channelRef.current?.send({ type: "broadcast", event: "typing", payload: { from: me } });
  };

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

  // Resized in the browser like ad photos, then stored under this chat's folder, which only the two of you can read.
  const sendPhoto = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const { blob } = await resizeImage(file, CHAT_PHOTO_PX);
      const path = `${conversationId}/${crypto.randomUUID()}.${blob.type === "image/webp" ? "webp" : "jpg"}`;
      const supabase = createClient();
      const up = await supabase.storage.from("chat-images").upload(path, blob, { contentType: blob.type });
      if (up.error) {
        console.error("chat photo upload failed", up.error);
        return setError("The photo did not upload. Check your connection and try again.");
      }
      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, kind: "image", body: "Photo", image_path: path })
        .select(COLUMNS)
        .single();
      if (error) return setError(problem(error));
      setMessages((list) => (list.some((x) => x.id === data.id) ? list : [...list, data]));
    } catch (e) {
      setError(e instanceof PhotoError ? e.message : "The photo did not open. Try a different photo.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

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
              {other.away && <Badge tone="warning">{other.away}</Badge>}
              {badges.map((b) => (
                <Badge key={b} tone="success">
                  {b}
                </Badge>
              ))}
            </p>
          </div>
          <span aria-live="polite" className={`flex items-center gap-1.5 text-xs font-medium ${live ? "text-success" : "text-ink-2"}`}>
            {live && <span aria-hidden className={`size-2 rounded-full ${online ? "bg-success" : "bg-line"}`} />}
            {!live ? "Connecting" : typing ? "Typing" : online ? "Online" : "Live"}
          </span>
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
          const enter = loadedIds.has(m.id) ? "" : "msg-in";
          if (m.kind === "system") {
            return (
              <li key={m.id} className={`text-center text-xs font-medium text-ink-2 ${enter}`}>
                {m.body}
              </li>
            );
          }
          const mine = m.sender_id === me;
          const warnings = mine ? [] : scamWarnings(m.body);
          const state = m.offer_state ?? "pending";
          return (
            <li key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"} ${enter}`}>
              <div
                className={`max-w-[85%] rounded-card px-3 py-2 ${mine ? "bg-primary text-on-primary" : "bg-surface text-ink ring-1 ring-line"} ${m.kind === "offer" && state === "accepted" ? "outline-2 outline-offset-2 outline-success" : ""}`}
              >
                {m.kind === "offer" && m.offer_paise != null ? (
                  <>
                    <span className="block text-xs font-semibold">{mine ? "Your offer" : "Offer"}</span>
                    <span className={`font-price block text-2xl font-bold ${state === "declined" ? "line-through opacity-70" : ""}`}>
                      {formatPrice(m.offer_paise)}
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      {state === "accepted" && <Check className="size-3.5" aria-hidden />}
                      {state === "declined" && <X className="size-3.5" aria-hidden />}
                      {offerState[state]}
                    </span>
                  </>
                ) : m.kind === "image" && m.image_path ? (
                  photoUrls[m.image_path] ? (
                    <a href={photoUrls[m.image_path]} target="_blank" rel="noopener noreferrer" className="-mx-1 -my-0.5 block">
                      {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived signed link from a private bucket */}
                      <img
                        src={photoUrls[m.image_path]}
                        alt={mine ? "Photo you sent" : `Photo from ${other.name}`}
                        className="max-h-72 w-auto max-w-full rounded-field object-cover"
                      />
                    </a>
                  ) : (
                    <span className="flex h-40 w-56 max-w-full items-center justify-center gap-2 text-sm opacity-80">
                      <ImageIcon className="size-5" aria-hidden />
                      Photo
                    </span>
                  )
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
        {typing && (
          <li aria-hidden className="msg-in flex items-center gap-1 px-1 text-ink-2">
            <span className="typing-dot size-1.5 rounded-full bg-current" />
            <span className="typing-dot size-1.5 rounded-full bg-current [animation-delay:160ms]" />
            <span className="typing-dot size-1.5 rounded-full bg-current [animation-delay:320ms]" />
            <span className="ml-1 text-xs">{other.name} is typing</span>
          </li>
        )}
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
          {dealDone && <DealDone name={other.name} reviewed={reviewed} />}
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
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void sendPhoto(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={!live || uploading}
              aria-label={uploading ? "Sending photo" : "Send a photo"}
              className="pressable grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink hover:bg-surface-2 disabled:opacity-50"
            >
              <ImagePlus className={`size-5 ${uploading ? "motion-safe:animate-pulse" : ""}`} aria-hidden />
            </button>
            <label className="flex-1">
              <span className="sr-only">Message</span>
              <textarea
                rows={1}
                maxLength={2000}
                value={text}
                placeholder="Write a message"
                onChange={(e) => {
                  setText(e.target.value);
                  signalTyping();
                }}
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

// Both sides confirmed. A check mark draws itself once; reduced motion shows it drawn.
function DealDone({ name, reviewed }: { name: string; reviewed: boolean }) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-field bg-success-soft p-3 text-success">
      <svg viewBox="0 0 24 24" aria-hidden className="draw-check size-8 shrink-0">
        <circle cx="12" cy="12" r="11" className="fill-success" />
        <path d="M7 12.5l3.2 3.2L17 9" fill="none" className="stroke-on-primary" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="font-semibold">
        {reviewed ? `Deal done. Thank you for rating ${name}.` : `Deal done with ${name}. Rate each other below.`}
      </p>
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
