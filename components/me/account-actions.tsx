"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Trash2 } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";

const BUCKET = "listing-images";

export function AccountActions({ uid }: { uid: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      setError("");
      const supabase = createClient();
      // Photos first: once the account is gone, nobody can delete its storage folder.
      // The cap stops a loop if a remove call reports success but keeps the files.
      for (let round = 0; round < 50; round++) {
        const { data: files, error: listError } = await supabase.storage.from(BUCKET).list(uid, { limit: 100 });
        if (listError) return setError("Your photos did not delete. Try again.");
        if (!files.length) break;
        const { error: removeError } = await supabase.storage.from(BUCKET).remove(files.map((f) => `${uid}/${f.name}`));
        if (removeError) return setError("Your photos did not delete. Try again.");
      }

      const { error } = await supabase.rpc("delete_account");
      if (error) {
        console.error("delete_account failed", error);
        return setError("Your account was not deleted. Try again.");
      }
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/");
      router.refresh();
    });

  return (
    <>
      <section aria-labelledby="your-data" className="space-y-3 rounded-card bg-surface p-5 ring-1 ring-line">
        <h2 id="your-data" className="text-xl font-bold">
          Your data
        </h2>
        <p className="text-sm text-ink-2">Download your profile, ads, chats, deals, ratings, reports and notifications as a JSON file.</p>
        <a href="/me/export" download className={buttonClass({ variant: "secondary" })}>
          <Download className="size-5" aria-hidden />
          Download my data
        </a>
      </section>

      <section aria-labelledby="delete-account" className="space-y-3 rounded-card bg-danger-soft p-5">
        <h2 id="delete-account" className="text-xl font-bold text-danger">
          Delete account
        </h2>
        <p className="text-sm text-ink">
          This deletes your profile, ads, photos, chats, deals and the ratings you gave. The other people in your chats lose those chats too.
          You cannot undo this.
        </p>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Type DELETE to confirm</span>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoCapitalize="characters"
            className="h-11 w-full rounded-field border border-line bg-surface px-3 text-ink"
          />
        </label>
        <Button variant="secondary" disabled={confirm !== "DELETE" || pending} onClick={remove} className="text-danger">
          <Trash2 className="size-5" aria-hidden />
          {pending ? "Deleting" : "Delete my account"}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </section>
    </>
  );
}
