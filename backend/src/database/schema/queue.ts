import { pgEnum, pgTable, serial } from "drizzle-orm/pg-core";

const taskStatusEnum = pgEnum("queue_status", [
	"claim",
	"pending",
	"failed",
	"complete",
]);

export const taskTable = pgTable("worker_queue", {
	id: serial("id").primaryKey().unique(),
	status: taskStatusEnum("status"),
});
