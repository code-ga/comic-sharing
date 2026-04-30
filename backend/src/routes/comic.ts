import { Type } from "@sinclair/typebox";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "../database";
import { table as schema } from "../database/schema";
import { dbSchemaTypes } from "../database/types";
import { authenticationMiddleware } from "../middleware/auth";
import { baseResponseSchema, errorResponseSchema } from "../types";
import { appStateService } from "../services/AppState";

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
			),
	)
	.guard(
		{
			userAuth: true,
		},
		(app) =>
			app
				.post(
					"/",
					async (ctx) => {
						const { title, description } = ctx.body;
						const userId = ctx.profile?.id;
						if (!userId) {
							return ctx.status(401, {
								success: false,
								message: "Unauthorized",
								timestamp: Date.now(),
							});
						}
						const [newComic] = await db
							.insert(schema.comics)
							.values({
								title,
								description,
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
						body: Type.Object({
							title: Type.String(),
							description: Type.String(),
						}),
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
						const { title, description } = ctx.body;
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
						const [updatedComic] = await db
							.update(schema.comics)
							.set({
								title: title ?? comic.title,
								description: description ?? comic.description,
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
						body: Type.Partial(
							Type.Object({
								title: Type.String(),
								description: Type.String(),
							}),
						),
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
