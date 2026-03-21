import { test, expect, type Page } from "@playwright/test";

/**
 * Smoke checks for redesigned shells and gates (no API dependencies).
 */
test.describe("Shell routes", () => {
  test("language selection renders", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("norsk_ui_language");
      localStorage.removeItem("norsk_cefr_level");
    });
    await page.goto("/language-selection");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

});

test.describe("Shell routes with onboarding complete", () => {
  /** Must run on the same `page` instance before `goto` (context-level init can miss the first navigation in some setups). */
  async function seedOnboardingStorage(page: Page) {
    await page.addInitScript(() => {
      localStorage.setItem("norsk_ui_language", JSON.stringify("en"));
      localStorage.setItem("norsk_cefr_level", JSON.stringify("A1"));
    });
  }

  test("speaking page loads when setup is complete", async ({ page }) => {
    await seedOnboardingStorage(page);
    await page.goto("/speaking");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /(start|stop) speaking session/i })).toBeVisible();
  });

  test("settings page loads when setup is complete", async ({ page }) => {
    await seedOnboardingStorage(page);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible({ timeout: 15_000 });
  });
});
