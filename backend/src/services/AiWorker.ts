import Elysia from "elysia";
import { EventEmitter } from "node:events";
import { db } from "../database";

interface EventMap extends Record<string, any[]> {}

export class AiWorker extends EventEmitter<EventMap> {
	constructor() {
		super();
	}
	async Start() {
		const task = await db.query.taskTable.findMany({
      where:{
        status:"pending"
      }
    });
	}
	async End() {}
}
export const AiWorkerSerivce = new Elysia({ name: "ai-worker" })
	.decorate("AiWorker", new AiWorker())
	.onStart(async (ctx) => {
		await ctx.decorator.AiWorker.Start();
	})
	.onStop(async (ctx) => {
		await ctx.decorator.AiWorker.End();
	});
