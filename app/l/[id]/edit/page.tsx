import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PostForm, type PostDraft } from "@/components/listing/post-form";
import type { Json } from "@/lib/database.types";
import { getCities, photoBase } from "@/lib/listings";
import { supabasePublic } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit ad", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const uid = (await supabase.auth.getClaims()).data?.claims.sub;
  if (!uid) redirect(`/login?next=/l/${id}/edit`);

  const [listing, categories, cities] = await Promise.all([
    supabase
      .from("listings")
      .select(
        "id, kind, title, description, category_id, price_type, price_paise, condition, city_id, locality, pincode, attributes, images:listing_images(path, thumb_path, position, width, height)",
      )
      .eq("id", id)
      .eq("user_id", uid)
      .neq("status", "removed")
      .maybeSingle(),
    supabasePublic.from("categories").select("id, slug, name, attribute_schema").is("parent_id", null).order("position"),
    getCities(),
  ]);
  if (listing.error) throw new Error(`listing ${id} read failed: ${listing.error.message}`);
  // Another person's ad looks the same as a missing one.
  if (!listing.data) notFound();
  if (categories.error) throw new Error(`categories failed: ${categories.error.message}`);

  const l = listing.data;
  const stored = (l.attributes && typeof l.attributes === "object" && !Array.isArray(l.attributes) ? l.attributes : {}) as Record<
    string,
    Json | undefined
  >;
  const attributes: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(stored)) {
    if (typeof value === "boolean") attributes[key] = value;
    else if (value != null) attributes[key] = String(value);
  }

  const draft: PostDraft = {
    kind: l.kind,
    title: l.title,
    description: l.description,
    categoryId: String(l.category_id),
    priceType: l.price_type,
    price: l.price_paise == null ? "" : String(l.price_paise / 100),
    condition: l.condition ?? "",
    cityId: String(l.city_id),
    locality: l.locality ?? "",
    pincode: l.pincode ?? "",
    attributes,
  };

  const photos = [...l.images]
    .sort((a, b) => a.position - b.position)
    .map((i) => ({
      path: i.path,
      thumbPath: i.thumb_path,
      width: i.width ?? 1,
      height: i.height ?? 1,
      url: photoBase + i.thumb_path,
    }));

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pt-4 md:pt-8">
      <h1 className="text-2xl font-bold md:text-3xl">Edit ad</h1>
      <PostForm
        categories={categories.data}
        cities={cities.map((c) => ({ id: c.id, name: c.name }))}
        needsTerms={false}
        edit={{ id: l.id, draft, photos }}
      />
    </div>
  );
}
