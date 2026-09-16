import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ModerateButtons } from "@/components/safety/moderate-buttons";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format";
import { reportReasons } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Open reports", robots: { index: false } };

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const uid = (await supabase.auth.getClaims()).data?.claims.sub;
  if (!uid) redirect("/login?next=/admin/reports");

  const { data: admin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError) throw new Error(`is_admin failed: ${adminError.message}`);
  // A non-admin sees the same page as a missing one.
  if (!admin) notFound();

  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, reason, details, created_at, listing:listings(id, title, status, report_count), reported:profiles!reports_reported_user_id_fkey(id, display_name), reporter:profiles!reports_reporter_id_fkey(display_name, is_guest)",
    )
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw new Error(`reports read failed: ${error.message}`);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pt-6 md:pt-10">
      <h1 className="text-3xl font-bold">Open reports</h1>
      {data.length === 0 ? (
        <p className="rounded-card bg-surface p-6 text-center text-ink-2 ring-1 ring-line">No open reports.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((r) => (
            <li key={r.id} className="space-y-2 rounded-card bg-surface p-4 ring-1 ring-line">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone="danger">{reportReasons[r.reason]}</Badge>
                {r.listing && r.listing.report_count >= 3 && <Badge tone="accent">Hidden from search</Badge>}
                <span className="text-ink-2">
                  {timeAgo(r.created_at)} by {r.reporter?.display_name ?? "a deleted account"}
                  {r.reporter?.is_guest ? " (guest)" : ""}
                </span>
              </div>
              {r.listing ? (
                <Link href={`/l/${r.listing.id}`} className="block font-semibold text-primary hover:underline">
                  Ad: {r.listing.title}
                </Link>
              ) : (
                r.reported && (
                  <Link href={`/u/${r.reported.id}`} className="block font-semibold text-primary hover:underline">
                    Person: {r.reported.display_name}
                  </Link>
                )
              )}
              {r.details && <p className="text-sm whitespace-pre-line text-ink">{r.details}</p>}
              <ModerateButtons reportId={r.id} hasListing={!!r.listing} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
