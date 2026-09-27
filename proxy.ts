import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { THEME_SCRIPT_HASH } from "@/lib/theme-script";

// Resolved on first use, not at import, so the policy stays unit-testable.
let originCache: string | undefined;
function supabaseOrigin() {
  return (originCache ??= new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin);
}

// Pages Next prerenders at build time. A nonce cannot be baked into static HTML, so sending a
// script-src nonce to one blocks its own bootstrap and the page never hydrates. They render no
// user text, so they keep the baseline policy from next.config.ts instead.
// Source of truth is .next/prerender-manifest.json; tests/unit/csp.test.ts fails on drift.
export const PRERENDERED_PAGES = new Set(["/", "/grievance", "/help", "/offline", "/privacy", "/safety", "/terms"]);

// Every route that renders user text is dynamic, and each one gets a fresh nonce.
export function contentSecurityPolicy(nonce: string, isDev = false) {
  const origin = supabaseOrigin();
  return [
    "default-src 'self'",
    // strict-dynamic trusts whatever the nonced bootstrap loads, so chunk names need no listing.
    // React rebuilds server stacks with eval in development only.
    // The theme script is allowed by hash so the layout never reads headers(), which would
    // opt every route into dynamic rendering. Next nonces its own bootstrap automatically.
    `script-src 'self' 'nonce-${nonce}' '${THEME_SCRIPT_HASH}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // React writes style attributes, which style-src cannot express as a hash.
    "style-src 'self' 'unsafe-inline'",
    // Without this, worker-src falls back to script-src, where strict-dynamic ignores 'self'
    // and the service worker never registers.
    "worker-src 'self'",
    `img-src 'self' blob: data: https://images.unsplash.com ${origin}`,
    "font-src 'self'",
    // wss: Supabase Realtime carries the live chat. Plain ws: is the dev server's hot reload.
    `connect-src 'self' ${origin} ${origin.replace("https://", "wss://")}${isDev ? " ws:" : ""}`,
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

// Refreshes the Supabase session cookie. Authorization lives in RLS and server actions, not here.
export async function proxy(request: NextRequest) {
  const staticPage = PRERENDERED_PAGES.has(request.nextUrl.pathname);
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");

  // Next parses this request header and stamps the nonce on the scripts it emits.
  const requestHeaders = new Headers(request.headers);
  if (!staticPage) requestHeaders.set("content-security-policy", csp);
  const init = { request: { headers: requestHeaders } };

  // ponytail: visitors with no auth cookie skip the Supabase call entirely.
  if (!request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    const pass = NextResponse.next(init);
    if (!staticPage) pass.headers.set("content-security-policy", csp);
    return pass;
  }

  let response = NextResponse.next(init);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next(init);
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  await supabase.auth.getClaims();
  // setAll() rebuilds `response`, so the policy goes on whichever object survived.
  if (!staticPage) response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
