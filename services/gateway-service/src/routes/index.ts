import { Router } from "express";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";

import { env } from "@/config/env";
import { authRateLimit } from "@/middlewares/rate-limit";

import logger from "@/utils/logger";
/**
 * WHY pathPrefix / pathRewrite:
 * When Express matches router.use("/auth", proxy), it strips the "/auth"
 * prefix before handing the request to the proxy middleware. So a request for
 * POST /auth/register arrives at HPM as POST /register.
 * The auth service has no /register route — only /auth/register — so it 404s.
 * pathRewrite: { "^/": "/<prefix>/" } restores the stripped segment before
 * HPM forwards the request upstream.
 *
 * WHY fixRequestBody:
 * express.json() consumes the raw request stream to parse the body. HPM then
 * tries to forward that same stream — but it's already been read and is empty.
 * fixRequestBody re-serializes req.body back onto the outgoing proxy request
 * so downstream services actually receive the JSON payload.
 */
const createServiceProxy = (
  target: string,
  serviceName: string,
  pathPrefix: string,
) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { "^/": `/${pathPrefix}/` },
    on: {
      proxyReq: (proxyReq, req) => {
        fixRequestBody(proxyReq, req as import("express").Request);
      },
      error: (err, req, res) => {
        const response = res as import("express").Response;
        const correlationId = response.locals?.correlationId as string;

        logger.error(
          { err, target, serviceName, correlationId },
          `Proxy error forwarding to ${serviceName}`,
        );

        if (!response.headersSent) {
          response.status(502).json({
            success: false,
            message: `${serviceName} is currently unavailable`,
            correlationId,
          });
        }
      },
    },
  });
};

export const createRouter = (): Router => {
  const router = Router();

  // Stricter rate limit on auth to prevent brute force / credential stuffing
  router.use(
    "/auth",
    authRateLimit,
    createServiceProxy(env.AUTH_SERVICE_URL, "auth-service", "auth"),
  );

  router.use(
    "/users",
    createServiceProxy(env.USER_SERVICE_URL, "user-service", "users"),
  );

  router.use(
    "/products",
    createServiceProxy(env.PRODUCT_SERVICE_URL, "product-service", "products"),
  );

  router.use(
    "/orders",
    createServiceProxy(env.ORDER_SERVICE_URL, "order-service", "orders"),
  );

  router.use(
    "/payments",
    createServiceProxy(env.PAYMENT_SERVICE_URL, "payment-service", "payments"),
  );

  router.use(
    "/notifications",
    createServiceProxy(
      env.NOTIFICATION_SERVICE_URL,
      "notification-service",
      "notifications",
    ),
  );

  return router;
};
