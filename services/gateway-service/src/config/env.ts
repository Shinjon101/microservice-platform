import "dotenv/config";

import { createEnv, z } from "@ecommerce-platform/common";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  GATEWAY_SERVICE_PORT: z.coerce.number().int().min(0).max(65535).default(4000),

  AUTH_SERVICE_URL: z.string().url().default("http://localhost:4003"),
  USER_SERVICE_URL: z.string().url().default("http://localhost:4004"),
  PRODUCT_SERVICE_URL: z.string().url().default("http://localhost:4005"),
  ORDER_SERVICE_URL: z.string().url().default("http://localhost:4006"),
  PAYMENT_SERVICE_URL: z.string().url().default("http://localhost:4007"),
  NOTIFICATION_SERVICE_URL: z.string().url().default("http://localhost:4008"),

  REDIS_URL: z.string().url().default("redis://localhost:6379"),

  ACCESS_TOKEN_SECRET: z.string().min(32),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100), // per window
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(10),
});

type EnvType = z.infer<typeof envSchema>;

export const env: EnvType = createEnv(envSchema, {
  serviceName: "gateway-service",
});

export type Env = typeof env;
