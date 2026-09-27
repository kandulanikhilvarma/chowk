import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Flag, Handshake, MessageCircle, Package, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin overview", robots: { index: false } };

type Overview = {
  ads_24h: number;
  ads_7d: number;
  active_ads: number;
  members: number;
  members_7d: number;
  chats_7d: number;
  deals: number;
  deals_7d: number;
  open_reports: number;
  top_categories: { name: string; ads: number }[];
};

const num = new Intl.NumberFormat("en-IN");

// The numbers that tell whether Chowk works: ads come in, people chat, and deals close.
// Deals per active ad is the one to watch; ads alone can grow while nobody sells anything.
export default async function AdminPage() {
  const supabase = await createClient();
  const uid = (await supabase.auth.getClaims()).data?.claims.sub;
  if (!uid) redirect("/login?next=/admin");

  const { data: admin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError) throw new Error(`is_admin failed: ${adminError.message}`);
  // A non-admin sees the same page as a missing one.
  if (!admin) notFound();

  const { data, error } = await supabase.rpc("admin_overview");
  if (error) throw new Error(`admin_overview failed: ${error.message}`);
  const o = data as Overview;
  const dealRate = o.active_ads ? ((o.deals_7d / o.active_ads) * 100).toFixed(1) : "0";
  const maxTop = Math.max(1, ...o.top_categories.map((c) => c.ads));

  const tiles = [
    { icon: Package, label: "New ads, 24 hours", value: o.ads_24h, sub: `${num.format(o.ads_7d)} in 7 days` },
    { icon: Package, label: "Ads online now", value: o.active_ads },
    { icon: MessageCircle, label: "New chats, 7 days", value: o.chats_7d },
    { icon: Handshake, label: "Deals done, 7 days", value: o.deals_7d, sub: `${dealRate}% of ads online · ${num.format(o.deals)} all time` },
    { icon: UserPlus, label: "New members, 7 days", value: o.members_7d, sub: `${num.format(o.members)} members` },
    { icon: Flag, label: "Open reports", value: o.open_reports, href: "/admin/reports" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 pt-6 md:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold">Admin overview</h1>
        <Link href="/admin/reports" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Report queue
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map(({ icon: Icon, label, value, sub, href }) => {
          const body = (
            <>
              <p className="flex items-center gap-2 text-sm text-ink-2">
                <Icon className="size-4" aria-hidden />
                {label}
              </p>
              <p className="font-price mt-1 text-3xl font-bold text-ink">{num.format(value)}</p>
              {sub && <p className="mt-0.5 text-xs text-ink-2">{sub}</p>}
            </>
          );
          return (
            <li key={label}>
              {href ? (
                <Link href={href} className="pressable lift block rounded-card bg-surface p-4 ring-1 ring-line">
                  {body}
                </Link>
              ) : (
                <div className="rounded-card bg-surface p-4 ring-1 ring-line">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="top" className="space-y-3 rounded-card bg-surface p-5 ring-1 ring-line">
        <h2 id="top" className="flex items-center gap-2 text-xl font-bold">
          <Users className="size-5 text-primary" aria-hidden />
          Busiest categories, 30 days
        </h2>
        {o.top_categories.length ? (
          <ul className="space-y-2">
            {o.top_categories.map((c) => (
              <li key={c.name} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="truncate">{c.name}</span>
                <span className="h-2 rounded-full bg-surface-2">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${(c.ads / maxTop) * 100}%` }} />
                </span>
                <span className="font-price text-right text-ink-2">{num.format(c.ads)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-2">No ads in the last 30 days.</p>
        )}
      </section>
    </div>
  );
}
