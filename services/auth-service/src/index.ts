import "dotenv/config";
import { createApp } from "@/app";
import { env } from "@/config/env";
import logger from "@/utils/logger";
import { connectDB } from "@/db";

const start = async () => {
  await connectDB();

  const app = createApp();

  const server = app.listen(env.AUTH_SERVICE_PORT, () => {
    logger.info(
      { port: env.AUTH_SERVICE_PORT, nodeEnv: env.NODE_ENV },
      "Auth service started",
    );
  });

  const shutdown = async (signal: string) => {
    logger.info(
      { signal },
      "Shutdown signal received, starting graceful shutdown",
    );

    server.close(() => {
      logger.info("Graceful shutdown complete");
      process.exit(0);
    });

    // Force exit if in-flight requests don't finish in time
    setTimeout(() => {
      logger.error("Graceful shutdown timeout — forcing exit");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled promise rejection");
    process.exit(1);
  });
};

start().catch((err) => {
  logger.error({ err }, "Failed to start auth service");
  process.exit(1);
});
