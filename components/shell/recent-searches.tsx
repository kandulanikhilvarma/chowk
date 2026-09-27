"use client";

import { useEffect, useId, useRef, useState, type ComponentProps } from "react";
import { pushLocal, useLocalList } from "@/lib/local-list";
import { createClient } from "@/lib/supabase/browser";

const KEY = "chowk:searches";

// A plain search box with a native <datalist>: past searches from this device, then live ad titles
// close to what is typed (typos included, via the suggest_titles RPC). No popover code, and the form
// still submits without JavaScript.
export function SearchInput(props: Omit<ComponentProps<"input">, "list" | "name" | "type">) {
  const id = useId();
  const recent = useLocalList<string>(KEY);
  const [titles, setTitles] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef("");

  useEffect(() => () => clearTimeout(timer.current), []);

  const onInput = (value: string) => {
    clearTimeout(timer.current);
    const q = value.trim();
    latest.current = q;
    if (q.length < 2) return setTitles([]);
    timer.current = setTimeout(async () => {
      const { data, error } = await createClient().rpc("suggest_titles", { p_q: q });
      // A slow answer for an older word must not replace the current one.
      if (latest.current !== q) return;
      if (error) console.error("suggest_titles failed", error);
      setTitles(data ?? []);
    }, 200);
  };

  const options = [...new Set([...titles, ...recent])].slice(0, 8);

  return (
    <>
      <input
        {...props}
        name="q"
        type="search"
        list={id}
        autoComplete="off"
        onInput={(e) => onInput(e.currentTarget.value)}
      />
      <datalist id={id}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}

// The city someone picked in a search becomes where their next plain browse starts, instead of a
// guess from the internet connection. "any" remembers a deliberate "Anywhere in India". A year, this device only.
export function RememberCity({ slug }: { slug: string }) {
  useEffect(() => {
    document.cookie = `chowk_city=${encodeURIComponent(slug || "any")}; path=/; max-age=31536000; samesite=lax`;
  }, [slug]);
  return null;
}

export function RecordSearch({ q }: { q: string }) {
  useEffect(() => {
    const clean = q.trim().slice(0, 100);
    if (clean) pushLocal(KEY, clean, 8, (a, b) => a.toLowerCase() === b.toLowerCase());
  }, [q]);
  return null;
}
