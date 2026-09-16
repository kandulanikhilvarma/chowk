import type { MetadataRoute } from "next";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 3600;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chowk-kandula.vercel.app";

// Real ads only: demo ads are not items anyone sells, so search engines must not index them.
// ponytail: newest 1000 ads; split into sitemap index files when Chowk has more.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [listings, categories] = await Promise.all([
    supabasePublic
      .from("listings")
      .select("id, updated_at")
      .in("status", ["active", "reserved"])
      .eq("is_demo", false)
      .gt("expires_at", new Date().toISOString())
      .order("updated_at", { ascending: false })
      .limit(1000),
    supabasePublic.from("categories").select("slug").is("parent_id", null).order("position"),
  ]);
  if (listings.error) throw new Error(`sitemap listings failed: ${listings.error.message}`);
  if (categories.error) throw new Error(`sitemap categories failed: ${categories.error.message}`);

  return [
    { url: siteUrl, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/s`, changeFrequency: "hourly" },
    ...categories.data.map((c) => ({ url: `${siteUrl}/c/${c.slug}`, changeFrequency: "hourly" as const })),
    ...listings.data.map((l) => ({ url: `${siteUrl}/l/${l.id}`, lastModified: l.updated_at })),
    ...["/safety", "/help", "/terms", "/privacy", "/grievance"].map((p) => ({ url: `${siteUrl}${p}`, changeFrequency: "monthly" as const })),
  ];
}
