/* import { Request, Response, NextFunction } from "express";
import { HttpError } from "@ecommerce-platform/common";
import { AccessTokenPayload } from "@/utils/jwt";

// Extend Express Request to include the user payload
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export const requireFreshAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = req.user;

  if (!user) {
    return next(new HttpError(401, "Unauthorized"));
  }

  if (user.authMethod !== "credentials") {
    return next(new HttpError(403, "This action requires a fresh login"));
  }

  next();
};
 */
