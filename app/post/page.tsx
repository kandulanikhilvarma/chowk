import type { Metadata } from "next";
import { PostForm } from "@/components/listing/post-form";
import { getCities } from "@/lib/listings";
import { supabasePublic } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Post an ad", robots: { index: false } };

// Open to everyone. The form starts a guest account at submit if the visitor has none.
export default async function PostPage() {
  const supabase = await createClient();
  const [categories, cities, { data: auth }] = await Promise.all([
    supabasePublic.from("categories").select("id, slug, name, attribute_schema").is("parent_id", null).order("position"),
    getCities(),
    supabase.auth.getClaims(),
  ]);
  if (categories.error) throw new Error(`categories failed: ${categories.error.message}`);

  let needsTerms = true;
  if (auth?.claims) {
    const { data } = await supabase.from("profiles").select("terms_accepted_at").eq("id", auth.claims.sub).maybeSingle();
    needsTerms = !data?.terms_accepted_at;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pt-4 md:pt-8">
      <h1 className="text-2xl font-bold md:text-3xl">Post an ad</h1>
      <PostForm
        categories={categories.data}
        cities={cities.map((c) => ({ id: c.id, name: c.name }))}
        needsTerms={needsTerms}
      />
    </div>
  );
}
