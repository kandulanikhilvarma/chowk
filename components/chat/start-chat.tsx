"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ensureSession } from "@/lib/ensure-session";
import { scamWarnings } from "@/lib/scam";
import { createClient } from "@/lib/supabase/browser";

const QUICK = ["Is it still available?", "What is your last price?", "Where can we meet?"];

export function StartChat({ listingId, wanted }: { listingId: string; wanted: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const quick = wanted ? ["I have this. Are you still looking?", QUICK[2]] : QUICK;

  const send = () => {
    const body = text.trim();
    if (!body) return setError("Write a message first.");
    startTransition(async () => {
      setError(null);
      if (!(await ensureSession())) return setError("The guest account did not start. Try again.");
      const { data, error } = await createClient().rpc("start_conversation", { p_listing: listingId, p_body: body });
      if (error) {
        // P0001 messages come from database rules (daily limit, blocked, own ad) and are written for people.
        if (error.code === "P0001") return setError(error.message);
        console.error("start_conversation failed", error);
        return setError("The message was not sent. Try again.");
      }
      router.push(`/messages/${data}`);
    });
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <div className="flex flex-wrap gap-2">
        {quick.map((q) => (
          <Chip key={q} selected={text === q} onClick={() => setText(q)}>
            {q}
          </Chip>
        ))}
      </div>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Your message</span>
        <textarea
          rows={4}
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="block w-full rounded-field border border-line bg-surface px-3 py-2.5 text-ink"
        />
      </label>
      {scamWarnings(text).map((w) => (
        <p key={w.signal} role="note" className="flex gap-1.5 text-sm text-danger">
          <ShieldAlert className="size-4 shrink-0" aria-hidden />
          {w.warning}
        </p>
      ))}
      <p className="flex gap-2 rounded-field bg-danger-soft px-3 py-2 text-sm text-ink">
        <ShieldAlert className="size-5 shrink-0 text-danger" aria-hidden />
        Keep the chat on Chowk. Meet in a busy public place. Never pay in advance.
      </p>
      <Button type="submit" disabled={pending} className="w-full">
        <Send className="size-5" aria-hidden />
        Send message
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
