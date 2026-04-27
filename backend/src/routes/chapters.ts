import { Type } from "@sinclair/typebox";
import { eq } from "drizzle-orm";
import Elysia from "elysia";
import { db } from "../database";
import { dbSchemaTypes } from "../database/types";
import { authenticationMiddleware } from "../middleware/auth";
import { baseResponseSchema, errorResponseSchema } from "../types";
import { table as schema } from "../database/schema";

export const chaptersRoute = new Elysia({ prefix: "/chapters" })
	.use(authenticationMiddleware)
	.guard({ optionalAuth: true }, (app) =>
		app
			.get(
				"/:id",
				async (ctx) => {
					const { id } = ctx.params;
					const chapter = await db.query.chapters.findFirst({
						where: {
							id: Number(id),
						},
						with: {
							comic: true,
							pages: true,
						},
					});
					if (!chapter)
						return ctx.status(404, {
							success: false,
							message: "Chapter not found",
							timestamp: Date.now(),
						});
					return ctx.status(200, {
						success: true,
						message: "Chapter fetched successfully",
						data: chapter,
						timestamp: Date.now(),
					});
				},
				{
					detail: {
						description: "Get chapter by ID",
					},
					response: {
						200: baseResponseSchema(
							Type.Object({
								...dbSchemaTypes.chapters,
								comic: Type.Union([
									Type.Object({
										...dbSchemaTypes.comics,
										chapterIds: Type.Array(Type.String()),
									}),
									Type.Null(),
								]),
								pages: Type.Array(
									Type.Object({ ...dbSchemaTypes.chapterPages }),
								),
							}),
						),
						404: errorResponseSchema,
						500: errorResponseSchema,
					},
				},
			)
			.get(
				"/comic/:comicId",
				async (ctx) => {
					const { comicId } = ctx.params;
					const chapters = await db.query.chapters.findMany({
						where: {
							comicId: Number(comicId),
						},
						orderBy: {
							createdAt: "asc",
						},
					});
					return ctx.status(200, {
						success: true,
						message: "Chapters fetched successfully",
						data: chapters,
						timestamp: Date.now(),
					});
				},
				{
					detail: {
						description: "Get chapters by comic ID",
					},
					response: {
						200: baseResponseSchema(
							Type.Array(Type.Object({ ...dbSchemaTypes.chapters })),
						),
						500: errorResponseSchema,
					},
				},
			),
	)
	.guard({ userAuth: { requiredProfile: true } }, (app) =>
		app
			.post(
				"/comic/:comicId",
				async (ctx) => {
					const { comicId } = ctx.params;
					const { title, indexing } = ctx.body;
					// Check if comic exists and belongs to the user
					const comic = await db.query.comics.findFirst({
						where: {
							id: Number(comicId),
						},
						with: {
							chapters: true,
						},
					});
					if (!comic) {
						return ctx.status(404, {
							success: false,
							message: "Comic not found",
							timestamp: Date.now(),
						});
					}
					if (comic.authorId !== ctx.profile.id) {
						return ctx.status(403, {
							success: false,
							message: "Forbidden",
							timestamp: Date.now(),
						});
					}
					// Create chapter
					const newChapter = await db
						.insert(schema.chapters)
						.values({
							comicId: Number(comicId),
							authorId: ctx.profile.id,
							title,
							index: indexing ?? comic.chapters.length,
						})
						.returning();
					return ctx.status(201, {
						success: true,
						message: "Chapter created successfully",
						data: newChapter[0],
						timestamp: Date.now(),
					});
				},
				{
					detail: {
						description: "Create a new chapter for a comic",
					},
					body: Type.Object({
						title: Type.String(),
						indexing: Type.Optional(Type.Number()),
					}),
					response: {
						201: baseResponseSchema(Type.Object({ ...dbSchemaTypes.chapters })),
						401: errorResponseSchema,
						403: errorResponseSchema,
						404: errorResponseSchema,
						500: errorResponseSchema,
					},
				},
			)
			.put(
				"/:id",
				async (ctx) => {
					const { id } = ctx.params;
					const { title, indexing } = ctx.body;
					// Check if chapter exists and belongs to the user
					const chapter = await db.query.chapters.findFirst({
						where: {
							id: Number(id),
						},
						with: {
							comic: true,
						},
					});
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
					// Update chapter
					const updatedChapter = await db
						.update(schema.chapters)
						.set({ title, index: indexing ?? chapter.index })
						.where(eq(schema.chapters.id, Number(id)))
						.returning();
					return ctx.status(200, {
						success: true,
						message: "Chapter updated successfully",
						data: updatedChapter[0],
						timestamp: Date.now(),
					});
				},
				{
					detail: {
						description: "Update an existing chapter",
					},
					params: Type.Object({
						id: Type.Number(),
					}),
					body: Type.Partial(
						Type.Object({
							title: Type.String(),
							indexing: Type.Optional(Type.Number()),
						}),
					),
					response: {
						200: baseResponseSchema(Type.Object({ ...dbSchemaTypes.chapters })),
						401: errorResponseSchema,
						403: errorResponseSchema,
						404: errorResponseSchema,
						500: errorResponseSchema,
					},
				},
			)
			.delete(
				"/:id",
				async (ctx) => {
					const { id } = ctx.params;
					// Check if chapter exists and belongs to the user
					const chapter = await db.query.chapters.findFirst({
						where: {
							id: Number(id),
						},
						with: {
							comic: true,
						},
					});
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
					// Delete chapter
					await db
						.delete(schema.chapters)
						.where(eq(schema.chapters.id, Number(id)));
					return ctx.status(200, {
						success: true,
						message: "Chapter deleted successfully",
						timestamp: Date.now(),
					});
				},
				{
					detail: {
						description: "Delete an existing chapter",
					},
					params: Type.Object({
						id: Type.Number(),
					}),
				},
			),
	);
