import { devices, expect, test, type Page } from "@playwright/test";

// Two guest accounts talk in real time, agree on an offer, close the deal and rate each other.
// Writes to the shared database: E2E_WRITES=1 npm run e2e. The ad (and its chat, deal and ratings) is deleted at the end.
test.skip(!process.env.E2E_WRITES, "set E2E_WRITES=1 to run tests that write data");
test.setTimeout(180_000);

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function postAd(page: Page, title: string) {
  await page.goto("/post");
  await page.locator('input[type="file"]').setInputFiles({ name: "e2e.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Next: details" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Category: Bikes?" }).click();
  await page.getByLabel("Price in rupees").fill("5000");
  await page.getByLabel("City").selectOption({ label: "Pune" });
  const terms = page.getByRole("checkbox", { name: /I accept the terms/ });
  if (await terms.count()) await terms.check();
  await page.getByRole("button", { name: "Post my ad" }).click();
  await expect(page).toHaveURL(/\/l\/[0-9a-f-]{36}$/, { timeout: 30_000 });
}

test("chat, offer, deal and ratings between two people", async ({ page: seller, browser }, testInfo) => {
  const title = `e2e_ Hero Sprint cycle chat ${Date.now()}`;
  seller.on("dialog", (d) => d.accept());
  await postAd(seller, title);
  const adUrl = seller.url();

  const buyerContext = await browser.newContext({ ...devices["Pixel 7"], baseURL: testInfo.project.use.baseURL });
  const buyer = await buyerContext.newPage();

  try {
    await buyer.goto(adUrl);
    await buyer.getByRole("link", { name: "Chat with seller" }).click();
    await buyer.getByRole("button", { name: "Is it still available?" }).click();
    await buyer.getByRole("button", { name: "Send message" }).click();
    await expect(buyer).toHaveURL(/\/messages\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await expect(buyer.getByText("Live", { exact: true })).toBeVisible({ timeout: 15_000 });

    await seller.goto("/messages");
    await seller.locator("a", { hasText: title }).click();
    await expect(seller.getByText("Is it still available?")).toBeVisible();
    await expect(seller.getByText("Live", { exact: true })).toBeVisible({ timeout: 15_000 });

    // Live both ways.
    await seller.getByRole("button", { name: "Yes, it is still available." }).click();
    await seller.getByRole("button", { name: "Send", exact: true }).click();
    // Realtime delivery over the internet can take a few seconds.
    const live = { timeout: 15_000 };
    await expect(buyer.getByText("Yes, it is still available.")).toBeVisible(live);

    await buyer.getByRole("button", { name: "Make an offer" }).click();
    await buyer.getByLabel("Offer in rupees").fill("4500");
    await buyer.getByRole("button", { name: "Send offer" }).click();
    await expect(seller.getByText("₹4,500")).toBeVisible(live);
    await seller.getByRole("button", { name: "Accept", exact: true }).click();
    await expect(buyer.getByText(/Offer accepted/)).toBeVisible(live);

    await seller.getByRole("button", { name: /Mark sold to/ }).click();
    await expect(seller.getByText(/Waiting for .* to confirm the deal/)).toBeVisible();
    await buyer.getByRole("button", { name: "Confirm the deal" }).click({ timeout: 15_000 });

    await expect(buyer.getByText("Rate the seller")).toBeVisible();
    await buyer.getByRole("button", { name: "Send rating" }).click();
    await expect(buyer.getByText(/Deal done/)).toBeVisible();

    await seller.reload();
    await expect(seller.getByText("Rate the buyer")).toBeVisible();
    await seller.getByRole("button", { name: "Send rating" }).click();
    await expect(seller.getByText(/Deal done/)).toBeVisible();

    await seller.getByRole("button", { name: "We met in person" }).click();
    await expect(seller.getByText("You said you met in person.")).toBeVisible();
    await buyer.getByRole("button", { name: "We met in person" }).click();
    await expect(buyer.getByText(/has not added a UPI ID/)).toBeVisible();

    // The buyer's profile counts the deal. Guest ratings do not add badges, so none are checked here.
    await seller.getByRole("heading", { level: 1 }).getByRole("link").click();
    await expect(seller).toHaveURL(/\/u\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await expect(seller.getByText("Deals done").locator("..")).toContainText("1");
  } finally {
    await buyerContext.close();
    await seller.goto("/me");
    const row = seller.locator("li", { hasText: title });
    if (await row.count()) {
      await row.getByRole("button", { name: "Delete" }).click();
      await expect(row).toHaveCount(0, { timeout: 20_000 });
    }
  }
});
