"use client";

import { Share2 } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

// A plain WhatsApp link that works without JavaScript. Where the phone has a share sheet,
// the tap opens that instead, so Telegram, SMS and copy-link are one step away too.
export function ShareButton({ title, text, url }: { title: string; text: string; url: string }) {
  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(`${text}: ${url}`)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={async (e) => {
        if (!navigator.share) return;
        e.preventDefault();
        try {
          await navigator.share({ title, text, url });
        } catch {
          // The person closed the share sheet. Nothing to do.
        }
      }}
      className={buttonClass({ variant: "secondary", className: "w-full" })}
    >
      <Share2 className="size-5" aria-hidden />
      Share this ad
    </a>
  );
}
