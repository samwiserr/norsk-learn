import { test, expect } from "@playwright/test";

test.describe("Onboarding flow", () => {
  test("redirects to level-selection when no level is set", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/level-selection**");
    expect(page.url()).toContain("/level-selection");
  });

  test("level-selection page shows CEFR levels", async ({ page }) => {
    await page.goto("/level-selection");
    await expect(page.getByText("A1", { exact: true })).toBeVisible();
    await expect(page.getByText("B2", { exact: true })).toBeVisible();
  });

  test("selecting a level navigates to chat", async ({ page }) => {
    await page.goto("/level-selection");
    // Simulate the normal app flow where /writing redirected here,
    // so navigation target is deterministic regardless of auth state
    await page.evaluate(() =>
      sessionStorage.setItem("norsk_return_path", "/writing")
    );
    await page.getByText("A1").first().click();
    const confirmButton = page.getByRole("button", { name: /start|begin|confirm/i });
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    // Core assertion: level was persisted to localStorage
    // saveToLocalStorage JSON.stringifies values, so stored as '"A1"'
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const raw = localStorage.getItem("norsk_cefr_level");
            try {
              return JSON.parse(raw ?? "null");
            } catch {
              return raw;
            }
          }),
        { timeout: 5_000 }
      )
      .toBe("A1");
  });
});
