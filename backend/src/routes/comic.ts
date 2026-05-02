import { Type } from "@sinclair/typebox";
import { eq } from "drizzle-orm";
import Elysia, { t } from "elysia";
import { db } from "../database";
import { table as schema } from "../database/schema";
import { dbSchemaTypes } from "../database/types";
import { authenticationMiddleware } from "../middleware/auth";
import { appStateService } from "../services/AppState";
import { baseResponseSchema, errorResponseSchema } from "../types";
import { removeImage, uploadImages } from "../utils/files";

export const comicsRoute = new Elysia({ prefix: "/comics" })
	.use(authenticationMiddleware)
	.use(appStateService)
	.guard({ optionalAuth: true }, (app) =>
		app
			.get(
				"/latest-update",
				async (ctx) => {
					const comic = await db.query.comics.findMany({
						with: {
							chapters: true,
						},
						orderBy: {
							updatedAt: "desc",
						},
					});
					return ctx.status(200, {
						success: true,
						message: "Comic fetched successfully",
						data: comic,
						timestamp: Date.now(),
					});
				},
				{
					detail: {
						description: "Get latest updated comics",
					},
					response: {
						200: baseResponseSchema(
							Type.Array(Type.Object({ ...dbSchemaTypes.comics })),
						),
						500: errorResponseSchema,
					},
				},
			)
			.get(
				"/recently-added",
				async (ctx) => {
					const comic = await db.query.comics.findMany({
						orderBy: {
							createdAt: "desc",
						},
					});
					return ctx.status(200, {
						success: true,
						message: "Comic fetched successfully",
						data: comic,
						timestamp: Date.now(),
					});
				},
				{
					detail: {
						description: "Get recently added comics",
					},
					response: {
						200: baseResponseSchema(
							Type.Array(Type.Object({ ...dbSchemaTypes.comics })),
						),
						500: errorResponseSchema,
					},
				},
			)
			.get(
				"/recommended",
				async (ctx) => {
					// For simplicity, we are returning the latest updated comics as recommended. In a real application, you would implement a recommendation algorithm based on user preferences, reading history, etc.
					const comic = await db.query.comics.findMany({
						with: {
							chapters: true,
						},
						orderBy: {
							updatedAt: "desc",
						},
					});
					return ctx.status(200, {
						success: true,
						message: "Recommended comics fetched successfully",
						data: comic,
						timestamp: Date.now(),
					});
				},
				{
					detail: {
						description: "Get recommended comics",
					},
					response: {
						200: baseResponseSchema(
							Type.Array(Type.Object({ ...dbSchemaTypes.comics })),
						),
						500: errorResponseSchema,
					},
				},
			)
			.get(
				"/:id",
				async (ctx) => {
					const { id } = ctx.params;
					const comic = await db.query.comics.findFirst({
						where: {
							id: Number(id),
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
					return ctx.status(200, {
						success: true,
						message: "Comic fetched successfully",
						data: comic,
						timestamp: Date.now(),
					});
				},
				{
					detail: {
						description: "Get comic by ID",
					},
					params: Type.Object({
						id: Type.String(),
					}),
					response: {
						200: baseResponseSchema(
							Type.Object({
								...dbSchemaTypes.comics,
								chapters: Type.Array(Type.Object(dbSchemaTypes.chapters)),
							}),
						),
						404: errorResponseSchema,
						500: errorResponseSchema,
					},
				},
			),
	)
	.guard(
		{
			userAuth: true,
		},
		(app) =>
			app
				.get(
					"/my/uploaded",
					async (ctx) => {
						const userId = ctx.profile?.id;
						if (!userId) {
							return ctx.status(401, {
								success: false,
								message: "Unauthorized",
								timestamp: Date.now(),
							});
						}
						const comic = await db.query.comics.findMany({
							where: {
								authorId: userId,
							},
							with: {
								chapters: true,
							},
						});
						return ctx.status(200, {
							success: true,
							message: "Comics fetched successfully",
							data: comic,
							timestamp: Date.now(),
						});
					},
					{
						detail: {
							description: "Get comics uploaded by me",
						},
						response: {
							200: baseResponseSchema(
								Type.Array(
									Type.Object({
										...dbSchemaTypes.comics,
										chapters: Type.Array(Type.Object(dbSchemaTypes.chapters)),
									}),
								),
							),
							500: errorResponseSchema,
							401: errorResponseSchema,
						},
					},
				)
				.post(
					"/",
					async (ctx) => {
						const {
							title,
							description,
							thumbnail: thumbnailFile,
							categories,
							genres,
						} = ctx.body;

						if (!title.trim()) {
							return ctx.status(400, {
								success: false,
								message: "Title is required",
								timestamp: Date.now(),
							});
						}
						if (!description?.trim()) {
							return ctx.status(400, {
								success: false,
								message: "Description is required",
								timestamp: Date.now(),
							});
						}

						const userId = ctx.profile?.id;
						if (!userId) {
							return ctx.status(401, {
								success: false,
								message: "Unauthorized",
								timestamp: Date.now(),
							});
						}

						// Categories and genres come as arrays from multipart/form-data
						const categoriesArray = Array.isArray(categories)
							? categories
							: categories
								? [categories]
								: [];
						const genresArray = Array.isArray(genres)
							? genres
							: genres
								? [genres]
								: [];

						let thumbnailUrl: string | undefined;
						if (thumbnailFile) {
							const uploadedUrls = await uploadImages([thumbnailFile]);
							thumbnailUrl = uploadedUrls[0];
						}

						const [newComic] = await db
							.insert(schema.comics)
							.values({
								title,
								description,
								thumbnail: thumbnailUrl,
								categories: categoriesArray,
								genres: genresArray,
								authorId: userId,
							})
							.returning();

						return ctx.status(201, {
							success: true,
							message: "Comic created successfully",
							data: newComic,
							timestamp: Date.now(),
						});
					},
					{
						detail: {
							description: "Create a new comic",
						},
						body: t.Object({
							title: t.String({ minLength: 1 }),
							description: t.String({ minLength: 1 }),
							thumbnail: t.Optional(t.File()),
							categories: t.Optional(t.Array(t.String())),
							genres: t.Optional(t.Array(t.String())),
						}),

						isMultipart: true,
						response: {
							201: baseResponseSchema(Type.Object({ ...dbSchemaTypes.comics })),
							401: errorResponseSchema,
							400: errorResponseSchema,
							500: errorResponseSchema,
						},
					},
				)
				.put(
					"/:id",
					async (ctx) => {
						const { id } = ctx.params;
						const {
							title,
							description,
							thumbnail: thumbnailFile,
							categories,
							genres,
						} = ctx.body;

						console.log(ctx.body);

						const userId = ctx.profile?.id;
						if (!userId) {
							return ctx.status(401, {
								success: false,
								message: "Unauthorized",
								timestamp: Date.now(),
							});
						}
						const comic = await db.query.comics.findFirst({
							where: {
								id: Number(id),
							},
						});
						if (!comic) {
							return ctx.status(404, {
								success: false,
								message: "Comic not found",
								timestamp: Date.now(),
							});
						}
						if (comic.authorId !== userId) {
							return ctx.status(403, {
								success: false,
								message: "Forbidden",
								timestamp: Date.now(),
							});
						}

						// Categories and genres come as arrays from multipart/form-data
						const categoriesArray = Array.isArray(categories)
							? categories
							: categories
								? [categories]
								: comic.categories;
						const genresArray = Array.isArray(genres)
							? genres
							: genres
								? [genres]
								: comic.genres;

						let thumbnailUrl = comic.thumbnail;
						if (thumbnailFile) {
							// Delete old thumbnail if exists
							if (comic.thumbnail) {
								await removeImage([comic.thumbnail]);
							}
							const uploadedUrls = await uploadImages([thumbnailFile]);
							thumbnailUrl = uploadedUrls[0];
						}
						console.log(
							thumbnailUrl,
							typeof categoriesArray,
							typeof genresArray,
						);

						const [updatedComic] = await db
							.update(schema.comics)
							.set({
								title: title?.trim() ?? comic.title,
								description: description?.trim() ?? comic.description,
								thumbnail: thumbnailUrl,
								categories: categoriesArray,
								genres: genresArray,
							})
							.where(eq(schema.comics.id, Number(id)))
							.returning();
						return ctx.status(200, {
							success: true,
							message: "Comic updated successfully",
							data: updatedComic,
							timestamp: Date.now(),
						});
					},
					{
						detail: {
							description: "Update a comic",
						},
						params: Type.Object({
							id: Type.String(),
						}),
						body: t.Partial(
							t.Object({
								title: t.String({ minLength: 1 }),
								description: t.String({ minLength: 1 }),
								thumbnail: t.Optional(t.File()),
								categories: t.Optional(t.Array(t.String())),
								genres: t.Optional(t.Array(t.String())),
							}),
						),
						isMultipart: true,
						response: {
							200: baseResponseSchema(Type.Object({ ...dbSchemaTypes.comics })),
							401: errorResponseSchema,
							403: errorResponseSchema,
							404: errorResponseSchema,
							400: errorResponseSchema,
							500: errorResponseSchema,
						},
					},
				)
				.delete(
					"/:id",
					async (ctx) => {
						const { id } = ctx.params;
						const userId = ctx.profile?.id;
						if (!userId) {
							return ctx.status(401, {
								success: false,
								message: "Unauthorized",
								timestamp: Date.now(),
							});
						}
						const comic = await db.query.comics.findFirst({
							where: {
								id: Number(id),
							},
						});
						if (!comic) {
							return ctx.status(404, {
								success: false,
								message: "Comic not found",
								timestamp: Date.now(),
							});
						}
						if (comic.authorId !== userId) {
							return ctx.status(403, {
								success: false,
								message: "Forbidden",
								timestamp: Date.now(),
							});
						}

						// Delete thumbnail from CDN if exists
						if (comic.thumbnail) {
							await removeImage([comic.thumbnail]);
						}

						const [result] = await db
							.delete(schema.comics)
							.where(eq(schema.comics.id, Number(id)))
							.returning();
						return ctx.status(200, {
							success: true,
							message: "Comic deleted successfully",
							timestamp: Date.now(),
							data: result,
						});
					},
					{
						detail: {
							description: "Delete a comic",
						},
						params: Type.Object({
							id: Type.String(),
						}),
						response: {
							200: baseResponseSchema(Type.Object({ ...dbSchemaTypes.comics })),
							401: errorResponseSchema,
							403: errorResponseSchema,
							404: errorResponseSchema,
							400: errorResponseSchema,
							500: errorResponseSchema,
						},
					},
				),
	);

export type comicsRoute = typeof comicsRoute;
