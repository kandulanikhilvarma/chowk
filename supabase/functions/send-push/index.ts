// Sends a web push for every new row in public.notifications.
// Wired as a Supabase Database Webhook (notifications, INSERT) that calls this function with the
// header x-push-secret. Deploy with --no-verify-jwt: the webhook carries the shared secret, not a user JWT.
//
// Secrets (supabase secrets set ...): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (a mailto: or
// https: contact for push services), PUSH_WEBHOOK_SECRET. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// come from the platform. The service role key stays inside Supabase; the Next.js app still has none.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type NotificationRow = { user_id: string; title: string; body: string | null; href: string | null };

const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

Deno.serve(async (req) => {
  if (!secret || req.headers.get("x-push-secret") !== secret) return new Response("forbidden", { status: 403 });

  const event = await req.json().catch(() => null);
  const row: NotificationRow | undefined = event?.type === "INSERT" ? event.record : undefined;
  if (!row?.user_id) return new Response("ignored", { status: 202 });

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", row.user_id);
  if (error) {
    console.error("push_subscriptions read failed", error);
    return new Response("read failed", { status: 500 });
  }

  // Same shape the service worker reads. href is a Chowk path; the worker opens nothing else.
  const payload = JSON.stringify({
    title: row.title,
    body: (row.body ?? "").slice(0, 140),
    href: row.href?.startsWith("/") ? row.href : "/notifications",
    tag: row.href ?? "chowk",
  });

  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404 and 410: the browser dropped this subscription, so the row can go.
        if (status === 404 || status === 410) gone.push(s.id);
        else console.error("push failed", status, (e as Error).message);
      }
    }),
  );
  if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);

  return Response.json({ sent, removed: gone.length });
});
