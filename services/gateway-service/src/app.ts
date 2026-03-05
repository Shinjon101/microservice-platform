import express from "express";
import { globalRateLimit } from "@/middlewares/rate-limit";
import { authenticate } from "@/middlewares/authenticate";
import { errorHandler } from "@/middlewares/error-handler";
import { createRouter } from "@/routes/index";
import helmet from "helmet";
import cors from "cors";

/**
 * Creates the Express app with all middleware and routes configured.
 *
 * Separating createApp() from server startup (index.ts) is a key pattern:
 * - Tests can call createApp() directly without binding to a port
 * - Makes the startup sequence easy to read
 *
 * Middleware execution order (top to bottom):
 * 1. correlationId   — must be first so all other middleware can use the ID
 * 2. requestLogger   — logs on "finish" event, so works across the chain
 * 3. json parser     — parse request bodies before routes need them
 * 4. globalRateLimit — reject abusive clients before doing any real work
 * 5. authenticate    — validate JWT and inject user headers
 * 6. routes          — proxy to downstream services
 * 7. errorHandler    — must be last, catches errors from all above
 */
export const createApp = (): express.Application => {
  const app = express();
  app.use(
    cors({
      origin: "*",
      credentials: true,
    }),
  );
  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- Health check
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "gateway-service" });
  });

  // --- Rate limiting (after health check) ---
  app.use(globalRateLimit);

  // --- Authentication (validates JWT, injects x-user-* headers) ---
  app.use(authenticate);

  // --- Proxy routes to downstream services ---
  app.use(createRouter());

  // --- Error handler (must be last) ---
  app.use(errorHandler);

  return app;
};
