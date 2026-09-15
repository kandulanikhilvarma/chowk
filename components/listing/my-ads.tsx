"use client";

import Link from "next/link";
import { ImageOff } from "lucide-react";
import { useState, useTransition } from "react";
import { manageAd, type AdAction, type AdResult } from "@/app/me/actions";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { priceLabel, timeAgo, type PriceType } from "@/lib/format";

export type MyAd = {
  id: string;
  title: string;
  status: "active" | "reserved" | "sold" | "paused" | "removed";
  pricePaise: number | null;
  priceType: PriceType;
  expired: boolean;
  imageUrl: string | null;
  createdAt: string;
};

const badges = {
  active: { tone: "success", label: "Online" },
  reserved: { tone: "accent", label: "Reserved" },
  paused: { tone: "neutral", label: "Paused" },
  sold: { tone: "primary", label: "Sold" },
  removed: { tone: "danger", label: "Removed" },
} as const;

const confirmText: Partial<Record<AdAction, string>> = {
  sold: "Mark this ad as sold? People can no longer start chats about it.",
  delete: "Delete this ad and its photos? You cannot undo this.",
};

export function MyAds({ ads }: { ads: MyAd[] }) {
  if (!ads.length) {
    return (
      <div className="grid justify-items-center gap-3 rounded-card bg-surface px-6 py-10 text-center ring-1 ring-line">
        <p className="font-display text-xl font-bold">You have no ads yet</p>
        <p className="max-w-xs text-sm text-ink-2">Sell something you do not use, or post a Wanted ad for something you need.</p>
        <ButtonLink href="/post" variant="accent">
          Post an ad
        </ButtonLink>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {ads.map((ad) => (
        <MyAdRow key={ad.id} ad={ad} />
      ))}
    </ul>
  );
}

function MyAdRow({ ad }: { ad: MyAd }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdResult>({});
  const badge = ad.expired && ad.status !== "sold" ? { tone: "danger" as const, label: "Expired" } : badges[ad.status];

  const run = (action: AdAction) => {
    if (confirmText[action] && !window.confirm(confirmText[action])) return;
    startTransition(async () => setResult(await manageAd(ad.id, action)));
  };

  const actions: [AdAction, string][] =
    ad.status === "sold"
      ? []
      : ad.expired
        ? [["renew", "Renew for 60 days"]]
        : ad.status === "active"
          ? [["reserve", "Reserve"], ["bump", "Move up"], ["pause", "Pause"], ["sold", "Mark sold"]]
          : ad.status === "reserved"
            ? [["activate", "Back online"], ["sold", "Mark sold"]]
            : [["activate", "Back online"]];

  return (
    <li className="space-y-3 rounded-card bg-surface p-3 ring-1 ring-line" aria-busy={pending}>
      <div className="flex gap-3">
        <div className="size-20 shrink-0 overflow-hidden rounded-field bg-surface-2">
          {ad.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- photos arrive resized from the browser
            <img src={ad.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-ink-2">
              <ImageOff className="size-6" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <Link href={`/l/${ad.id}`} className="line-clamp-2 font-medium text-ink hover:underline">
            {ad.title}
          </Link>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-display font-bold">{priceLabel(ad.pricePaise, ad.priceType, true)}</span>
            <Badge tone={badge.tone}>{badge.label}</Badge>
            <span className="text-xs text-ink-2">Posted {timeAgo(ad.createdAt)}</span>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map(([action, label]) => (
          <Chip key={action} onClick={() => run(action)} disabled={pending}>
            {label}
          </Chip>
        ))}
        <Chip onClick={() => run("delete")} disabled={pending} className="text-danger">
          Delete
        </Chip>
      </div>
      {(result.error || result.notice) && (
        <p role="status" className={`text-sm ${result.error ? "text-danger" : "text-success"}`}>
          {result.error ?? result.notice}
        </p>
      )}
    </li>
  );
}
