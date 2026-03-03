import { pgTable, uuid, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { userCredentials } from "./user-creds.schema";

export const refreshToken = pgTable("refresh_tokens", {
  token_id: uuid("token_id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => userCredentials.id, { onDelete: "cascade" }),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const refreshTokenRelations = relations(refreshToken, ({ one }) => ({
  user: one(userCredentials, {
    fields: [refreshToken.userId],
    references: [userCredentials.id],
  }),
}));
