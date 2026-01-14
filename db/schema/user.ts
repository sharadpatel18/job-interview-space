import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "platform_admin",
  "company_admin",
  "company_interviewer",
  "candidate",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    /* Auth & Identity */
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash"), // nullable for OAuth
    authProvider: text("auth_provider").default("credentials"),

    /* Profile */
    fullName: text("full_name").notNull(),
    avatarUrl: text("avatar_url"),

    /* Role & Access */
    role: userRoleEnum("role").notNull(),

    /* Status */
    isActive: boolean("is_active").default(true).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),

    /* Metadata */
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
  })
);
