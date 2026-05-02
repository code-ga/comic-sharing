import {
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import type { OCRPageOutput } from "../../types";

export const taskTable = pgTable("worker_queue", {
	id: serial("id").primaryKey().unique(),
	taskType: text("task_type")
		.notNull()
		.$type<"page" | "chapter">()
		.default("page"),
	status: text()
		.notNull()
		.$type<"pending" | "claimed" | "completed" | "failed">()
		.default("pending"),

	chapterId: integer("chapter_id"), // Used for chapter tasks
	chapterPageId: serial().notNull(), // Used for page tasks
	chapterPageSubtitlesId: serial().notNull(), // Used for page tasks
	metadata: jsonb().$type<{ isInPaint: boolean }>(),
	stepStatus: jsonb()
		.$type<{
			ocr: boolean;
			metadataExtraction: boolean;
			chapterSummary?: boolean;
		}>()
		.default({ ocr: false, metadataExtraction: false })
		.notNull(),
	stepResult: jsonb()
		.$type<{
			ocr?: OCRPageOutput;
			metadataExtraction?: unknown;
			chapterSummary?: unknown;
		}>()
		.default({})
		.notNull(),

	errorLog: text(),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});
