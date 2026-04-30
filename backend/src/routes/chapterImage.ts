import { Type } from "@sinclair/typebox";
import { eq, gte, and, gt, sql, InferInsertModel } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { db } from "../database";
import { dbSchemaTypes } from "../database/types";
import { authenticationMiddleware } from "../middleware/auth";
import { baseResponseSchema, errorResponseSchema } from "../types";
import { table as schema } from "../database/schema";
import { removeImage, uploadImages } from "../utils/files";

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
							id: Number(ctx.params.id),
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
	.guard({ userAuth: true }, (app) =>
		app
			.post(
				"/add",
				async (ctx) => {
					const profile = ctx.profile;
					// const user = ctx.user;
					const { chapterId, content, images, startPostion } = ctx.body;
					const imageUrls: string[] = await uploadImages(images);
					// Check if chapter exists and belongs to the user
					const chapter = await db.query.chapters.findFirst({
						where: {
							id: chapterId,
						},
						with: {
							comic: true, // Include the related comic to check the author
							pages: true,
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

					// const insertData: InferInsertModel<typeof schema.chapterPages> = {
					// 	chapterId,
					// 	imageUrl,
					// 	content,
					// 	authorId: profile.id,
					// 	hashing: "",
					// };
					// // Create chapter page
					// const newChapterPage = await db
					// 	.insert(schema.chapterPages)
					// 	.values(insertData)
					// 	.returning();
					// const chapterPageId = newChapterPage[0].id;

					const newChapterPage = await db.transaction(async (tx) => {
						// Fetch existing pages ordered by page number
						const existingPages = await tx.query.chapterPages.findMany({
							where: { chapterId: chapterId },
							orderBy: {
								pageNumber: "asc",
							},
						});

						// Determine insertion position (cannot exceed current length)
						let insertionPosition = Math.min(
							startPostion,
							existingPages.length,
						);

						// Calculate number of new items to insert
						const newItemsCount = imageUrls.length;

						// Optimization: Update all affected pages in a single query
						// This shifts page numbers for all pages at or after insertion point
						if (insertionPosition < existingPages.length) {
							await tx
								.update(schema.chapterPages)
								.set({
									pageNumber: sql`${schema.chapterPages.pageNumber} + ${newItemsCount}`,
								})
								.where(
									and(
										eq(schema.chapterPages.chapterId, chapterId),
										gte(schema.chapterPages.pageNumber, insertionPosition),
									),
								);
						}

						// Insert new pages with correct page numbers
						const newPages: InferInsertModel<typeof schema.chapterPages>[] =
							imageUrls.map((imageUrl, index) => ({
								chapterId,
								imageUrl,
								content,
								authorId: profile.id,
								pageNumber: insertionPosition + index,
								hashing: "", // TODO: Generate proper hash for page integrity
								subtitleIds: [],
							}));

						const inserted = await tx
							.insert(schema.chapterPages)
							.values(newPages)
							.returning();

						return inserted;
					});

					// Create subtitles if provided

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
						images: t.Files({ type: "image/*", minItems: 20 }),
						content: Type.String(),
						startPostion: Type.Number(),
					}),
					response: {
						201: baseResponseSchema(Type.Object(dbSchemaTypes.chapterPages)),
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
					const profile = ctx.profile;
					const pageId = Number(ctx.params["id"]);

					// Find the page to delete
					const pageToDelete = await db.query.chapterPages.findFirst({
						where: { id: pageId },
					});

					if (!pageToDelete) {
						return ctx.status(404, {
							success: false,
							message: "Chapter page not found",
							timestamp: Date.now(),
						});
					}

					// Check if user is the author
					if (pageToDelete.authorId !== profile.id) {
						return ctx.status(403, {
							success: false,
							message: "Forbidden",
							timestamp: Date.now(),
						});
					}

					const deletedPage = await db.transaction(async (tx) => {
						// Get the deleted page's page number for reference
						const deletedPageNumber = pageToDelete.pageNumber;

						// Delete the page
						const deleted = await tx
							.delete(schema.chapterPages)
							.where(eq(schema.chapterPages.id, pageId))
							.returning();

						// Shift down all pages that have pageNumber > deleted page's pageNumber
						if (deleted.length > 0) {
							await tx
								.update(schema.chapterPages)
								.set({
									pageNumber: sql`${schema.chapterPages.pageNumber} - 1`,
								})
								.where(
									and(
										eq(schema.chapterPages.chapterId, pageToDelete.chapterId),
										gt(schema.chapterPages.pageNumber, deletedPageNumber),
									),
								);
						}
						await removeImage(deleted.map((doc) => doc.imageUrl));

						return deleted[0];
					});

					return ctx.status(200, {
						success: true,
						message:
							"Chapter page deleted successfully \n We promised that image that remove via this endpoint will be remove from all cdn and database of us",
						data: deletedPage,
						timestamp: Date.now(),
					});
				},
				{
					detail: {
						description: "Delete a chapter page",
					},
					response: {
						200: baseResponseSchema(Type.Object(dbSchemaTypes.chapterPages)),
						401: errorResponseSchema,
						403: errorResponseSchema,
						404: errorResponseSchema,
						500: errorResponseSchema,
					},
				},
			)
			.delete(
				"/batch/delete",
				async (ctx) => {
					const profile = ctx.profile;
					const { pageIds } = ctx.body as { pageIds: number[] };

					if (!pageIds || pageIds.length === 0) {
						return ctx.status(400, {
							success: false,
							message: "No page IDs provided",
							timestamp: Date.now(),
						});
					}

					// Find all pages to delete
					const pagesToDelete = await db.query.chapterPages.findMany({
						where: and(
							...pageIds.map((id) => eq(schema.chapterPages.id, id)),
						) as any,
					});

					if (pagesToDelete.length === 0) {
						return ctx.status(404, {
							success: false,
							message: "No pages found",
							timestamp: Date.now(),
						});
					}

					// Verify all pages belong to the same chapter and user is author
					const firstChapterId = pagesToDelete[0].chapterId;
					const invalidPages = pagesToDelete.filter(
						(page) =>
							page.chapterId !== firstChapterId || page.authorId !== profile.id,
					);

					if (invalidPages.length > 0) {
						return ctx.status(403, {
							success: false,
							message:
								"Forbidden: Some pages do not belong to you or are from different chapters",
							timestamp: Date.now(),
						});
					}

					const deletedPages = await db.transaction(async (tx) => {
						// Delete all specified pages
						const deleted = await tx
							.delete(schema.chapterPages)
							.where(
								and(
									eq(schema.chapterPages.chapterId, firstChapterId),
									...pageIds.map((id) => eq(schema.chapterPages.id, id)),
								),
							)
							.returning();

						// Re-index all remaining pages sequentially
						const remainingPages = await tx.query.chapterPages.findMany({
							where: { chapterId: firstChapterId },
							orderBy: {
								pageNumber: "asc",
							},
						});

						// Update page numbers for all remaining pages
						for (let i = 0; i < remainingPages.length; i++) {
							if (remainingPages[i].pageNumber !== i) {
								await tx
									.update(schema.chapterPages)
									.set({ pageNumber: i })
									.where(eq(schema.chapterPages.id, remainingPages[i].id));
							}
						}

						await removeImage(deleted.map((doc) => doc.imageUrl));

						return deleted;
					});

					return ctx.status(200, {
						success: true,
						message: `${deletedPages.length} chapter pages deleted successfully \n We promised that image that remove via this endpoint will be remove from all cdn and database of us`,
						data: deletedPages,
						timestamp: Date.now(),
					});
				},
				{
					detail: {
						description: "Delete multiple chapter pages at once",
					},
					body: Type.Object({
						pageIds: Type.Array(Type.Number()),
					}),
					response: {
						200: baseResponseSchema(
							Type.Array(Type.Object(dbSchemaTypes.chapterPages)),
						),
						400: errorResponseSchema,
						401: errorResponseSchema,
						403: errorResponseSchema,
						404: errorResponseSchema,
						500: errorResponseSchema,
					},
				},
			),
	);
