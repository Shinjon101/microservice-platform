import "dotenv/config";

import { createEnv, z } from "@ecommerce-platform/common";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  AUTH_SERVICE_PORT: z.coerce.number().int().min(0).max(65535).default(4003),
  DATABASE_URL: z.string().url(),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRATION: z.string().default("7d"),
  JWT_ACCESS_EXPIRATION: z.string().default("15m"),
});

type EnvType = z.infer<typeof envSchema>;

export const env: EnvType = createEnv(envSchema, {
  serviceName: "auth-service",
});

export type Env = typeof env;
