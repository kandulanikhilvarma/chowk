import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Handshake, IndianRupee, MessageCircle, Search, Star, TrendingDown } from "lucide-react";
import { MarkNotificationsRead } from "@/components/shell/mark-notifications-read";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo } from "@/lib/format";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

const icons = {
  message: MessageCircle,
  offer: IndianRupee,
  saved_search: Search,
  price_drop: TrendingDown,
  deal: Handshake,
  review: Star,
  system: Bell,
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const uid = (await supabase.auth.getClaims()).data?.claims.sub;

  if (!uid) {
    return (
      <EmptyState icon={Bell} title="No notifications" action={<ButtonLink href="/login?next=/notifications">Sign in</ButtonLink>}>
        Sign in to get alerts about chats, offers, price drops and saved searches.
      </EmptyState>
    );
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, href, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`notifications read failed: ${error.message}`);

  if (!data.length) {
    return (
      <EmptyState icon={Bell} title="Nothing new" action={<ButtonLink href="/s">Browse ads</ButtonLink>}>
        Save a search or start a chat. Alerts show up here.
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 pt-6 md:pt-10">
      <MarkNotificationsRead />
      <h1 className="text-3xl font-bold">Notifications</h1>
      <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface ring-1 ring-line">
        {data.map((n) => {
          const Icon = icons[n.kind];
          // Triggers write these links. safeNext keeps them on Chowk anyway.
          const href = n.href ? safeNext(n.href, "") : "";
          const row = (
            <>
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-full ${n.read_at ? "bg-surface-2 text-ink-2" : "bg-primary-soft text-primary"}`}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-ink ${n.read_at ? "font-medium" : "font-bold"}`}>{n.title}</span>
                {n.body && <span className="block truncate text-sm text-ink-2">{n.body}</span>}
              </span>
              <span className="shrink-0 text-xs text-ink-2">{timeAgo(n.created_at)}</span>
            </>
          );
          return (
            <li key={n.id}>
              {href ? (
                <Link href={href} className="flex items-center gap-3 p-3 hover:bg-surface-2">
                  {row}
                </Link>
              ) : (
                <div className="flex items-center gap-3 p-3">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
