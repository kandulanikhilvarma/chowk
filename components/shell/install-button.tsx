"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

// Chromium browsers only. Not in the DOM lib types yet.
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// Shows only when the browser says the app can be installed, and hides after install.
// ponytail: Safari has no install event, so iPhone users still use Share, then "Add to Home Screen".
export function InstallButton({ className = "" }: { className?: string }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    const ready = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const done = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  if (!prompt) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await prompt.prompt();
        await prompt.userChoice;
        // A prompt works once. The browser sends a new event if the user can still install.
        setPrompt(null);
      }}
      className={`pressable inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-[15px] font-semibold text-ink hover:bg-surface-2 ${className}`}
    >
      <Download className="size-4.5" aria-hidden />
      Install the Chowk app
    </button>
  );
}
