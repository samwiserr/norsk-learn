/**
 * Simple in-memory rate limiting
 * For production, consider using Redis or a dedicated rate limiting service
 */

import { config } from './config';

interface RateLimitResult {
  success: boolean;
  remaining?: number;
  retryAfter?: number;
}

// In-memory store for rate limiting
// In production, this should be replaced with Redis or similar
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @returns Rate limit result
 */
export async function rateLimit(identifier: string): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const maxRequests = config.rateLimit.maxRequests;

  // Get or create rate limit entry
  let entry = rateLimitStore.get(identifier);

  // If no entry or window has expired, create new entry
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(identifier, entry);
    return {
      success: true,
      remaining: maxRequests - 1,
    };
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      success: false,
      remaining: 0,
      retryAfter,
    };
  }

  // Update store
  rateLimitStore.set(identifier, entry);

  return {
    success: true,
    remaining: maxRequests - entry.count,
  };
}

/**
 * Reset rate limit for an identifier (useful for testing)
 * @param identifier - Identifier to reset
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get current rate limit status for an identifier
 * @param identifier - Identifier to check
 * @returns Current rate limit status
 */
export function getRateLimitStatus(identifier: string): {
  count: number;
  remaining: number;
  resetTime: number;
} | null {
  const entry = rateLimitStore.get(identifier);
  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now > entry.resetTime) {
    return null;
  }

  return {
    count: entry.count,
    remaining: Math.max(0, config.rateLimit.maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

