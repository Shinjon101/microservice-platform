import Redis from "ioredis";
import { env } from "@/config/env";
import logger from "@/utils/logger";

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (redisClient) return redisClient;

  redisClient = new Redis(env.REDIS_URL, {
    // Reconnect with exponential backoff, max 30s
    retryStrategy(times) {
      const delay = Math.min(times * 200, 30_000);
      logger.warn({ attempt: times, delayMs: delay }, "Redis reconnecting");
      return delay;
    },
    // Don't crash the app on connection failure — gateway can still proxy
    // requests, just without rate limiting and caching
    lazyConnect: true,
  });

  redisClient.on("connect", () => {
    logger.info("Redis connected");
  });

  redisClient.on("error", (err) => {
    logger.error({ err }, "Redis error");
  });

  return redisClient;
};

export const connectRedis = async (): Promise<void> => {
  const client = getRedisClient();
  await client.connect();
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis disconnected");
  }
};
