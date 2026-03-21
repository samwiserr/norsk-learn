import { config } from "./config";
import { createLogger } from "./logger";
import { getUpstashRedis } from "@/lib/infra/upstashRedis";

const log = createLogger("RateLimit");

interface RateLimitResult {
  success: boolean;
  remaining?: number;
  retryAfter?: number;
}

// ── In-memory fallback ─────────────────────────────────────────────────

const memStore = new Map<string, { count: number; resetTime: number }>();

let warnedInMemoryProduction = false;

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

async function rateLimitRedis(
  redis: NonNullable<ReturnType<typeof getUpstashRedis>>,
  identifier: string
): Promise<RateLimitResult> {
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
  const redis = getUpstashRedis();
  if (!redis) {
    if (process.env.NODE_ENV === "production" && !warnedInMemoryProduction) {
      warnedInMemoryProduction = true;
      log.warn(
        "Rate limit using in-memory store in production. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for distributed limits and accurate abuse prevention."
      );
    }
    return rateLimitMemory(identifier);
  }
  return rateLimitRedis(redis, identifier);
}

export function resetRateLimit(identifier: string): void {
  memStore.delete(identifier);
  const redis = getUpstashRedis();
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
