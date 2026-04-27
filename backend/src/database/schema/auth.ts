import { createId } from "@paralleldrive/cuid2";
import { timestamp } from "drizzle-orm/pg-core/columns/timestamp";
import { varchar } from "drizzle-orm/pg-core/columns/varchar";
import { pgTable } from "drizzle-orm/pg-core/table";

export const user = pgTable("user", {
	id: varchar("id")
		.$defaultFn(() => createId())
		.primaryKey(),
	username: varchar("username").notNull().unique(),
	password: varchar("password").notNull(),
	email: varchar("email").notNull().unique(),
	salt: varchar("salt", { length: 64 }).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
}); 