import { createClient } from "@supabase/supabase-js";

// Cookie-less client for public pages. It never reads the request, so those pages stay cacheable.
// It sees only rows that RLS opens to the `anon` role.
export const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
