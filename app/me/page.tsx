import type { Metadata } from "next";
import Link from "next/link";
import { SignIn, SignOut } from "@/components/auth/sign-in";
import { buttonClass } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Chowk", robots: { index: false } };

export default async function MePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    return (
      <div className="mx-auto max-w-sm space-y-6 px-4 pt-10">
        <h1 className="text-3xl font-bold">My Chowk</h1>
        <p className="text-ink-2">Sign in to see your ads, chats and saved searches.</p>
        <SignIn next="/me" />
      </div>
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, is_guest")
    .eq("id", claims.sub)
    .single();
  if (error) throw new Error(`profile read failed: ${error.message}`);

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 pt-6 md:pt-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{profile.display_name}</h1>
        <Link href={`/u/${claims.sub}`} className={buttonClass({ variant: "secondary" })}>
          Public profile
        </Link>
      </div>

      {profile.is_guest ? (
        <section className="space-y-3 rounded-card bg-surface p-5 ring-1 ring-line">
          <h2 className="font-display text-xl font-bold">Save your account</h2>
          <p className="text-sm text-ink-2">
            You use a guest account. It stays on this device only. Add Google so you do not lose your ads and chats.
          </p>
          <SignIn next="/me" isGuest />
        </section>
      ) : (
        <SignOut />
      )}
    </div>
  );
}
