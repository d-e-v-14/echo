import { expect, test } from "@playwright/test";

test.describe("landing page smoke", () => {
  test("responds and renders the Echo landing page", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });

    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(400);

    await expect(page).toHaveTitle(/Echo/i);
    await expect(page.locator("h1").first()).toBeVisible();
  });
});
