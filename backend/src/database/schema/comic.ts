import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
	index,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const comics = pgTable(
	"comic",
	{
		id: serial("id").primaryKey(),

		authorId: text("author_id").notNull(),

		title: text("title").notNull(),
		description: text("description"),
		thumbnail: text("thumbnail"),
		categories: text("categories").array().notNull().default([]),
		genres: text("genres").array().notNull().default([]),

		chapterIds: text("chapter_ids").notNull().array().default([]),

		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("comics_updated_at_idx").on(table.updatedAt),
		index("comics_created_at_idx").on(table.createdAt),
		index("comics_updated_at_id_idx").on(table.updatedAt, table.id),
		index("comics_created_at_id_idx").on(table.createdAt, table.id),
	],
);

export type ComicInsert = InferInsertModel<typeof comics>;
export type Comic = InferSelectModel<typeof comics>;

export const chapters = pgTable("chapter", {
	id: serial("id").primaryKey(),
	comicId: serial("comic_id")
		.notNull()
		.references(() => comics.id, { onDelete: "cascade" }),

	authorId: text("author_id").notNull(),
	index: integer("index").notNull().default(0),
	vibes: text("vibes").notNull().array().default([]),

	title: text("title").notNull(),

	pageIds: text("page_ids").notNull().array().default([]),

	// Ai Generated data
	summary: text("summary"),
	majorEvents: text("major_events").array(),
	characters: text("characters").array(),
	themes: text("themes").array(),
	emotionalArc: text("emotional_arc").array(),
	chapterType: text("chapter_type").$type<
		| "action"
		| "dialogue"
		| "exposition"
		| "romance"
		| "comedy"
		| "horror"
		| "mixed"
	>(),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export type Chapter = InferSelectModel<typeof chapters>;
export type ChapterInsert = InferInsertModel<typeof chapters>;

export const chapterPages = pgTable("chapter_pages", {
	id: serial("id").primaryKey(),
	chapterId: serial("chapter_id")
		.notNull()
		.references(() => chapters.id, { onDelete: "cascade" }),

	authorId: text("author_id").notNull(),

	/**
	 * Hashing is used to ensure the integrity of the page data. It can be a hash of the page content or a unique identifier for the page. This helps in verifying that the page data has not been tampered with and can be used for caching purposes.
	 */
	hashing: text("hashing").notNull(),
	pageNumber: serial("page_number").notNull(),
	imageUrl: text("image_url").notNull(),
	/**
	 * @deprecated this is very new and unstable field please currently considering that store the default value defined below
	 * If this is novel we just saving content.
	 * If manga or non-text media we going to using ocr or like that
	 * This content save the Ai processed content
	 */
	content: text("content").default("").notNull(),
	/**
	 * @deprecated this is very new and unstable field please currently considering that store the default value defined below
	 * This content save the Raw text from ocr
	 */
	rawContent: text("raw_content").default("").notNull(),

	subtitleIds: text("subtitle_ids").notNull().array().default([]),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export type ChapterPage = InferSelectModel<typeof chapterPages>;
export type ChapterPageInsert = InferInsertModel<typeof chapterPages>;

export type SubtitleBox = {
	x: number;
	y: number;
	width: number;
	height: number;
	text: string;
	boxType:
		| "dialogue"
		| "narration"
		| "sound_effect"
		| "title"
		| "background_text";
	order: number;
};

export const chapterPageSubtitles = pgTable("chapter_page_subtitle", {
	id: serial("id").primaryKey(),
	chapterPageId: serial("chapter_page_id")
		.notNull()
		.references(() => chapterPages.id, { onDelete: "cascade" }),

	authorId: text("author_id").notNull(),

	// Ai Generated data
	// ocr result
	boxs: jsonb("box")
		.notNull()
		.$type<{ boxs: SubtitleBox[] }>()
		.default({ boxs: [] }),
	content: text(),
	readingDirection: text().$type<"ltr" | "rtl" | "vertical">(),

	// Ai Generated Summarized Content
	summary: text(),
	characters: text().array(),
	setting: text(),
	objects: text().array(),
	emotions: text().array(),
	scene_type: text(),
	action_level: text().$type<"low" | "medium" | "high">(),
	important_events: text().array(),
	content_flags: text().array(),

	inPaintedImage: text(),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export type ChapterPageSubtitle = InferSelectModel<typeof chapterPageSubtitles>;
