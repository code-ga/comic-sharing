import * as auth from "./auth";
import * as app from "./app";
import * as comic from "./comic";
import { defineRelations } from "drizzle-orm";

export const table = {
	...auth,
	...app,
	comics: comic.comics,
	chapters: comic.chapters,
	chapterPages: comic.chapterPages,
	chapterPageSubtitles: comic.chapterPageSubtitles,
} as const;

export const schemaRelations = defineRelations(table, (r) => ({
	profile: {
		user: r.one.user({
			from: r.profile.userId,
			to: r.user.id,
		}),
		roles: r.many.role({
			from: r.profile.id,
			to: r.role.profileIds,
		}),
	},
	role: {
		profiles: r.many.profile({
			from: r.role.profileIds,
			to: r.profile.id,
		}),
	},
	user: {
		profile: r.one.profile({
			from: r.user.id,
			to: r.profile.userId,
		}),
	},

	comics: {
		author: r.one.profile({
			from: r.comics.authorId,
			to: r.profile.id,
		}),
		chapters: r.many.chapters({
			from: r.comics.id,
			to: r.chapters.comicId,
		}),
	},
	chapters: {
		comic: r.one.comics({
			from: r.chapters.comicId,
			to: r.comics.id,
		}),
		pages: r.many.chapterPages({
			from: r.chapters.id,
			to: r.chapterPages.chapterId,
		}),
	},

	chapterPages: {
		subtitle: r.many.chapterPageSubtitles({
			from: r.chapterPages.id,
			to: r.chapterPageSubtitles.chapterPageId,
		}),
		chapter: r.one.chapters({
			from: r.chapterPages.chapterId,
			to: r.chapters.id,
		}),
	},

	chapterPageSubtitles: {
		chapterPage: r.one.chapterPages({
			from: r.chapterPageSubtitles.chapterPageId,
			to: r.chapterPages.id,
		}),
	},
}));
export type Table = typeof table;
