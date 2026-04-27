import Elysia from "elysia";
import {
	evaluatePermissionFilter,
	resolveUserPermissions,
	type PermissionFilter,
} from "../constants/permissions";
import { db } from "../database";
import { auth } from "../libs/auth.config";
import { logger } from "../utils/logger";

export const authenticationMiddleware = new Elysia({
	name: "authentication",
}).macro({
	userAuth: (config: { requiredProfile: boolean }) => ({
		async resolve({ status, request: { headers, url } }) {
			logger.info("Authentication middleware");
			logger.info("Path: ", url);
			const session = await auth.api.getSession({
				headers,
			});

			if (!session)
				return status(401, { success: false, message: "Unauthorized" });
			const profile = await db.query.profile.findFirst({
				where: {
					userId: session.user.id,
				},
			});
			if (config.requiredProfile && !profile)
				return status(401, { success: false, message: "Unauthorized" });
			return {
				user: session.user,
				session: session.session,
				profile: profile,
			};
		},
	}),
	roleAuth: (filter: PermissionFilter) => ({
		async resolve({ status, request: { headers } }) {
			const session = await auth.api.getSession({ headers });
			if (!session)
				return status(401, { success: false, message: "Unauthorized" });

			const profile = await db.query.profile.findFirst({
				where: { userId: session.user.id },
			});
			if (!profile)
				return status(401, { success: false, message: "Unauthorized" });

			const userPermissions = await resolveUserPermissions(profile.rolesIDs);
			if (!evaluatePermissionFilter(userPermissions, filter))
				return status(403, { success: false, message: "Forbidden" });

			return {
				user: session.user,
				session: session.session,
				profile,
				userPermissions, // Set<Permission> available in route handlers
			};
		},
		detail: {
			tags: ["auth"],
			"x-permission": filter, // picked up by /route-permissions endpoint
		},
	}),

	optionalAuth: {
		async resolve({ request: { headers } }) {
			const session = await auth.api.getSession({ headers });
			if (!session) return {}; // No auth, but that's okay
			const profile = await db.query.profile.findFirst({
				where: { userId: session.user.id },
			});
			return {
				user: session.user,
				session: session.session,
				profile: profile || null,
			};
		},
	},
});
