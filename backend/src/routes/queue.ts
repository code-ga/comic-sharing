import { Type } from "@sinclair/typebox";
import { desc, eq, or, sql } from "drizzle-orm";
import Elysia from "elysia";
import { db } from "../database";
import { table as schema } from "../database/schema";
import { authenticationMiddleware } from "../middleware/auth";

export const queueRoute = new Elysia({ prefix: "/queue" })
	.use(authenticationMiddleware)
	.guard({ userAuth: true }, (app) =>
		app
			.get(
				"/",
				async (ctx) => {
					const { page = 1, limit = 10 } = ctx.query;
					const offset = (Number(page) - 1) * Number(limit);

					const tasks = await db
						.select({
							task: schema.taskTable,
							chapterPage: schema.chapterPages,
							chapter: schema.chapters,
						})
						.from(schema.taskTable)
						.leftJoin(
							schema.chapterPages,
							eq(schema.taskTable.chapterPageId, schema.chapterPages.id)
						)
						.leftJoin(
							schema.chapters,
							eq(schema.taskTable.chapterId, schema.chapters.id)
						)
						.where(
							or(
								eq(schema.chapterPages.authorId, ctx.profile.id),
								eq(schema.chapters.authorId, ctx.profile.id)
							)
						)
						.orderBy(desc(schema.taskTable.createdAt))
						.limit(Number(limit))
						.offset(offset);

					const totalResult = await db
						.select({ count: sql<number>`count(*)` })
						.from(schema.taskTable)
						.leftJoin(
							schema.chapterPages,
							eq(schema.taskTable.chapterPageId, schema.chapterPages.id)
						)
						.leftJoin(
							schema.chapters,
							eq(schema.taskTable.chapterId, schema.chapters.id)
						)
						.where(
							or(
								eq(schema.chapterPages.authorId, ctx.profile.id),
								eq(schema.chapters.authorId, ctx.profile.id)
							)
						);

					const total = Number(totalResult[0]?.count || 0);

					return ctx.status(200, {
						success: true,
						message: "Tasks fetched successfully",
						data: {
							tasks: tasks.map(t => ({
								...t.task,
								targetInfo: t.task.taskType === "chapter" 
									? { title: t.chapter?.title, type: "chapter" as const }
									: { pageNumber: t.chapterPage?.pageNumber, type: "page" as const }
							})),
							total,
							page: Number(page),
							limit: Number(limit),
							totalPages: Math.ceil(total / Number(limit)),
						},
						timestamp: Date.now(),
					});
				},
				{
					query: Type.Object({
						page: Type.Optional(Type.Number()),
						limit: Type.Optional(Type.Number()),
					}),
				}
			)
			.get(
				"/:id",
				async (ctx) => {
					const { id } = ctx.params;
					const taskResult = await db
						.select({
							task: schema.taskTable,
							chapterPage: schema.chapterPages,
							chapter: schema.chapters,
						})
						.from(schema.taskTable)
						.leftJoin(
							schema.chapterPages,
							eq(schema.taskTable.chapterPageId, schema.chapterPages.id)
						)
						.leftJoin(
							schema.chapters,
							eq(schema.taskTable.chapterId, schema.chapters.id)
						)
						.where(eq(schema.taskTable.id, Number(id)))
						.limit(1);

					if (!taskResult || taskResult.length === 0) {
						return ctx.status(404, {
							success: false,
							message: "Task not found",
							timestamp: Date.now(),
						});
					}

					const t = taskResult[0];

					if (
						(t.task.taskType === "page" && t.chapterPage?.authorId !== ctx.profile.id) ||
						(t.task.taskType === "chapter" && t.chapter?.authorId !== ctx.profile.id)
					) {
						return ctx.status(403, {
							success: false,
							message: "Forbidden",
							timestamp: Date.now(),
						});
					}

					return ctx.status(200, {
						success: true,
						message: "Task fetched successfully",
						data: {
							...t.task,
							targetInfo: t.task.taskType === "chapter" 
								? { title: t.chapter?.title, type: "chapter" as const }
								: { pageNumber: t.chapterPage?.pageNumber, type: "page" as const }
						},
						timestamp: Date.now(),
					});
				},
				{
					params: Type.Object({
						id: Type.Number(),
					}),
				}
			)
			.get(
				"/chapter/:chapterId",
				async (ctx) => {
					const { chapterId } = ctx.params;

					const chapterResult = await db.select().from(schema.chapters).where(eq(schema.chapters.id, Number(chapterId))).limit(1);
					const chapter = chapterResult[0];

					if (!chapter) {
						return ctx.status(404, {
							success: false,
							message: "Chapter not found",
							timestamp: Date.now(),
						});
					}

					if (chapter.authorId !== ctx.profile.id) {
						return ctx.status(403, {
							success: false,
							message: "Forbidden",
							timestamp: Date.now(),
						});
					}

					const tasks = await db
						.select({
							task: schema.taskTable,
							chapterPage: schema.chapterPages,
							chapter: schema.chapters,
						})
						.from(schema.taskTable)
						.leftJoin(
							schema.chapterPages,
							eq(schema.taskTable.chapterPageId, schema.chapterPages.id)
						)
						.leftJoin(
							schema.chapters,
							eq(schema.taskTable.chapterId, schema.chapters.id)
						)
						.where(
							or(
								eq(schema.taskTable.chapterId, Number(chapterId)),
								eq(schema.chapterPages.chapterId, Number(chapterId))
							)
						)
						.orderBy(desc(schema.taskTable.createdAt));

					return ctx.status(200, {
						success: true,
						message: "Tasks fetched successfully",
						data: tasks.map(t => ({
							...t.task,
							targetInfo: t.task.taskType === "chapter" 
								? { title: t.chapter?.title, type: "chapter" as const }
								: { pageNumber: t.chapterPage?.pageNumber, type: "page" as const }
						})),
						timestamp: Date.now(),
					});
				},
				{
					params: Type.Object({
						chapterId: Type.Number(),
					}),
				}
			)
	);
