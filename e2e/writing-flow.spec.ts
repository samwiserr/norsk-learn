import { test, expect, type Page } from "@playwright/test";

async function stubWritingApis(page: Page) {
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
}

async function gotoWritingA1(page: Page) {
  // Seed setup gate state (same shape as lib/storage saveToLocalStorage) — avoids flaky level-selection timing.
  await page.addInitScript(() => {
    localStorage.setItem("norsk_ui_language", JSON.stringify("en"));
    localStorage.setItem("norsk_cefr_level", JSON.stringify("A1"));
  });
  await page.goto("/writing");
  await expect(page.getByText("How would you like to practice?")).toBeVisible({ timeout: 15_000 });
}

async function sendFirstMessage(page: Page, text: string) {
  const input = page.locator("input.message-input");
  await expect(input).toBeVisible();
  await input.fill(text);
  await page.getByRole("button", { name: /send/i }).click();
  await expect(page.getByText("What is next?").first()).toBeVisible({ timeout: 15_000 });
}

test.describe("Writing flow smoke", () => {
  test("free conversation: send a message", async ({ page }) => {
    await stubWritingApis(page);
    await gotoWritingA1(page);
    await page.getByText("Free Conversation").click();
    await sendFirstMessage(page, "Hei! Jeg lærer norsk.");
  });

  test("translation practice: send a message", async ({ page }) => {
    await stubWritingApis(page);
    await gotoWritingA1(page);
    await page.getByText("Translation Practice").click();
    await sendFirstMessage(page, "Jeg oversetter denne setningen.");
  });

  test("grammar drill: pick topic and send a message", async ({ page }) => {
    await stubWritingApis(page);
    await gotoWritingA1(page);
    await page.getByText("Grammar Drill").click();
    await expect(page.getByText("Choose a grammar focus")).toBeVisible({ timeout: 10_000 });
    await page.getByText("Present Tense (presens)").click();
    await sendFirstMessage(page, "Jeg snakker norsk.");
  });

  test("topic practice: pick topic and send a message", async ({ page }) => {
    await stubWritingApis(page);
    await gotoWritingA1(page);
    await page.getByText("Topic Practice").click();
    await expect(page.getByText("Choose a topic")).toBeVisible({ timeout: 10_000 });
    await page.getByText("Introducing Yourself 👋").click();
    await sendFirstMessage(page, "Hei, jeg heter Anna.");
  });
});

