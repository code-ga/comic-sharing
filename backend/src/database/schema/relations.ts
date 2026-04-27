import * as auth from "./auth";
import * as app from "./app";
import { defineRelations } from "drizzle-orm";

export const table = {
	...auth,
	...app,
} as const;

export const schemaRelations = defineRelations(table, (r) => ({
	profile: {
		user: r.one.user({
			from: r.profile.userId,
			to: r.user.id,
		}),
		roles: r.many.role({
			from: r.profile.id,
			to: r.role.profileIds,
		}),
	},
	role: {
		profiles: r.many.profile({
			from: r.role.profileIds,
			to: r.profile.id,
		}),
	},
	user: {
		profile: r.one.profile({
			from: r.user.id,
			to: r.profile.userId,
		}),
	},
}));
export type Table = typeof table;
