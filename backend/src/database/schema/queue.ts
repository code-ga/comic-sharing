import {
	jsonb,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const taskStatusEnum = pgEnum("queue_status", [
	"claim",
	"pending",
	"failed",
	"complete",
]);

export const taskTable = pgTable("worker_queue", {
	id: serial("id").primaryKey().unique(),
	status: taskStatusEnum("status"),

	chapterPageId: serial().notNull(),
	chapterPageSubtitlesId: serial().notNull(),
	metadata: jsonb().$type<{ isInPaint: boolean }>(),
	stepStatus: jsonb().$type<{ ocr: boolean }>(),
	stepResult: jsonb().$type<{ ocr: any }>(),

	errorLog: text(),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});
