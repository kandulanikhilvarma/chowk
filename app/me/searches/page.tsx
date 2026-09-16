import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteSearchButton } from "@/components/listing/save-search-button";
import { ButtonLink } from "@/components/ui/button";
import { formatDistance } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Saved searches", robots: { index: false } };

type Query = {
  q?: string;
  category_id?: number;
  kind?: string;
  min_paise?: number;
  max_paise?: number;
  lat?: number;
  lng?: number;
  radius_km?: number;
  days?: number;
  seller?: string;
  photos?: boolean;
};

// Turns the stored query (normalize_saved_search keeps only these keys) back into a search link.
function searchHref(query: Query, slugs: Map<number, string>) {
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.category_id && slugs.has(query.category_id)) sp.set("category", slugs.get(query.category_id)!);
  if (query.kind) sp.set("kind", query.kind);
  if (query.min_paise != null) sp.set("min", String(query.min_paise / 100));
  if (query.max_paise != null) sp.set("max", String(query.max_paise / 100));
  if (query.days) sp.set("days", String(query.days));
  if (query.seller) sp.set("seller", query.seller);
  if (query.photos) sp.set("photos", "1");
  if (query.lat != null && query.lng != null) {
    sp.set("lat", String(query.lat));
    sp.set("lng", String(query.lng));
    if (query.radius_km) sp.set("radius", String(query.radius_km));
    sp.set("sort", "nearest");
  }
  const qs = sp.toString();
  return qs ? `/s?${qs}` : "/s";
}

export default async function SavedSearchesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/login?next=/me/searches");

  const [searches, categories] = await Promise.all([
    supabase.from("saved_searches").select("id, label, query, created_at").order("created_at", { ascending: false }),
    supabase.from("categories").select("id, slug"),
  ]);
  if (searches.error) throw new Error(`saved searches read failed: ${searches.error.message}`);
  if (categories.error) throw new Error(`categories read failed: ${categories.error.message}`);
  const slugs = new Map(categories.data.map((c) => [c.id, c.slug]));

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 pt-6 md:pt-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Saved searches</h1>
        <p className="text-sm text-ink-2">You get a notice when a new ad matches. You can save up to 20 searches.</p>
      </div>
      {searches.data.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-card bg-surface px-6 py-10 text-center ring-1 ring-line">
          <p className="font-display text-xl font-bold">No saved searches</p>
          <p className="max-w-xs text-sm text-ink-2">Search for something, then tap &quot;Save this search&quot;.</p>
          <ButtonLink href="/s">Search ads</ButtonLink>
        </div>
      ) : (
        <ul className="space-y-3">
          {searches.data.map((s) => {
            const query = s.query as Query;
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface p-4 ring-1 ring-line">
                <div className="min-w-0">
                  <Link href={searchHref(query, slugs)} className="font-medium text-ink hover:underline">
                    {s.label}
                  </Link>
                  {query.radius_km != null && (
                    <p className="text-xs text-ink-2">Within {formatDistance(query.radius_km)}</p>
                  )}
                </div>
                <DeleteSearchButton id={s.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
