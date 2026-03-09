import { env } from "@/config/env";
import { UserAddresses } from "@/models/user-address.schema";
import { UserProfiles } from "@/models/user-profile.schema";
import logger from "@/utils/logger";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, {
  schema: { UserProfiles, UserAddresses },
});

export const connectDB = async (): Promise<void> => {
  try {
    await client`SELECT 1`;
    logger.info("Database connected");
  } catch (error) {
    logger.error({ error }, "Database connection failed");
    process.exit(1);
  }
};
