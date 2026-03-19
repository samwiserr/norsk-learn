import { config } from './config';
import { createLogger } from './logger';

const log = createLogger("RateLimit");

interface RateLimitResult {
  success: boolean;
  remaining?: number;
  retryAfter?: number;
}

// ── In-memory fallback ─────────────────────────────────────────────────

const memStore = new Map<string, { count: number; resetTime: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memStore.entries()) {
    if (now > value.resetTime) memStore.delete(key);
  }
}, 60_000);

async function rateLimitMemory(identifier: string): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const maxRequests = config.rateLimit.maxRequests;

  let entry = memStore.get(identifier);
  if (!entry || now > entry.resetTime) {
    entry = { count: 1, resetTime: now + windowMs };
    memStore.set(identifier, entry);
    return { success: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return {
      success: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }
  memStore.set(identifier, entry);
  return { success: true, remaining: maxRequests - entry.count };
}

// ── Redis backend (Upstash) ────────────────────────────────────────────

let redisClient: import("@upstash/redis").Redis | null = null;

function getRedis(): import("@upstash/redis").Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch {
    log.warn("Failed to initialize Upstash Redis, falling back to in-memory");
    return null;
  }
}

async function rateLimitRedis(identifier: string): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) return rateLimitMemory(identifier);

  const windowMs = config.rateLimit.windowMs;
  const maxRequests = config.rateLimit.maxRequests;
  const key = `rl:${identifier}`;
  const windowSec = Math.ceil(windowMs / 1000);

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSec);
    }

    if (count > maxRequests) {
      const ttl = await redis.ttl(key);
      return { success: false, remaining: 0, retryAfter: ttl > 0 ? ttl : windowSec };
    }

    return { success: true, remaining: maxRequests - count };
  } catch (err) {
    log.error("Redis rate limit error, falling back to in-memory", err);
    return rateLimitMemory(identifier);
  }
}

// ── Public API ─────────────────────────────────────────────────────────

export async function rateLimit(identifier: string): Promise<RateLimitResult> {
  const redis = getRedis();
  return redis ? rateLimitRedis(identifier) : rateLimitMemory(identifier);
}

export function resetRateLimit(identifier: string): void {
  memStore.delete(identifier);
  const redis = getRedis();
  if (redis) redis.del(`rl:${identifier}`).catch(() => {});
}

export function getRateLimitStatus(identifier: string): {
  count: number;
  remaining: number;
  resetTime: number;
} | null {
  const entry = memStore.get(identifier);
  if (!entry || Date.now() > entry.resetTime) return null;
  return {
    count: entry.count,
    remaining: Math.max(0, config.rateLimit.maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}
