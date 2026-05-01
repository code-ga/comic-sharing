import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import type { OCRPageOutput } from "../../types";

export const taskTable = pgTable("worker_queue", {
	id: serial("id").primaryKey().unique(),
	status: text()
		.notNull()
		.$type<"pending" | "claimed" | "completed" | "failed">()
		.default("pending"),

	chapterPageId: serial().notNull(),
	chapterPageSubtitlesId: serial().notNull(),
	metadata: jsonb().$type<{ isInPaint: boolean }>(),
	stepStatus: jsonb()
		.$type<{ ocr?: boolean; metadataExtraction?: boolean }>()
		.default({}),
	stepResult: jsonb()
		.$type<{ ocr?: OCRPageOutput; metadataExtraction?: unknown }>()
		.default({}),

	errorLog: text(),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});
