import { test, expect } from "@playwright/test";

test.describe("Onboarding flow", () => {
  test("redirects to level-selection when no level is set", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/level-selection**");
    expect(page.url()).toContain("/level-selection");
  });

  test("level-selection page shows CEFR levels", async ({ page }) => {
    await page.goto("/level-selection");
    await expect(page.getByText("A1")).toBeVisible();
    await expect(page.getByText("B2")).toBeVisible();
  });

  test("selecting a level navigates to chat", async ({ page }) => {
    await page.goto("/level-selection");
    await page.getByText("A1").first().click();
    const confirmButton = page.getByRole("button", { name: /start|begin|confirm/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    await page.waitForURL("**/", { timeout: 10_000 });
  });
});
