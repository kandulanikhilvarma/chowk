import { createClient } from "@/lib/supabase/browser";

// Browsing needs no account. Posting, chatting, saving and reporting need a signed-in account;
// the database refuses guest writes too. Without one, the visitor goes to sign-in and comes back here.
export async function requireAccount(router: { push(href: string): void }): Promise<string | null> {
  const claims = (await createClient().auth.getClaims()).data?.claims;
  if (claims && !claims.is_anonymous) return claims.sub;
  router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
  return null;
}
