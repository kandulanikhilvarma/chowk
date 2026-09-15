"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteSavedSearch, saveSearch, type AdResult } from "@/app/me/actions";
import { Chip } from "@/components/ui/chip";
import { ensureSession } from "@/lib/ensure-session";

export function SaveSearchButton({ raw, category }: { raw: Record<string, string>; category?: string }) {
  const [result, setResult] = useState<AdResult | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      if (!(await ensureSession())) return setResult({ error: "Sign-in is not available now. Try again later." });
      setResult(await saveSearch(raw, category));
    });

  if (result?.notice) {
    return (
      <p role="status" className="text-sm text-success">
        {result.notice}{" "}
        <Link href="/me/searches" className="underline">
          See saved searches
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip onClick={save} disabled={pending}>
        <Bell className="size-4" aria-hidden />
        {pending ? "Saving" : "Save this search"}
      </Chip>
      {result?.error && (
        <p role="alert" className="text-sm text-danger">
          {result.error}
        </p>
      )}
    </div>
  );
}

export function DeleteSearchButton({ id }: { id: number }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Chip
        onClick={() => startTransition(async () => setError((await deleteSavedSearch(id)).error ?? ""))}
        disabled={pending}
        className="text-danger"
      >
        Delete
      </Chip>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}
