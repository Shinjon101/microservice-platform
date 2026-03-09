import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const UserProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(), //Payload from auth serice
  displayName: varchar("display_name", { length: 255 }).notNull(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  bio: text("bio"),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserProfile = typeof UserProfiles.$inferSelect;
export type NewUserProfile = typeof UserProfiles.$inferInsert;
