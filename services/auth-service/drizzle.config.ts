import { defineConfig } from "drizzle-kit";

import { env } from "./src/config/env";

export default defineConfig({
  schema: "./src/db/user-creds.schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
});
