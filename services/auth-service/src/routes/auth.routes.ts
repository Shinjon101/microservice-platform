import { Router } from "express";
import { validateRequest } from "@ecommerce-platform/common";
import {
  loginHandler,
  registerHandler,
  refreshHandler,
  revokeHandler,
} from "@/controllers/auth.controller";

import {
  loginSchema,
  registerSchema,
  refreshSchema,
  revokeSchema,
} from "@/routes/auth.schema";

export const authRouter: Router = Router();

authRouter.post(
  "/register",
  validateRequest({ body: registerSchema.shape.body }),
  registerHandler,
);
authRouter.post(
  "/login",
  validateRequest({ body: loginSchema.shape.body }),
  loginHandler,
);
authRouter.post(
  "/refresh",
  validateRequest({ body: refreshSchema.shape.body }),
  refreshHandler,
);
authRouter.post(
  "/revoke",
  validateRequest({ body: revokeSchema.shape.body }),
  revokeHandler,
);
