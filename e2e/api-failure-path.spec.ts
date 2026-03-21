import { test, expect } from "@playwright/test";

test.describe("API failure path smoke", () => {
  test("shows user-friendly error when /api/conversation fails", async ({ page }) => {
    await page.route("**/api/initial-question", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          welcomeMessage: "Welcome!",
          firstQuestion: "What is your name?",
        }),
      });
    });

    await page.route("**/api/conversation", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          type: "API",
          error: "Service temporarily unavailable",
          code: "UPSTREAM_ERROR",
          retryable: false,
        }),
      });
    });

    await page.goto("/level-selection");
    await page.getByText("A1").first().click();
    await page.waitForFunction(
      () => JSON.parse(window.localStorage.getItem("norsk_cefr_level") ?? "null") === "A1"
    );
    await page.goto("/writing");

    await expect(page.getByText("How would you like to practice?")).toBeVisible({ timeout: 15_000 });
    await page.getByText("Free Conversation").click();

    await expect(page.getByText(/temporarily unavailable/i)).toBeVisible({ timeout: 15_000 });
  });
});

