import { rateLimit, resetRateLimit, getRateLimitStatus } from "@/lib/rate-limiting";

jest.mock("@/lib/config", () => ({
  config: {
    rateLimit: {
      maxRequests: 3,
      windowMs: 10_000,
    },
  },
}));

describe("rateLimit (in-memory)", () => {
  const id = "test-user-" + Date.now();

  afterEach(() => {
    resetRateLimit(id);
  });

  it("allows requests within the limit", async () => {
    const r1 = await rateLimit(id);
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);
  });

  it("blocks requests over the limit", async () => {
    await rateLimit(id);
    await rateLimit(id);
    await rateLimit(id);
    const r4 = await rateLimit(id);
    expect(r4.success).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.retryAfter).toBeGreaterThan(0);
  });

  it("getRateLimitStatus returns current state", async () => {
    await rateLimit(id);
    const status = getRateLimitStatus(id);
    expect(status).not.toBeNull();
    expect(status!.count).toBe(1);
    expect(status!.remaining).toBe(2);
  });

  it("resetRateLimit clears the counter", async () => {
    await rateLimit(id);
    resetRateLimit(id);
    const status = getRateLimitStatus(id);
    expect(status).toBeNull();
  });
});
