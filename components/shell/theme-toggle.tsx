"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const current = root.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage blocked (private mode). The theme still applies for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between light and dark theme"
      className="pressable grid size-11 place-items-center rounded-full text-ink hover:bg-surface-2"
    >
      <Moon className="light-only size-5" aria-hidden />
      <Sun className="dark-only size-5" aria-hidden />
    </button>
  );
}
