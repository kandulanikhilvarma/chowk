// README screenshots: node scripts/screens.mjs [base URL]
// Uses the installed Chrome (channel "chrome"), so Playwright downloads no browser.
import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = process.argv[2] ?? "https://chowk-kandula.vercel.app";
const shots = [
  ["home", "/"],
  ["search", "/s?city=pune&radius=25&sort=nearest"],
  ["listing", process.env.AD_PATH ?? "/s"],
  ["post", "/post"],
  ["safety", "/safety"],
];

await mkdir("docs/screens", { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
for (const scheme of ["light", "dark"]) {
  const context = await browser.newContext({ ...devices["Pixel 7"], colorScheme: scheme });
  const page = await context.newPage();
  for (const [name, path] of shots) {
    // Dark mode only for the two pages the README shows side by side.
    if (scheme === "dark" && !["home", "listing"].includes(name)) continue;
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.screenshot({ path: `docs/screens/${name}-${scheme}.png` });
    console.log(`docs/screens/${name}-${scheme}.png`);
  }
  await context.close();
}
await browser.close();
