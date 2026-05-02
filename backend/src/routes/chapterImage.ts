import { Type } from "@sinclair/typebox";
import {
	and,
	eq,
	gt,
	gte,
	type InferInsertModel,
	inArray,
	sql,
} from "drizzle-orm";
import Elysia, { t } from "elysia";
import { db } from "../database";
import table, { table as schema } from "../database/schema";
import { dbSchemaTypes } from "../database/types";
import { authenticationMiddleware } from "../middleware/auth";
import { baseResponseSchema, errorResponseSchema } from "../types";
import { calculateFileHash, removeImage, uploadImages } from "../utils/files";
import { getOrCreateSystemProfile } from "../utils/system-user";

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
					const {
						chapterId: chapterIdString,
						content,
						images,
						startPostion: startPostionString,
					} = ctx.body;
					const imageUrls: string[] = await uploadImages(images);
					const chapterId = Number(chapterIdString);
					const startPostion = Number(startPostionString);
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

					const newChapterPage = await db.transaction(async (tx) => {
						// Fetch existing pages ordered by page number
						const existingPages = await tx.query.chapterPages.findMany({
							where: { chapterId: chapterId },
							orderBy: {
								pageNumber: "asc",
							},
						});

						// Determine insertion position (cannot exceed current length)
						const insertionPosition = Math.min(
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

						// Update chapter.pageIds with new page IDs appended
						const newPageIds = [
							...existingPages.map((p) => p.id),
							...inserted.map((p) => p.id),
						];
						await tx
							.update(schema.chapters)
							.set({
								pageIds: sql`ARRAY[${newPageIds}]::text[]`,
							})
							.where(eq(schema.chapters.id, chapterId));

						return inserted;
					});

					// Create subtitles if provided

					return ctx.status(201, {
						success: true,
						message: "Chapter page created successfully",
						data: newChapterPage,
						timestamp: Date.now(),
					});
				},
				{
					detail: {
						description: "Add a new chapter page",
					},
					body: Type.Object({
						chapterId: Type.String(),
						images: t.Files({ type: "image/*" }),
						content: Type.String(),
						startPostion: Type.String({ default: "0" }),
					}),
					response: {
						201: baseResponseSchema(
							Type.Array(Type.Object(dbSchemaTypes.chapterPages)),
						),
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

					// Find the page to delete with its chapter
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

						// Update chapter.pageIds by removing the deleted page ID
						const remainingPages = await tx.query.chapterPages.findMany({
							where: { chapterId: pageToDelete.chapterId },
							orderBy: { pageNumber: "asc" },
						});
						const updatedPageIds = remainingPages.map((p) => p.id);
						await tx
							.update(schema.chapters)
							.set({
								pageIds: sql`ARRAY[${updatedPageIds}]::text[]`,
							})
							.where(eq(schema.chapters.id, pageToDelete.chapterId));

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

						// Re-index all remaining pages sequentially and update chapter.pageIds
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

						// Update chapter.pageIds with remaining page IDs
						const updatedPageIds = remainingPages.map((p) => p.id);
						await tx
							.update(schema.chapters)
							.set({
								pageIds: sql`ARRAY[${updatedPageIds}]::text[]`,
							})
							.where(eq(schema.chapters.id, firstChapterId));

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
			)
			.patch(
				"/batch/reorder",
				async (ctx) => {
					const profile = ctx.profile;
					const { swaps } = ctx.body as {
						swaps: { pageId: number; newPosition: number }[];
					};

					if (!swaps || swaps.length === 0) {
						return ctx.status(400, {
							success: false,
							message: "No reorder data provided",
							timestamp: Date.now(),
						});
					}

					// Validate input
					const invalidSwaps = swaps.filter(
						(swap) => !swap.pageId || swap.pageId <= 0 || swap.newPosition < 0,
					);

					if (invalidSwaps.length > 0) {
						return ctx.status(400, {
							success: false,
							message: "Invalid reorder data provided",
							timestamp: Date.now(),
						});
					}

					// Check duplicate pageIds
					const pageIds = swaps.map((swap) => swap.pageId);
					const uniquePageIds = new Set(pageIds);

					if (uniquePageIds.size !== pageIds.length) {
						return ctx.status(400, {
							success: false,
							message: "Duplicate pageId detected",
							timestamp: Date.now(),
						});
					}

					// Check duplicate target positions
					const positions = swaps.map((swap) => swap.newPosition);
					const uniquePositions = new Set(positions);

					if (uniquePositions.size !== positions.length) {
						return ctx.status(400, {
							success: false,
							message: "Duplicate target position detected",
							timestamp: Date.now(),
						});
					}

					// Fetch pages to reorder
					const pagesToMove = await db
						.select()
						.from(schema.chapterPages)
						.where(inArray(schema.chapterPages.id, pageIds));

					if (pagesToMove.length !== swaps.length) {
						return ctx.status(404, {
							success: false,
							message: "Some pages not found",
							timestamp: Date.now(),
						});
					}

					// Ensure all belong to same chapter
					const chapterId = pagesToMove[0].chapterId;

					const invalidPages = pagesToMove.filter(
						(page) =>
							page.chapterId !== chapterId || page.authorId !== profile.id,
					);

					if (invalidPages.length > 0) {
						return ctx.status(403, {
							success: false,
							message:
								"Forbidden: Some pages do not belong to you or are from different chapters",
							timestamp: Date.now(),
						});
					}

					// Fetch all chapter pages
					const allChapterPages = await db.query.chapterPages.findMany({
						where: {
							chapterId,
						},
						orderBy: {
							pageNumber: "asc",
						},
					});

					// Bounds check
					const totalPages = allChapterPages.length;

					const outOfBounds = swaps.some(
						(swap) => swap.newPosition >= totalPages,
					);

					if (outOfBounds) {
						return ctx.status(400, {
							success: false,
							message: "Target position out of bounds",
							timestamp: Date.now(),
						});
					}

					// Transaction
					const reorderedPages = await db.transaction(async (tx) => {
						const movingPageMap = new Map(
							pagesToMove.map((page) => [page.id, page]),
						);

						const movingPageIds = new Set(pageIds);

						// Remove moving pages from current order
						const remainingPages = allChapterPages.filter(
							(page) => !movingPageIds.has(page.id),
						);

						// Sort insert operations by target position
						const sortedSwaps = [...swaps].sort(
							(a, b) => a.newPosition - b.newPosition,
						);

						// Insert moving pages into their new positions
						for (const swap of sortedSwaps) {
							const page = movingPageMap.get(swap.pageId);

							if (!page) continue;

							remainingPages.splice(swap.newPosition, 0, page);
						}

						// Reindex sequentially
						for (let i = 0; i < remainingPages.length; i++) {
							const page = remainingPages[i];

							if (page.pageNumber !== i) {
								await tx
									.update(schema.chapterPages)
									.set({
										pageNumber: i,
									})
									.where(eq(schema.chapterPages.id, page.id));
							}
						}

						// Update chapter.pageIds to match new ordering
						const finalPageIds = remainingPages.map((p) => p.id);
						await tx
							.update(schema.chapters)
							.set({
								pageIds: sql`ARRAY[${finalPageIds}]::text[]`,
							})
							.where(eq(schema.chapters.id, chapterId));

						// Return updated moved pages
						const finalPages = await tx.query.chapterPages.findMany({
							where: {
								id: {
									in: pageIds,
								},
							},
							orderBy: {
								pageNumber: "asc",
							},
						});

						return finalPages;
					});

					return ctx.status(200, {
						success: true,
						message: `${reorderedPages.length} chapter pages reordered successfully`,
						data: reorderedPages,
						timestamp: Date.now(),
					});
				},
				{
					detail: {
						description: "Reorder multiple chapter pages positions at once",
					},
					body: Type.Object({
						swaps: Type.Array(
							Type.Object({
								pageId: Type.Number(),
								newPosition: Type.Number(),
							}),
						),
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
			)
			.post(
				"/add-queue/:id",
				async (ctx) => {
					const profile = ctx.profile;
					const pageId = Number(ctx.params.id);
					const { inpaintImage } = ctx.body;

					// Get the chapter page
					const chapterPage = await db.query.chapterPages.findFirst({
						where: { id: pageId },
						with: {
							chapter: {
								with: {
									comic: true,
								},
							},
						},
					});

					if (!chapterPage) {
						return ctx.status(404, {
							success: false,
							message: "Chapter page not found",
							timestamp: Date.now(),
						});
					}

					// Check if user owns the chapter
					if (
						!chapterPage.chapter ||
						chapterPage.chapter.authorId !== profile.id
					) {
						return ctx.status(403, {
							success: false,
							message: "Forbidden",
							timestamp: Date.now(),
						});
					}

					const systemProfileId = await getOrCreateSystemProfile();
					// Find or create subtitle for the page
					let subtitle = await db.query.chapterPageSubtitles.findFirst({
						where: { chapterPageId: pageId },
					});

					if (!subtitle) {
						const insertedSubtitle = await db
							.insert(schema.chapterPageSubtitles)
							.values({
								chapterPageId: pageId,
								authorId: systemProfileId.id,
								boxs: [] as any,
							})
							.returning()
							.then((res) => res[0]);

						if (!insertedSubtitle) {
							return ctx.status(500, {
								success: false,
								message: "Failed to create subtitle",
								timestamp: Date.now(),
							});
						}

						subtitle = insertedSubtitle;

						// Add subtitle ID to page.subtitleIds
						await db
							.update(schema.chapterPages)
							.set({
								subtitleIds: sql`array_append(${schema.chapterPages.subtitleIds}, ${subtitle.id})`,
							})
							.where(eq(schema.chapterPages.id, pageId));
					}

					// Check existing task
					const existingTask = await db.query.taskTable.findFirst({
						where: { chapterPageId: pageId },
					});

					let task;

					if (existingTask) {
						if (existingTask.status === "claimed") {
							return ctx.status(409, {
								success: false,
								message: "Page is currently being processed",
								timestamp: Date.now(),
							});
						}

						if (existingTask.status === "pending") {
							// Update existing pending task
							task = await db
								.update(table.taskTable)
								.set({
									metadata: { isInPaint: inpaintImage },
									updatedAt: new Date(),
								})
								.where(eq(table.taskTable.id, existingTask.id))
								.returning()
								.then((res) => res[0]);
						} else if (
							existingTask.status === "completed" ||
							existingTask.status === "failed"
						) {
							// Create new task
							[task] = await db
								.insert(table.taskTable)
								.values({
									status: "pending",
									chapterPageId: pageId,
									chapterPageSubtitlesId: subtitle!.id,
									metadata: { isInPaint: inpaintImage },
								})
								.returning();
						}
					} else {
						// Create new task
						[task] = await db
							.insert(table.taskTable)
							.values({
								status: "pending",
								chapterPageId: pageId,
								chapterPageSubtitlesId: subtitle!.id,
								metadata: { isInPaint: inpaintImage },
							})
							.returning();
					}

					return ctx.status(200, {
						success: true,
						message: "Task added to queue successfully",
						data: task!,
						timestamp: Date.now(),
					});
				},
				{
					detail: {
						description: "add page to queue that allow ai worker can working",
					},
					body: Type.Object({
						inpaintImage: t.Boolean(),
					}),
					response: {
						200: baseResponseSchema(Type.Object(dbSchemaTypes.taskTable)),
						403: errorResponseSchema,
						404: errorResponseSchema,
						409: errorResponseSchema,
						500: errorResponseSchema,
					},
				},
			),
	);
