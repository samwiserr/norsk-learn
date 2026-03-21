import { test, expect } from "@playwright/test";

test.describe("Writing flow smoke", () => {
  test("can start a writing exercise and send a message", async ({ page }) => {
    await page.route("**/api/initial-question", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          welcomeMessage: "Welcome to Norsk Tutor!",
          firstQuestion: "What is your name?",
        }),
      });
    });

    await page.route("**/api/conversation", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          nextQuestion: "What is next?",
          summary: "",
          fixes: [],
          improvedVersion: "",
          progressDelta: 1,
          hint: "Try using a full sentence.",
          meta: { safetyFlags: [] },
          vocabIntroduced: [],
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

    const input = page.locator("input.message-input");
    await expect(input).toBeVisible();
    await input.fill("Hei! Jeg lærer norsk.");

    const sendButton = page.getByRole("button", { name: /send/i });
    await sendButton.click();

    await expect(page.getByText("What is next?").first()).toBeVisible({ timeout: 15_000 });
  });
});

