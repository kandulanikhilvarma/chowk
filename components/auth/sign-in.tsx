"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";

// A guest who picks Google keeps the same account: linkIdentity adds Google to it, so ads and chats stay.
export function SignIn({ next, isGuest = false }: { next: string; isGuest?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function google() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const options = { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` };
    const { error } = isGuest
      ? await supabase.auth.linkIdentity({ provider: "google", options })
      : await supabase.auth.signInWithOAuth({ provider: "google", options });
    if (error) {
      setBusy(false);
      setError("Google sign-in is not available now. Try again later.");
    }
  }

  return (
    <div className="grid gap-3">
      <button type="button" onClick={google} disabled={busy} className={buttonClass({ className: "w-full" })}>
        {busy ? "Opening Google" : isGuest ? "Save my account with Google" : "Continue with Google"}
      </button>
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
