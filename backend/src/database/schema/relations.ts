import { user } from "./auth";
import { defineRelations } from "drizzle-orm";

export const table = {
	user,
} as const;

export const schemaRelations = defineRelations(table, (r) => ({}));
export type Table = typeof table;
