import { defineConfig } from "drizzle-kit";

import { env } from "./src/config/env";

export default defineConfig({
  schema: "./src/models/*.schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
});
