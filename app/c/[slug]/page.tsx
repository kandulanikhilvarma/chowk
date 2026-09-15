import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SearchView } from "@/components/listing/search-view";
import type { RawParams } from "@/lib/search-params";
import { supabasePublic } from "@/lib/supabase/public";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> };

// Metadata and the page ask for the same row; cache() makes it one query per request.
const getCategory = cache(async (slug: string) => {
  const { data, error } = await supabasePublic.from("categories").select("slug, name").eq("slug", slug).maybeSingle();
  if (error) throw new Error(`category ${slug} failed: ${error.message}`);
  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  return category ? { title: `${category.name} for sale near you` } : {};
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const category = await getCategory(slug);
  if (!category) notFound();

  return <SearchView raw={raw} path={`/c/${slug}`} title={category.name} category={slug} categories={[]} />;
}
