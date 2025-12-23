import { rateLimit, resetRateLimit, getRateLimitStatus } from '../rate-limiting';

// Mock config
jest.mock('../config', () => ({
  config: {
    rateLimit: {
      maxRequests: 5,
      windowMs: 60000, // 1 minute
    },
  },
}));

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Reset rate limit store before each test
    resetRateLimit('test-ip');
  });

  it('should allow requests within limit', async () => {
    for (let i = 0; i < 5; i++) {
      const result = await rateLimit('test-ip');
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it('should block requests exceeding limit', async () => {
    // Make 5 requests (the limit)
    for (let i = 0; i < 5; i++) {
      await rateLimit('test-ip');
    }

    // 6th request should be blocked
    const result = await rateLimit('test-ip');
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should track different identifiers separately', async () => {
    // Exhaust limit for ip1
    for (let i = 0; i < 5; i++) {
      await rateLimit('ip1');
    }

    // ip2 should still be able to make requests
    const result = await rateLimit('ip2');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('should return status for identifier', () => {
    rateLimit('test-ip');
    const status = getRateLimitStatus('test-ip');
    expect(status).not.toBeNull();
    expect(status?.count).toBe(1);
    expect(status?.remaining).toBe(4);
  });

  it('should return null for non-existent identifier', () => {
    const status = getRateLimitStatus('non-existent');
    expect(status).toBeNull();
  });

  it('should reset rate limit for identifier', async () => {
    // Make some requests
    await rateLimit('test-ip');
    await rateLimit('test-ip');

    // Reset
    resetRateLimit('test-ip');

    // Should start fresh
    const result = await rateLimit('test-ip');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });
});

