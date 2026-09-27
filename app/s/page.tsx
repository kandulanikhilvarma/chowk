import type { Metadata } from "next";
import { SearchView } from "@/components/listing/search-view";
import { getTopCategories } from "@/lib/listings";
import type { RawParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Search ads" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const [raw, categories] = await Promise.all([searchParams, getTopCategories()]);
  const q = typeof raw.q === "string" && raw.q.trim() ? raw.q.trim() : undefined;

  return <SearchView raw={raw} path="/s" title={q ? `Results for "${q}"` : "All ads"} categories={categories} />;
}
