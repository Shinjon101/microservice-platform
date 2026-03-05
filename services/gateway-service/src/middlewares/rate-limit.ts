import type { NextFunction, Request, Response } from "express";
import { HttpError, createLogger } from "@ecommerce-platform/common";
import { getRedisClient } from "@/lib/redis";
import { env } from "@/config/env";

const logger = createLogger({ name: "gateway:rate-limit" });

interface RateLimitConfig {
  /** How long the window is in milliseconds */
  windowMs: number;
  /** Max requests allowed per window */
  maxRequests: number;
  /** Key prefix for Redis — lets you have different limits for different route groups */
  keyPrefix: string;
}

/**
 * Sliding window rate limiter backed by Redis.
 *
 * Each request increments a counter in Redis keyed by IP + prefix.
 * The counter auto-expires after one window so the key cleans itself up.
 *
 * If Redis is unreachable (network issue, restart), rate limiting is skipped
 * with a warning — it's better to serve requests than to hard-fail because
 * Redis is down. This is called "fail-open" and is the right call for a gateway.
 *
 * Sets standard rate-limit response headers so clients can back off gracefully:
 * - X-RateLimit-Limit: max requests allowed
 * - X-RateLimit-Remaining: requests left in current window
 * - X-RateLimit-Reset: Unix timestamp when window resets
 */
const createRateLimiter = (config: RateLimitConfig) => {
  const { windowMs, maxRequests, keyPrefix } = config;
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? "unknown";
    const key = `rate_limit:${keyPrefix}:${ip}`;
    const correlationId = res.locals.correlationId as string;

    let redis;
    try {
      redis = getRedisClient();
    } catch {
      // Redis not initialized — skip rate limiting, don't crash
      logger.warn(
        { correlationId, ip },
        "Redis unavailable, skipping rate limit",
      );
      return next();
    }

    try {
      // INCR returns the new count. If the key didn't exist, it's created at 1.
      const currentCount = await redis.incr(key);

      // Set expiry only on the first request in a window (when count hits 1)
      // This avoids resetting the window on every request.
      if (currentCount === 1) {
        await redis.expire(key, windowSeconds);
      }

      const ttl = await redis.ttl(key);
      const resetTime = Math.floor(Date.now() / 1000) + ttl;
      const remaining = Math.max(0, maxRequests - currentCount);

      // Set headers regardless of whether limit is hit (good client UX)
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", resetTime);

      if (currentCount > maxRequests) {
        logger.warn(
          { correlationId, ip, key, currentCount, maxRequests },
          "Rate limit exceeded",
        );
        res.setHeader("Retry-After", ttl);
        return next(
          new HttpError(429, "Too many requests. Please try again later."),
        );
      }

      next();
    } catch (err) {
      // Redis operation failed — fail-open
      logger.error(
        { correlationId, err, key },
        "Rate limit check failed, failing open",
      );
      next();
    }
  };
};

/** Global rate limit — applies to every request */
export const globalRateLimit = createRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  keyPrefix: "global",
});

/** Stricter limit for auth routes to prevent brute force / credential stuffing */
export const authRateLimit = createRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_AUTH_MAX,
  keyPrefix: "auth",
});
