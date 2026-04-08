# Testing Plan
**Skills applied:** `tdd-guide` + `playwright-pro`  
**Test runners:** Jest (unit/integration) + Playwright (E2E)  
**Date:** 2026-04-08

---

## Test Coverage Targets

| Layer | Target | Current |
|---|---|---|
| Unit (lib functions) | 90% | — |
| Integration (API routes) | 80% | — |
| E2E (critical user flows) | Key flows covered | — |

---

## Unit Test Stubs (`__tests__/`)

### CEFR Progress (`__tests__/lib/cefr-progress.test.ts`)

```typescript
import { getCurrentCEFRLevel, clampDelta, CEFR_THRESHOLDS } from "@/lib/cefr-progress"

describe("getCurrentCEFRLevel", () => {
  it("returns A1 for score 0", () => expect(getCurrentCEFRLevel(0)).toBe("A1"))
  it("returns A2 at threshold", () => expect(getCurrentCEFRLevel(250)).toBe("A2"))
  it("returns B1 at threshold", () => expect(getCurrentCEFRLevel(500)).toBe("B1"))
  it("returns B2 at threshold", () => expect(getCurrentCEFRLevel(750)).toBe("B2"))
  it("returns B2 for max score", () => expect(getCurrentCEFRLevel(1000)).toBe("B2"))
})

describe("clampDelta", () => {
  it("clamps above max to 20", () => expect(clampDelta(30)).toBe(20))
  it("clamps below min to -10", () => expect(clampDelta(-15)).toBe(-10))
  it("passes through valid delta", () => expect(clampDelta(5)).toBe(5))
})
```

### AI Response Parser (`__tests__/lib/conversation-prompts.test.ts`)

```typescript
import { buildConversationPrompt } from "@/lib/conversation-prompts"

describe("buildConversationPrompt", () => {
  it("includes CEFR level in prompt", () => {
    const prompt = buildConversationPrompt({
      userInput: "Jeg heter Per",
      cefrLevel: "A1",
      currentProgress: 50,
      conversationHistory: [],
    })
    expect(prompt).toContain("A1")
  })

  it("includes language name", () => {
    const prompt = buildConversationPrompt({
      userInput: "test",
      cefrLevel: "A1",
      currentProgress: 0,
      language: "de",
      conversationHistory: [],
    })
    expect(prompt).toContain("German")
  })

  it("includes exercise instructions for translation mode", () => {
    const prompt = buildConversationPrompt({
      userInput: "test",
      cefrLevel: "B1",
      currentProgress: 500,
      exerciseMode: "translation",
      conversationHistory: [],
    })
    expect(prompt).toContain("TRANSLATION")
  })
})
```

### Input Sanitization (`__tests__/lib/sanitize.test.ts`)

```typescript
import { sanitizeUserMessage } from "@/lib/sanitize"

describe("sanitizeUserMessage", () => {
  it("strips HTML tags", () => expect(sanitizeUserMessage("<script>xss</script>hello")).toBe("hello"))
  it("trims whitespace", () => expect(sanitizeUserMessage("  hello  ")).toBe("hello"))
  it("rejects empty string", () => expect(() => sanitizeUserMessage("")).toThrow())
  it("rejects string over 2000 chars", () => expect(() => sanitizeUserMessage("a".repeat(2001))).toThrow())
})
```

---

## Integration Test Stubs (`__tests__/api/`)

### Conversation Route (`__tests__/api/conversation.test.ts`)

```typescript
import { POST } from "@/app/api/conversation/route"
import { NextRequest } from "next/server"

// Mock Firebase auth and Gemini SDK
jest.mock("@/lib/firebase/auth", () => ({ verifyIdToken: jest.fn().mockResolvedValue({ uid: "user-1" }) }))
jest.mock("@google/generative-ai")

describe("POST /api/conversation", () => {
  it("returns 401 when no auth token", async () => {
    const req = new NextRequest("http://localhost/api/conversation", { method: "POST", body: JSON.stringify({}) })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 400 when userInput missing", async () => {
    const req = new NextRequest("http://localhost/api/conversation", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ cefrLevel: "A1" }),  // missing userInput
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns AI response shape", async () => {
    // ... mock Gemini to return valid JSON
    // assert response has: summary, fixes, nextQuestion, progressDelta
  })
})
```

### Stripe Webhook (`__tests__/api/webhooks-stripe.test.ts`)

```typescript
describe("POST /api/webhooks/stripe", () => {
  it("rejects invalid signature", async () => { /* 400 */ })
  it("handles checkout.session.completed idempotently", async () => { /* upsert subscription */ })
  it("handles customer.subscription.deleted → sets plan to free", async () => { /* verify planName = free */ })
})
```

---

## E2E Tests (`e2e/`)

### Auth Flow (`e2e/auth.spec.ts`)

```typescript
import { test, expect } from "@playwright/test"

test("user can sign up with email", async ({ page }) => {
  await page.goto("/auth")
  await page.fill('[name="email"]', "test@example.com")
  await page.fill('[name="password"]', "Password123!")
  await page.click('[data-testid="signup-btn"]')
  await expect(page).toHaveURL(/\/language-selection/)
})

test("redirects unauthenticated user from /writing to /auth", async ({ page }) => {
  await page.goto("/writing")
  await expect(page).toHaveURL(/\/auth/)
})
```

### Chat Flow (`e2e/chat.spec.ts`)

```typescript
test("user can start a session and send a message", async ({ page }) => {
  // Sign in (use stored auth state)
  await page.goto("/writing")
  await page.fill('[data-testid="chat-input"]', "Jeg heter Per")
  await page.click('[data-testid="send-btn"]')
  await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()
})

test("CEFR progress bar updates after message", async ({ page }) => {
  // ... assert progress delta visible after AI response
})
```

### Stripe Checkout Flow (`e2e/billing.spec.ts`)

```typescript
test("user can upgrade to Pro via Stripe Checkout", async ({ page }) => {
  await page.goto("/settings/billing")
  await page.click('[data-testid="upgrade-pro-btn"]')
  // Stripe Checkout opens
  await expect(page).toHaveURL(/checkout\.stripe\.com/)
})
```

### Tutor Booking Flow (`e2e/booking.spec.ts`)

```typescript
test("user can view tutor list and open profile", async ({ page }) => {
  await page.goto("/tutors")
  await expect(page.locator('[data-testid="tutor-card"]').first()).toBeVisible()
  await page.locator('[data-testid="tutor-card"]').first().click()
  await expect(page.locator('[data-testid="book-btn"]')).toBeVisible()
})
```

---

## Playwright Config (`playwright.config.ts` — existing file)

Key settings to verify:
- `baseURL`: `http://localhost:3000`
- `storageState`: `e2e/.auth/user.json` — pre-authenticated state for most tests
- `retries`: 2 in CI, 0 locally
- Reporters: `html` + `github` in CI

---

## CI Integration

```yaml
# Run in GitHub Actions (see CI-CD.md)
- name: Run unit tests
  run: npm test -- --coverage

- name: Run E2E tests
  run: npx playwright test
  env:
    CI: true
```
