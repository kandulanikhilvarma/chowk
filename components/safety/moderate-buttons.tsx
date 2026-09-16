"use client";

import { useState, useTransition } from "react";
import { moderate } from "@/app/admin/reports/actions";
import { Chip } from "@/components/ui/chip";

export function ModerateButtons({ reportId, hasListing }: { reportId: number; hasListing: boolean }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const act = (remove: boolean) => {
    if (remove && hasListing && !window.confirm("Remove this ad? The owner gets a notice.")) return;
    startTransition(async () => setError((await moderate(reportId, remove)).error ?? ""));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip disabled={pending} onClick={() => act(true)} className="text-danger">
        {hasListing ? "Remove ad" : "Mark as handled"}
      </Chip>
      <Chip disabled={pending} onClick={() => act(false)}>
        Dismiss
      </Chip>
      {error && (
        <span role="alert" className="text-sm text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
