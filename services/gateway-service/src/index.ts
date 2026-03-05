import "dotenv/config";
import { env } from "@/config/env";
import { createApp } from "@/app";
import { connectRedis, disconnectRedis } from "@/lib/redis";
import { createLogger } from "@ecommerce-platform/common";

const logger = createLogger({ name: "gateway-service" });

const start = async () => {
  // Connect to Redis before starting the server.
  // The gateway can still work if Redis fails (rate limiting fails-open),
  // but we want to know about it immediately at startup.
  try {
    await connectRedis();
  } catch (err) {
    logger.warn(
      { err },
      "Redis connection failed at startup — rate limiting will be skipped",
    );
  }

  const app = createApp();
  const server = app.listen(env.GATEWAY_SERVICE_PORT, () => {
    logger.info(
      { port: env.GATEWAY_SERVICE_PORT, nodeEnv: env.NODE_ENV },
      "Gateway service started",
    );
  });

  /**
   * Graceful shutdown — when Kubernetes sends SIGTERM (during pod termination),
   * we stop accepting new connections and wait for in-flight requests to finish.
   * Without this, you get 502 errors during deployments.
   */
  const shutdown = async (signal: string) => {
    logger.info(
      { signal },
      "Shutdown signal received, starting graceful shutdown",
    );

    server.close(async () => {
      logger.info("HTTP server closed");

      await disconnectRedis();

      logger.info("Graceful shutdown complete");
      process.exit(0);
    });

    // Force exit after 10s if requests don't finish
    setTimeout(() => {
      logger.error("Graceful shutdown timeout — forcing exit");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Crash on unhandled promise rejections rather than silently corrupting state
  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled promise rejection");
    process.exit(1);
  });
};

start().catch((err) => {
  logger.error({ err }, "Failed to start gateway service");
  process.exit(1);
});
