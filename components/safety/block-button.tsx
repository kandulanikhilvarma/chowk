"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

// Blocking stops messages both ways (messages policy and prepare_conversation check it).
export function BlockButton({ userId, name, blocked }: { userId: string; name: string; blocked: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    if (!blocked && !window.confirm(`Block ${name}? You can no longer send messages to each other.`)) return;
    startTransition(async () => {
      setError("");
      const supabase = createClient();
      const { error } = blocked
        ? await supabase.from("blocks").delete().eq("blocked_id", userId)
        : await supabase.from("blocks").insert({ blocked_id: userId });
      // 23505: already blocked, which is the state we want.
      if (error && error.code !== "23505") {
        console.error("block change failed", error);
        return setError("That did not work. Try again.");
      }
      router.refresh();
    });
  };

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-danger hover:underline"
      >
        <Ban className="size-4" aria-hidden />
        {blocked ? `Unblock ${name}` : `Block ${name}`}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
