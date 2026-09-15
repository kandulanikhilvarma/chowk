import { createClient } from "@/lib/supabase/browser";

// Browsing needs no account. The first action that writes (post, save, chat) starts a guest account.
export async function ensureSession(): Promise<string | null> {
  const supabase = createClient();
  const uid = (await supabase.auth.getClaims()).data?.claims.sub;
  if (uid) return uid;
  const { data, error } = await supabase.auth.signInAnonymously();
  return error ? null : (data.user?.id ?? null);
}
