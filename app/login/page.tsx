import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignIn } from "@/components/auth/sign-in";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const messages: Record<string, string> = {
  identity_already_exists: "This Google account already has a Chowk account. Sign out, then sign in with Google.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const error = typeof sp.error === "string" ? sp.error : null;

  const { data } = await (await createClient()).auth.getClaims();
  if (data?.claims && !data.claims.is_anonymous) redirect(next);

  return (
    <div className="mx-auto max-w-sm space-y-6 px-4 pt-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Sign in to Chowk</h1>
        <p className="text-ink-2">
          Post ads, chat with sellers and save searches. A guest account works right away. Add Google later to keep it on
          every device.
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded-field bg-surface px-3 py-2 text-sm text-danger ring-1 ring-line">
          {messages[error] ?? "Sign-in did not work. Try again."}
        </p>
      )}
      <SignIn next={next} isGuest={Boolean(data?.claims?.is_anonymous)} />
    </div>
  );
}
