import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { HttpError, createLogger } from "@ecommerce-platform/common";
import { env } from "@/config/env";
import logger from "@/utils/logger";

/**
 * Routes that don't require a valid JWT.
 * Method + path prefix format: "METHOD /path"
 */
const PUBLIC_ROUTES: Array<{ method: string; path: string }> = [
  { method: "POST", path: "/auth/register" },
  { method: "POST", path: "/auth/login" },
  { method: "POST", path: "/auth/refresh" },
  { method: "GET", path: "/health" },
];

const isPublicRoute = (method: string, path: string): boolean => {
  return PUBLIC_ROUTES.some(
    (route) =>
      route.method === method &&
      (path === route.path || path.startsWith(route.path + "/")),
  );
};

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: "customer" | "admin";
  authMethod: "credentials" | "refresh";
  iat: number;
  exp: number;
}

/**
 * Validates JWT for protected routes, then injects user identity as headers
 * that downstream services trust without doing their own JWT verification.
 *
 * Security model: the gateway is the trust boundary. Services behind it should
 * only accept requests from the gateway (enforced by Kubernetes NetworkPolicy
 * in production). They read X-User-* headers as gospel.
 *
 * The Authorization header is deleted before proxying — services never see
 * the raw JWT.
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const correlationId = res.locals.correlationId as string;

  // Skip JWT check for public routes
  if (isPublicRoute(req.method, req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(
      new HttpError(401, "Missing or malformed Authorization header"),
    );
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const payload = jwt.verify(
      token,
      env.ACCESS_TOKEN_SECRET,
    ) as AccessTokenPayload;

    // Inject user identity headers for downstream services
    req.headers["x-user-id"] = payload.userId;
    req.headers["x-user-email"] = payload.email;
    req.headers["x-user-role"] = payload.role;
    req.headers["x-auth-method"] = payload.authMethod;

    // Remove JWT — downstream services should not re-verify it
    delete req.headers.authorization;

    logger.debug(
      { correlationId, userId: payload.userId, path: req.path },
      "Request authenticated",
    );

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new HttpError(401, "Access token expired"));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new HttpError(401, "Invalid access token"));
    }

    logger.error(
      { correlationId, err: error },
      "Unexpected JWT verification error",
    );
    next(new HttpError(500, "Authentication failed"));
  }
};
