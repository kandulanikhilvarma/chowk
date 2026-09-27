"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

// The key is public by design: it only lets a browser create a subscription this server can sign.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Push wants the key as bytes, and VAPID keys travel as base64url.
function decodeKey(base64url: string) {
  const padded = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "loading" | "unsupported" | "off" | "on" | "blocked";

export function PushToggle({ uid }: { uid: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const settle = (next: State) => {
      if (!cancelled) setState(next);
    };

    void (async () => {
      if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        settle("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        settle("blocked");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        settle((await reg.pushManager.getSubscription()) ? "on" : "off");
      } catch {
        settle("unsupported");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        setState(Notification.permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        // Every push shows a notification. Chrome refuses silent push from web apps.
        userVisibleOnly: true,
        applicationServerKey: decodeKey(VAPID_PUBLIC_KEY!),
      });

      const json = sub.toJSON();
      // database.types.ts is generated from the live schema. Regenerate it once
      // 20260917200000_push_subscriptions.sql is applied and this cast can go.
      const db = createClient() as unknown as {
        from: (t: string) => {
          upsert: (v: unknown, o: unknown) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error } = await db.from("push_subscriptions").upsert(
        {
          user_id: uid,
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        },
        { onConflict: "endpoint" },
      );
      if (error) {
        // Storing it failed, so drop the browser subscription too and stay consistent.
        await sub.unsubscribe();
        throw new Error(error.message);
      }
      setState("on");
    } catch {
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const db = createClient() as unknown as {
          from: (t: string) => { delete: () => { eq: (c: string, v: string) => Promise<unknown> } };
        };
        await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <section aria-labelledby="alerts" className="space-y-3">
      <h2 id="alerts" className="text-xl font-bold">
        Alerts on this device
      </h2>
      {state === "blocked" ? (
        <p className="text-sm text-ink-2">
          This browser is blocking notifications for Chowk. Allow them in the site settings to turn alerts on.
        </p>
      ) : (
        <>
          <p className="text-sm text-ink-2">
            Get a notification when someone replies to your ad or a saved search finds something new.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={state === "on" ? disable : enable}
            className="pressable inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-[15px] font-semibold text-ink hover:bg-surface-2 disabled:opacity-60"
          >
            {state === "on" ? <BellOff className="size-4.5" aria-hidden /> : <Bell className="size-4.5" aria-hidden />}
            {state === "on" ? "Turn off alerts" : "Turn on alerts"}
          </button>
        </>
      )}
    </section>
  );
}
