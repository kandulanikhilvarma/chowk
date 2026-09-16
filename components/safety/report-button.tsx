"use client";

import { useRef, useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Enums } from "@/lib/database.types";
import { ensureSession } from "@/lib/ensure-session";
import { reportReasons } from "@/lib/reports";
import { createClient } from "@/lib/supabase/browser";

type Reason = Enums<"report_reason">;

// One dialog for ads and people. Pass listingId to report an ad, userId to report a person.
export function ReportButton({ listingId, userId, label = "Report this ad" }: { listingId?: string; userId?: string; label?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<Reason>("scam");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<{ error?: string; done?: boolean }>({});
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      setState({});
      if (!(await ensureSession())) return setState({ error: "The guest account did not start. Try again." });
      const { error } = await createClient()
        .from("reports")
        .insert({ listing_id: listingId ?? null, reported_user_id: userId ?? null, reason, details: details.trim() || null });
      // 23505: this person already reported this ad. The first report still stands.
      if (error && error.code !== "23505") {
        console.error("report failed", error);
        return setState({ error: "The report was not sent. Try again." });
      }
      setState({ done: true });
    });

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-danger hover:underline"
      >
        <Flag className="size-4" aria-hidden />
        {label}
      </button>
      <dialog
        ref={dialog}
        aria-label={label}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-card bg-surface p-5 text-ink shadow-card backdrop:bg-ink/50"
      >
        {state.done ? (
          <div className="space-y-3">
            <h2 className="text-xl font-bold">Thank you</h2>
            <p className="text-ink-2">We check reports every day. An ad hides from search when 3 signed-in people report it.</p>
            <Button onClick={() => dialog.current?.close()}>Close</Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <h2 className="text-xl font-bold">{label}</h2>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">What is wrong?</legend>
              {(Object.entries(reportReasons) as [Reason, string][]).map(([value, text]) => (
                <label key={value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                    className="size-4 accent-primary"
                  />
                  {text}
                </label>
              ))}
            </fieldset>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Details (optional)</span>
              <textarea
                maxLength={1000}
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="block w-full rounded-field border border-line bg-surface px-3 py-2 text-ink"
              />
            </label>
            {state.error && (
              <p role="alert" className="text-sm text-danger">
                {state.error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => dialog.current?.close()}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                Send report
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
