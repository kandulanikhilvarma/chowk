import { supabasePublic } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

// For an uptime monitor: 200 when the app and the database answer, 503 when the database does not.
// A paused Supabase free-tier project shows up here first.
export async function GET() {
  const started = Date.now();
  const { error } = await supabasePublic.from("categories").select("id", { head: true, count: "exact" });
  const body = { ok: !error, db_ms: Date.now() - started };
  if (error) console.error(JSON.stringify({ level: "error", message: `health check failed: ${error.message}` }));
  return Response.json(body, { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}
