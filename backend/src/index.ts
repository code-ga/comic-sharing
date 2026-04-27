import cors from "@elysiajs/cors";
import openapi from "@elysiajs/openapi";
import { AnyElysia, Elysia } from "elysia";
import { logger } from "./utils/logger";
import { generateSeedRoles } from "./utils/role";
import { getPermissionsGrouped } from "./constants/permissions";
import { apiRouter } from "./routes";
import { loggerMiddleware } from "./middleware/logger";
import { OpenAPI } from "./libs/openApi";

await generateSeedRoles();

const app = new Elysia()
	.use(
		cors({
			// methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			credentials: true,
		}),
	)
	.use(loggerMiddleware)
	.get("/", () => "Hello Elysia")
	.use(
		openapi({
			documentation: {
				components: await OpenAPI.components,
				paths: await OpenAPI.getPaths(),
			},
		}),
	)
	.use(apiRouter);

app.get("/permissions", async (_) => {
	return {
		success: true,
		message: "Permissions fetched successfully",
		data: getPermissionsGrouped(),
		timestamp: Date.now(),
	};
});

app.get("/route-permissions", async (_ctx) => {
	const permissions = (app as AnyElysia).routes.map((route) => {
		// Extract roleAuth from hooks
		return {
			method: route.method,
			path: route.path,
			permission: (
				route.hooks.detail as { "x-permission"?: string } | undefined
			)?.["x-permission"],
		};
	});
	return {
		success: true,
		message: "Route permissions fetched successfully",
		data: permissions,
		timestamp: Date.now(),
	};
});

app.listen(
	{
		port: process.env.PORT || 3000,
	},
	(app) => {
		console.log(`🦊 Elysia is running at ${app.hostname}:${app.port}`);
	},
);

process.on("uncaughtException", (error) => {
	logger.fatal("Uncaught Exception", {
		error: error.message,
		stack: error.stack,
	});
	process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
	logger.error("Unhandled Rejection at:", { promise, reason });
});

export type App = typeof app;
export * as databaseTypes from "./database/types";
export * as requestTypes from "./types";
export {
	type Permission,
	type PermissionFilter,
	PermissionGroupSchema,
	RESOURCE_DEFINITIONS,
} from "./constants/permissions";
