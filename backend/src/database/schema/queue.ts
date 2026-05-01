import { pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

const taskStatusEnum = pgEnum("queue_status", [
	"claim",
	"pending",
	"failed",
	"complete",
]);

export const taskTable = pgTable("worker_queue", {
	id: serial("id").primaryKey().unique(),
	status: taskStatusEnum("status"),

	chapterPageId: text().notNull(),
	chapterPageSubtitlesId: text().notNull(),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});
