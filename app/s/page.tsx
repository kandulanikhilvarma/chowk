import type { Metadata } from "next";
import { SearchView } from "@/components/listing/search-view";
import type { RawParams } from "@/lib/search-params";
import { supabasePublic } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Search ads" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const [raw, { data: categories }] = await Promise.all([
    searchParams,
    supabasePublic.from("categories").select("slug, name").is("parent_id", null).order("position"),
  ]);
  const q = typeof raw.q === "string" && raw.q.trim() ? raw.q.trim() : undefined;

  return (
    <SearchView
      raw={raw}
      path="/s"
      title={q ? `Results for "${q}"` : "All ads"}
      categories={categories ?? []}
    />
  );
}
