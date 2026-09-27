import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile in the home folder confuses workspace detection. Pin the root to this repo.
  turbopack: { root: path.join(__dirname) },
  poweredByHeader: false,
  // No other site may frame Chowk, so account delete and admin buttons cannot be clickjacked.
  // proxy.ts sends the full policy, script-src nonce included, on every page it matches.
  // This one is the floor for what the middleware skips: static assets and image files.
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
      ],
    },
  ],
};

export default nextConfig;
