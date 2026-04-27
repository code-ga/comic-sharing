import { Type } from "@sinclair/typebox";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { db } from "../database";
import { table as schema } from "../database/schema";
import { dbSchemaTypes } from "../database/types";
import { authenticationMiddleware } from "../middleware/auth";
import { baseResponseSchema, errorResponseSchema } from "../types";

export const clusterRoute = new Elysia({ prefix: "/cluster" })
	.use(authenticationMiddleware)
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
			userAuth: {
				requiredProfile: true,
			},
		},
		(app) => app,
	);

export type ClusterRoute = typeof clusterRoute;
