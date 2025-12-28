
import { pgTable, text, integer, boolean, timestamp, index, uniqueIndex, real, numeric } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),

}, (table) => [
  uniqueIndex("user_email_unique").on(table.email),
]);

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
}, (table) => [
  uniqueIndex("session_token_unique").on(table.token),
]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: "date" }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: "date" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});


export const links = pgTable("links", {
  linkId: text("link_id").primaryKey().notNull(),
  accountId: text("account_id").notNull(),
  destinations: text("destinations").notNull(),
  created: timestamp("created", { mode: "date" }).defaultNow().notNull(),
  updated: timestamp("updated", { mode: "date" }).defaultNow().notNull(),
  name: text("name").notNull(),
});

export const linkClicks = pgTable("link_clicks", {
  id: text("id").notNull(),
  accountId: text("account_id").notNull(),
  country: text("country"),
  destination: text("destination").notNull(),
  clickedTime: timestamp("clicked_time", { mode: "date" }).notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
}, (table) => [
  index("idx_link_clicks_id").on(table.id),
]);

export const destinationEvaluations = pgTable("destination_evaluations", {
  id: text("id").primaryKey().notNull(),
  linkId: text("link_id").notNull(),
  accountId: text("account_id").notNull(),
  destinationUrl: text("destination_url").notNull(),
  status: text("status").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("idx_destination_evaluations_account_time").on(table.accountId, table.createdAt),
]);