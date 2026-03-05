import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { createLogger } from "@ecommerce-platform/common";
import { env } from "@/config/env";
import { authRateLimit } from "@/middlewares/rate-limit";

const logger = createLogger({ name: "gateway:proxy" });

/**
 * Creates a proxy middleware that:
 * - Forwards requests to the target service
 * - Rewrites the Host header (changeOrigin)
 * - Logs proxy errors without crashing the gateway
 */
const createServiceProxy = (target: string, serviceName: string) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        // Type cast needed because http-proxy-middleware types are loose here
        const response = res as import("express").Response;

        logger.error(
          { err, target, serviceName },
          `Proxy error forwarding to ${serviceName}`,
        );

        // Only send a response if headers haven't been sent yet
        if (!response.headersSent) {
          response.status(502).json({
            success: false,
            message: `${serviceName} is currently unavailable`,
          });
        }
      },
    },
  });
};

export const createRouter = (): Router => {
  const router = Router();

  /**
   * Auth routes — public (login/register/refresh) + protected (logout, me)
   * Extra rate limiting on auth routes to prevent brute force attacks.
   */
  router.use(
    "/auth",
    authRateLimit,
    createServiceProxy(env.AUTH_SERVICE_URL, "auth-service"),
  );

  /* 
  router.use(
    "/users",
    createServiceProxy(env.USER_SERVICE_URL, "user-service"),
  );

  router.use(
    "/products",
    createServiceProxy(env.PRODUCT_SERVICE_URL, "product-service"),
  );


  router.use(
    "/orders",
    createServiceProxy(env.ORDER_SERVICE_URL, "order-service"),
  );

 
  router.use(
    "/payments",
    createServiceProxy(env.PAYMENT_SERVICE_URL, "payment-service"),
  );

 
  router.use(
    "/notifications",
    createServiceProxy(env.NOTIFICATION_SERVICE_URL, "notification-service"),
  ); */

  return router;
};
