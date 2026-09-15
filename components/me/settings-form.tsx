"use client";

import { useState, useTransition } from "react";
import { saveSettings, type SettingsInput, type SettingsResult } from "@/app/me/settings/actions";
import { Button } from "@/components/ui/button";

const field = "h-11 w-full rounded-field border border-line bg-surface px-3 text-ink";

export function SettingsForm({ initial }: { initial: SettingsInput }) {
  const [values, setValues] = useState(initial);
  const [result, setResult] = useState<SettingsResult>({});
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof SettingsInput>(key: K, value: SettingsInput[K]) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => setResult(await saveSettings(values)));
      }}
    >
      <label className="block space-y-1">
        <span className="text-sm font-medium">Name people see</span>
        <input
          className={field}
          value={values.displayName}
          maxLength={40}
          aria-invalid={!!result.fields?.displayName}
          onChange={(e) => set("displayName", e.target.value)}
        />
        <FieldError list={result.fields?.displayName} />
      </label>

      <label className="flex items-center gap-3">
        <input type="checkbox" className="size-5 accent-primary" checked={values.isBusiness} onChange={(e) => set("isBusiness", e.target.checked)} />
        <span>I sell as a business</span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">UPI ID (optional)</span>
        <input
          className={field}
          value={values.upiId}
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="name@okbank"
          aria-invalid={!!result.fields?.upiId}
          onChange={(e) => set("upiId", e.target.value)}
        />
        <span className="block text-sm text-ink-2">
          A buyer sees it only after you both tap &quot;We met in person&quot;. Chowk never holds your money.
        </span>
        <FieldError list={result.fields?.upiId} />
      </label>

      <Button type="submit" disabled={pending}>
        Save settings
      </Button>
      {(result.error || result.notice) && (
        <p role="status" className={`text-sm ${result.error ? "text-danger" : "text-success"}`}>
          {result.error ?? result.notice}
        </p>
      )}
    </form>
  );
}

function FieldError({ list }: { list?: string[] }) {
  return list?.length ? <span className="block text-sm text-danger">{list[0]}</span> : null;
}
