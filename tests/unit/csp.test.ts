import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { THEME_SCRIPT, THEME_SCRIPT_HASH } from "../../lib/theme-script";
import { PRERENDERED_PAGES, contentSecurityPolicy } from "../../proxy";

describe("content security policy", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://demo.supabase.co";
  });

  it("carries the nonce and locks down the dangerous directives", () => {
    const csp = contentSecurityPolicy("abc123");
    expect(csp).toContain("'nonce-abc123'");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("allows eval only in development, where React needs it for server stacks", () => {
    expect(contentSecurityPolicy("abc123", true)).toContain("'unsafe-eval'");
  });

  it("lets Realtime open a websocket back to Supabase", () => {
    expect(contentSecurityPolicy("abc123")).toMatch(/connect-src[^;]*wss:\/\//);
  });

  // The browser blocks the inline theme script unless the digest matches it byte for byte.
  it("allows the theme script by a hash that matches the script", () => {
    const digest = "sha256-" + createHash("sha256").update(THEME_SCRIPT, "utf8").digest("base64");
    expect(digest).toBe(THEME_SCRIPT_HASH);
    expect(contentSecurityPolicy("abc123")).toContain(`'${THEME_SCRIPT_HASH}'`);
  });

  // A nonce cannot be baked into static HTML. If a new page gets prerendered and is not
  // exempted, its scripts are blocked and it never hydrates, so this guards the list.
  it("exempts every prerendered page", () => {
    const manifest = ".next/prerender-manifest.json";
    if (!existsSync(manifest)) return; // no build yet; `npm run check` builds after tests
    const routes: string[] = Object.keys(JSON.parse(readFileSync(manifest, "utf8")).routes ?? {});
    const prerenderedHtml = routes.filter((r) => !r.startsWith("/_") && !/\.[a-z]+$/.test(r));
    expect([...prerenderedHtml].sort()).toEqual([...PRERENDERED_PAGES].sort());
  });
});
