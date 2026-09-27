"use client";

import { useMemo, useSyncExternalStore } from "react";

// A short most-recent-first list kept in localStorage, for per-device conveniences only
// (recently viewed ads, recent searches). Nothing here reaches the server.
// localStorage can throw (private mode, blocked or full storage), so every access fails soft.

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readRaw(key: string) {
  try {
    return localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
}

function parse<T>(raw: string): T[] {
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function useLocalList<T>(key: string): T[] {
  const raw = useSyncExternalStore(subscribe, () => readRaw(key), () => "[]");
  return useMemo(() => parse<T>(raw), [raw]);
}

/** Puts `item` first, drops any older copy that `same` matches, and keeps at most `max`. */
export function pushLocal<T>(key: string, item: T, max: number, same: (a: T, b: T) => boolean) {
  try {
    const rest = parse<T>(readRaw(key)).filter((x) => !same(x, item));
    localStorage.setItem(key, JSON.stringify([item, ...rest].slice(0, max)));
    notify();
  } catch {
    // Storage full or blocked.
  }
}

export function clearLocal(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Blocked storage has nothing to clear.
  }
  notify();
}
