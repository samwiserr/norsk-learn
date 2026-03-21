/**
 * Shared Upstash Redis client for rate limiting, session snapshots, etc.
 */
import { createLogger } from "@/lib/logger";

const log = createLogger("UpstashRedis");

let redisClient: import("@upstash/redis").Redis | null = null;

export function getUpstashRedis(): import("@upstash/redis").Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch {
    log.warn("Failed to initialize Upstash Redis client");
    return null;
  }
}
