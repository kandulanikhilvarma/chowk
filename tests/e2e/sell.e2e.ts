import { expect, test } from "@playwright/test";

// Writes to the shared database, so it runs only on request: E2E_WRITES=1 npm run e2e
// Needs anonymous sign-ins turned on in Supabase. Rows use the e2e_ title prefix and are deleted at the end.
// ponytail: the guest user stays behind. Remove it with the account delete flow once Phase 6 ships it.
test.skip(!process.env.E2E_WRITES, "set E2E_WRITES=1 to run tests that write data");
test.setTimeout(120_000);

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("post, edit, reserve, mark sold and delete an ad", async ({ page }) => {
  const title = `e2e_ Honda Activa 6G test ${Date.now()}`;
  page.on("dialog", (d) => d.accept());

  await page.goto("/post");
  await page.locator('input[type="file"]').setInputFiles({ name: "e2e.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("img", { name: "Photo 1" })).toBeVisible();
  await page.getByRole("button", { name: "Next: details" }).click();

  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Category: Bikes?" }).click();
  await page.getByLabel("Price in rupees").fill("50000");
  await page.getByLabel("City").selectOption({ label: "Pune" });
  await page.getByRole("checkbox", { name: /I accept the terms/ }).check();
  await page.getByRole("button", { name: "Post my ad" }).click();

  await expect(page).toHaveURL(/\/l\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  const adUrl = page.url();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);

  try {
    await page.goto("/me");
    const row = page.locator("li", { hasText: title });
    await row.getByRole("link", { name: "Edit" }).click();
    await page.getByLabel("Price in rupees").fill("45000");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(adUrl, { timeout: 30_000 });
    await expect(page.getByText("₹45,000").first()).toBeVisible();

    await page.goto("/me");
    await row.getByRole("button", { name: "Reserve" }).click();
    await expect(row.getByText("Reserved", { exact: true })).toBeVisible();

    await row.getByRole("button", { name: "Mark sold" }).click();
    await expect(row.getByText("Sold", { exact: true })).toBeVisible();
  } finally {
    await page.goto("/me");
    const row = page.locator("li", { hasText: title });
    if (await row.count()) {
      await row.getByRole("button", { name: "Delete" }).click();
      // The list refreshes after the server action, which can take a while on a cold dev server.
      await expect(row).toHaveCount(0, { timeout: 20_000 });
    }
  }
});
