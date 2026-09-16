import { expect, test, type Page } from "@playwright/test";

// Runs against the shared demo seed (is_demo rows), so it needs no test data of its own.
const card = 'main li a[href^="/l/"]';
const titles = (page: Page) => page.locator(`${card} h3`).allTextContents();
const places = (page: Page) => page.locator(`${card} span.truncate`).allTextContents();
const prices = (page: Page) => page.locator(`${card} > div:last-child > p:first-child > span:first-child`).allTextContents();
const km = (place: string) => Number(place.match(/· (?:< ?)?([\d.]+) km/)?.[1]);

test("keyword search finds the matching ads", async ({ page }) => {
  await page.goto("/s?q=royal+enfield");
  const found = await titles(page);
  expect(found.length).toBeGreaterThanOrEqual(2);
  for (const t of found) expect(t).toContain("Royal Enfield");
});

test("category page with a city shows only nearby ads in that category", async ({ page }) => {
  await page.goto("/c/bikes?city=pune");
  await expect(page.getByText("Ads within 25 km of Pune")).toBeVisible();
  expect(await titles(page)).toEqual(
    expect.arrayContaining([expect.stringContaining("Royal Enfield"), expect.stringContaining("Ladies cycle")]),
  );
  for (const p of await places(page)) expect(p).toContain("Pune");
});

test("price filter shows only free ads", async ({ page }) => {
  await page.goto("/s?price_type=free");
  const found = await prices(page);
  expect(found.length).toBeGreaterThan(0);
  for (const p of found) expect(p).toBe("Free");
});

test("radius search sorts nearest first and stays inside the radius", async ({ page }) => {
  await page.goto("/s?city=hyderabad&radius=10&sort=nearest");
  const distances = (await places(page)).map(km);
  expect(distances.length).toBeGreaterThan(0);
  for (const d of distances) expect(d).toBeLessThanOrEqual(10);
  expect(distances).toEqual([...distances].sort((a, b) => a - b));
});

test("search form sends the query and city", async ({ page }) => {
  await page.goto("/s");
  await page.getByRole("searchbox", { name: "Search" }).fill("iphone");
  await page.getByRole("combobox", { name: "City" }).selectOption("mumbai");
  await page.getByRole("button", { name: "Show results" }).click();
  await expect(page).toHaveURL(/q=iphone.*city=mumbai|city=mumbai.*q=iphone/);
  // The URL changes before the new results render, so wait for the card itself.
  await expect(page.locator(card, { hasText: "iPhone 13" }).first()).toBeVisible();
});

test("sign-in callback never redirects off site", async ({ page }) => {
  await page.goto("/auth/callback?next=//evil.com");
  await expect(page).toHaveURL(/\/login\?error=sign_in_failed&next=%2Fme$/);
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue as guest" })).toBeVisible();
});

test("a plain browse starts at the visitor city and a search does not", async ({ browser }) => {
  // Vercel replaces this header with the real one, so the check runs only against a local server.
  test.skip(!!process.env.E2E_BASE_URL?.startsWith("https://"), "Vercel sets x-vercel-ip-city itself");
  const context = await browser.newContext({ extraHTTPHeaders: { "x-vercel-ip-city": "Bangalore" } });
  const page = await context.newPage();
  await page.goto("/s");
  await expect(page.getByText("Ads within 25 km of Bengaluru")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "City" })).toHaveValue("bengaluru");
  await page.goto("/s?q=royal+enfield");
  await expect(page.getByText(/Ads within/)).toHaveCount(0);
  await context.close();
});

test("seller, date and photo filters stay in the form", async ({ page }) => {
  await page.goto("/s?days=30&seller=private&photos=1");
  await expect(page.getByRole("combobox", { name: "Posted within" })).toHaveValue("30");
  await expect(page.getByRole("combobox", { name: "Seller" })).toHaveValue("private");
  await expect(page.getByRole("checkbox", { name: "With photos" })).toBeChecked();
  await expect(page.locator(card).first()).toBeVisible();
});

test("demo ad credits the photographer and has a share image", async ({ page, request }) => {
  await page.goto("/s?q=iphone");
  await page.locator(card).first().click();
  await expect(page.getByRole("link", { name: "Unsplash" })).toHaveAttribute("href", /utm_source=chowk/);
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  const res = await request.get(new URL(og!).pathname + new URL(og!).search);
  expect(res.headers()["content-type"]).toBe("image/png");
});
