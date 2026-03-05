import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";
import { HttpError } from "@ecommerce-platform/common";

import logger from "@/utils/logger";

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error({ err }, "Unhandled error occurred");
  if (err instanceof HttpError) {
    // Expected operational error (validation failed, not found, etc.)
    if (err.statusCode >= 500) {
      logger.error(
        { err, path: req.path, method: req.method },
        "Internal Server Error",
      );
    } else {
      logger.warn(
        {
          statusCode: err.statusCode,
          message: err.message,
          path: req.path,
        },
        "Operational error occurred",
      );
    }

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details && { details: err.details }),
    });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};
