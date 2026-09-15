"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";

// A guest who picks Google keeps the same account: linkIdentity adds Google to it, so ads and chats stay.
export function SignIn({ next, isGuest = false }: { next: string; isGuest?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"google" | "guest" | null>(null);
  const [error, setError] = useState("");

  async function google() {
    setBusy("google");
    setError("");
    const supabase = createClient();
    const options = { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` };
    const { error } = isGuest
      ? await supabase.auth.linkIdentity({ provider: "google", options })
      : await supabase.auth.signInWithOAuth({ provider: "google", options });
    if (error) {
      setBusy(null);
      setError("Google sign-in is not available now. Try again later.");
    }
  }

  async function guest() {
    setBusy("guest");
    setError("");
    const { error } = await createClient().auth.signInAnonymously();
    if (error) {
      setBusy(null);
      return setError("Guest sign-in is not available now. Try again later.");
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <button type="button" onClick={google} disabled={busy !== null} className={buttonClass({ className: "w-full" })}>
        {busy === "google" ? "Opening Google" : isGuest ? "Save my account with Google" : "Continue with Google"}
      </button>
      {!isGuest && (
        <button
          type="button"
          onClick={guest}
          disabled={busy !== null}
          className={buttonClass({ variant: "secondary", className: "w-full" })}
        >
          {busy === "guest" ? "Starting" : "Continue as guest"}
        </button>
      )}
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-danger">
        {error}
      </p>
    </div>
  );
}

export function SignOut() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace("/");
        router.refresh();
      }}
      className={buttonClass({ variant: "secondary" })}
    >
      Sign out
    </button>
  );
}
