import type { Instrumentation } from "next";

// Every server error becomes one JSON line in the Vercel logs, searchable by digest (the code the
// error page shows). Set ERROR_WEBHOOK_URL (a Slack, Discord or alerting webhook) to be told as well.
// The path goes without its query string, so search words and rounded coordinates stay out of logs.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const report = {
    level: "error",
    message: err instanceof Error ? err.message : String(err),
    digest: typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined,
    method: request.method,
    path: request.path.split("?")[0],
    route: context.routePath,
    type: context.routeType,
  };
  console.error(JSON.stringify(report));

  const hook = process.env.ERROR_WEBHOOK_URL;
  if (!hook) return;
  try {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `Chowk error on ${report.route}: ${report.message} (${report.digest ?? "no digest"})`, ...report }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {
    console.error("error webhook failed", e);
  }
};
