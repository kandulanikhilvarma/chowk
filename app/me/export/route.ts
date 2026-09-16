import { createClient } from "@/lib/supabase/server";

// DPDP right of access: every row the person owns, as one JSON download. Queries run as the user, so RLS applies.
// ponytail: each list is capped at the API row limit (1000). Page through the lists when an account gets that big.
export async function GET() {
  const supabase = await createClient();
  const uid = (await supabase.auth.getClaims()).data?.claims.sub;
  if (!uid) return new Response("Sign in first.", { status: 401 });

  const queries = {
    profile: supabase
      .from("profiles")
      .select("id, display_name, avatar_url, city_id, is_business, is_guest, deals_count, created_at, terms_accepted_at")
      .eq("id", uid)
      .maybeSingle(),
    payment: supabase.from("profile_private").select("upi_id").eq("id", uid).maybeSingle(),
    listings: supabase
      .from("listings")
      .select(
        "id, kind, title, description, price_paise, price_type, condition, attributes, status, city_id, locality, pincode, created_at, updated_at, expires_at, images:listing_images(path, thumb_path, position)",
      )
      .eq("user_id", uid),
    favorites: supabase.from("favorites").select("listing_id, created_at"),
    saved_searches: supabase.from("saved_searches").select("label, query, created_at"),
    chats: supabase
      .from("conversations")
      .select("id, listing_id, buyer_id, seller_id, created_at, messages(sender_id, kind, body, offer_paise, offer_state, created_at)"),
    deals: supabase.from("deals").select("id, listing_id, buyer_id, seller_id, buyer_confirmed_at, seller_confirmed_at, created_at"),
    ratings_given: supabase.from("reviews").select("deal_id, reviewee_id, friendly, reliable, comment, created_at").eq("reviewer_id", uid),
    ratings_received: supabase.from("reviews").select("deal_id, reviewer_id, friendly, reliable, comment, created_at").eq("reviewee_id", uid),
    reports: supabase.from("reports").select("listing_id, reported_user_id, reason, details, status, created_at").eq("reporter_id", uid),
    blocks: supabase.from("blocks").select("blocked_id, created_at"),
    notifications: supabase.from("notifications").select("kind, title, body, href, read_at, created_at"),
  };

  const entries = await Promise.all(
    Object.entries(queries).map(async ([name, query]) => {
      const { data, error } = await query;
      if (error) throw new Error(`export ${name} failed: ${error.message}`);
      return [name, data] as const;
    }),
  );

  const now = new Date().toISOString();
  return new Response(JSON.stringify({ exported_at: now, user_id: uid, ...Object.fromEntries(entries) }, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="chowk-data-${now.slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
