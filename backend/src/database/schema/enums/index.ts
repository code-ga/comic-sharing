import { pgEnum } from "drizzle-orm/pg-core";

export const taskStatusEnum = pgEnum("queue_status", [
	"claim",
	"pending",
	"failed",
	"complete",
]);