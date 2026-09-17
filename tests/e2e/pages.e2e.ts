import { expect, test } from "@playwright/test";

// Read-only: legal, help and safety pages load, and the footer links to them.
const pages = [
  ["/terms", "Terms of use"],
  ["/privacy", "Privacy policy"],
  ["/grievance", "Grievance officer"],
  ["/safety", "Stay safe on Chowk"],
  ["/help", "Help"],
] as const;

for (const [path, heading] of pages) {
  test(`${path} shows its heading and the footer`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Help and legal" }).getByRole("link", { name: "Privacy" })).toBeVisible();
  });
}

test("grievance page names the officer", async ({ page }) => {
  await page.goto("/grievance");
  await expect(page.getByText("Nikhilvarma Kandula")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "kandulanikhilvarma@gmail.com" })).toHaveAttribute(
    "href",
    "mailto:kandulanikhilvarma@gmail.com",
  );
});

test("posting and chatting send signed-out visitors to sign in and back", async ({ page }) => {
  await page.goto("/post");
  await expect(page).toHaveURL(/\/login\?next=(%2F|\/)post$/);

  await page.goto("/s");
  await page.locator('a[href^="/l/"]').first().click();
  await page.getByRole("link", { name: /Chat with seller|I have this/ }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fmessages%3Flisting%3D[0-9a-f-]{36}$/);

  await page.goBack();
  await page.getByRole("button", { name: "Report this ad" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fl%2F[0-9a-f-]{36}$/);
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("admin queue sends visitors to sign in", async ({ page }) => {
  await page.goto("/admin/reports");
  await expect(page).toHaveURL(/\/login\?next=/);
});
