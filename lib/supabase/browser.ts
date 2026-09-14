import { createBrowserClient } from "@supabase/ssr";

// Browser client for Realtime chat, photo uploads and guest sign-in. The library returns one shared instance.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
