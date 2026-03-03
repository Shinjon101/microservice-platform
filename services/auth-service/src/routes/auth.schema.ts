import { z } from "@ecommerce-platform/common";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    displayName: z.string().min(2).max(50),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});

export const revokeSchema = z.object({
  body: z.object({
    userId: z.string().uuid(),
  }),
});
