import { defineConfig, devices } from "@playwright/test";

// Supabase URL, key and the test account details for the writing tests.
try {
  process.loadEnvFile(".env.local");
} catch {}

// E2E specs end in .e2e.ts so Vitest does not pick them up.
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.e2e.ts",
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  // ponytail: installed Chrome instead of a downloaded Playwright build; use chromium in CI once CI exists.
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"], channel: "chrome" } }],
});
