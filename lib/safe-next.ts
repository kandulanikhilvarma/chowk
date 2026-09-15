const BASE = "http://chowk.invalid";

// Open-redirect guard for ?next=. Only same-site paths pass. The URL parser
// catches tricks like "//evil.com", "/\evil.com" and tabs inside the slashes.
export function safeNext(next: string | null | undefined, fallback = "/me") {
  if (!next?.startsWith("/")) return fallback;
  const url = new URL(next, BASE);
  return url.origin === BASE ? url.pathname + url.search + url.hash : fallback;
}
