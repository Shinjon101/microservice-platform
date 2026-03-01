import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env";
import { userCredentials } from "./user-creds.schema";
import logger from "../utils/logger";

export const client = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {},
});

export const db = drizzle(client, {
  schema: { userCredentials },
});

export async function connectDB() {
  try {
    await client`SELECT 1`;
    logger.info(
      {
        host: new URL(env.DATABASE_URL).hostname,
        database: new URL(env.DATABASE_URL).pathname.slice(1),
      },
      "Database connected successfully",
    );
  } catch (error) {
    logger.error({ error }, "Database connection failed");
    process.exit(1);
  }
}
