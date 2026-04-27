import { Type } from "@sinclair/typebox";
import { eq, InferInsertModel } from "drizzle-orm";
import Elysia from "elysia";
import { db } from "../database";
import { dbSchemaTypes } from "../database/types";
import { authenticationMiddleware } from "../middleware/auth";
import { baseResponseSchema, errorResponseSchema } from "../types";
import { table as schema } from "../database/schema";

export const chapterImagesRoute = new Elysia({ prefix: "/chapter-images" })
	.use(authenticationMiddleware)
	.guard({ optionalAuth: true }, (app) =>
		app
			.get(
				"/chapter/:chapter-id",
				async (ctx) => {
					const chapterPages = await db.query.chapterPages.findMany({
						where: {
							chapterId: Number(ctx.params["chapter-id"]),
						},
						with: {
							subtitle: true,
						},
					});
					return ctx.status(200, {
						success: true,
						timestamp: Date.now(),
						data: chapterPages,
					});
				},
				{
					response: {
						200: baseResponseSchema(
							Type.Array(
								Type.Object({
									...dbSchemaTypes.chapterPages,
									subtitle: Type.Array(
										Type.Object(dbSchemaTypes.chapterPageSubtitles),
									),
								}),
							),
						),
					},
				},
			)
			.get(
				"/:id",
				async (ctx) => {
					const chapterPage = await db.query.chapterPages.findFirst({
						where: {
							id: Number(ctx.params["id"]),
						},
						with: {
							subtitle: true,
						},
					});
					if (!chapterPage) {
						return ctx.status(404, {
							success: false,
							message: "Chapter page not found",
							timestamp: Date.now(),
						});
					}
					return ctx.status(200, {
						success: true,
						timestamp: Date.now(),
						data: chapterPage,
					});
				},
				{
					response: {
						200: baseResponseSchema(
							Type.Object({
								...dbSchemaTypes.chapterPages,
								subtitle: Type.Array(
									Type.Object(dbSchemaTypes.chapterPageSubtitles),
								),
							}),
						),
						404: errorResponseSchema,
					},
				},
			),
	)
	.guard({ userAuth: { requiredProfile: true } }, (app) =>
		app.post(
			"/add",
			async (ctx) => {
				const profile = ctx.profile;
				const user = ctx.user;
				const { chapterId, imageUrl, content, subtitle } = ctx.body;

				// Check if chapter exists and belongs to the user
				const chapter = await db.query.chapters.findFirst({
					where: {
						id: chapterId,
					},
					with: {
						comic: true, // Include the related comic to check the author
					},
				});

				if (!chapter) {
					return ctx.status(404, {
						success: false,
						message: "Chapter not found",
						timestamp: Date.now(),
					});
				}
				if (chapter.authorId !== profile.id) {
					return ctx.status(403, {
						success: false,
						message: "Forbidden",
						timestamp: Date.now(),
					});
				}

				const insertData: InferInsertModel<typeof schema.chapterPages> = {
					chapterId,
					imageUrl,
					content,
					authorId: profile.id,
					hashing: "",
				};
				// Create chapter page
				const newChapterPage = await db
					.insert(schema.chapterPages)
					.values(insertData)
					.returning();
				const chapterPageId = newChapterPage[0].id;

				// Create subtitles if provided
				if (subtitle && subtitle.length > 0) {
					const subtitleValues = subtitle.map((text: string) => ({
						chapterPageId,
						text,
					}));
					await db.insert(schema.chapterPageSubtitles).values(subtitleValues);
				}

				return ctx.status(201, {
					success: true,
					message: "Chapter page created successfully",
					data: newChapterPage[0],
					timestamp: Date.now(),
				});
			},
			{
				detail: {
					description: "Add a new chapter page",
				},
				body: Type.Object({
					chapterId: Type.Number(),
					imageUrl: Type.String(),
					content: Type.String(),
					subtitle: Type.Optional(Type.Array(Type.String())),
				}),
				response: {
					201: baseResponseSchema(Type.Object(dbSchemaTypes.chapterPages)),
					401: errorResponseSchema,
					403: errorResponseSchema,
					404: errorResponseSchema,
					500: errorResponseSchema,
				},
			},
		),
	);
