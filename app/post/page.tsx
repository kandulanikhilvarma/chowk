import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PostForm } from "@/components/listing/post-form";
import { getCities } from "@/lib/listings";
import { supabasePublic } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Post an ad", robots: { index: false } };

// Posting needs a signed-in account. Guests and visitors go to sign-in first.
export default async function PostPage() {
  const supabase = await createClient();
  const [categories, cities, { data: auth }] = await Promise.all([
    supabasePublic.from("categories").select("id, slug, name, attribute_schema").is("parent_id", null).order("position"),
    getCities(),
    supabase.auth.getClaims(),
  ]);
  if (!auth?.claims || auth.claims.is_anonymous) redirect("/login?next=/post");
  if (categories.error) throw new Error(`categories failed: ${categories.error.message}`);

  const { data: profile } = await supabase.from("profiles").select("terms_accepted_at").eq("id", auth.claims.sub).maybeSingle();
  const needsTerms = !profile?.terms_accepted_at;

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
