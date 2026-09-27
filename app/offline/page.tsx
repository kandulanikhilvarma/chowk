import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "You are offline" };

// The service worker caches this page and serves it when a navigation cannot reach the network.
export default function Offline() {
  return (
    <div className="mx-auto grid max-w-sm place-items-center gap-4 px-4 pt-20 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-surface-2 text-ink-2">
        <WifiOff className="size-7" aria-hidden />
      </span>
      <h1 className="text-2xl font-bold">You are offline</h1>
      <p className="text-ink-2">
        Chowk needs a connection to load ads and chats. The page will work again once you are back online.
      </p>
      <ButtonLink href="/">Try again</ButtonLink>
    </div>
  );
}
