import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import { eq } from "drizzle-orm";
import Elysia from "elysia";
import { EventEmitter } from "node:events";
import { inspect } from "node:util";
import { db } from "../database";
import { table } from "../database/schema";
import { type OCRPageOutput, OCRPageSchema } from "../types";
import { getOrCreateSystemProfile } from "../utils/system-user";

interface EventMap extends Record<string, unknown[]> {}

const ocrSystemPrompt = `You are an OCR engine specialized in comic, manga, and manhua pages.

Analyze this comic page image and extract all readable dialogue, narration, sound effects, and visible text.

Rules:

1. Detect all text regions in the image.
2. Preserve natural reading order:

   * Left-to-right for western comics.
   * Top-to-bottom / right-to-left if the layout suggests manga-style reading.
3. Separate each text block individually.
4. Return exact text without correction unless OCR confidence is extremely low.
5. Ignore watermarks, UI overlays, timestamps, and unrelated platform labels.
6. Distinguish text types:

   * dialogue
   * narration
   * sound_effect
   * title
   * sign/background_text
7. Provide bounding boxes for every text block for inpainting.
8. Merge text inside the same speech bubble into one block.
9. If text is partially hidden, extract visible content only.
10. If text is unreadable, skip it.

Output JSON only.

JSON format:

{
"page_language": "string",
"reading_direction": "ltr|rtl|vertical",
"blocks": [
{
"id": "string",
"type": "dialogue|narration|sound_effect|title|background_text",
"text": "string",
"confidence": 0.0,
"bbox": {
"x": 0,
"y": 0,
"width": 0,
"height": 0
},
"order": 0
}
]
}
`;

export class AiWorker extends EventEmitter<EventMap> {
	openRouter: import("@openrouter/ai-sdk-provider").OpenRouterProvider;
	loopInterval: NodeJS.Timeout | undefined;
	constructor() {
		super();
		this.openRouter = createOpenRouter({
			apiKey: process.env.HACK_CLUB_AI_API_KEY,
			baseUrl: "https://ai.hackclub.com/proxy/v1",
		});
	}
	async Start() {
		console.log("Ai worker started");
		try {
			await this.loop(); // Wait for completion
			console.log("Task finished!");
		} catch (error) {
			console.error("Task failed:", error);
		} finally {
			// Schedule the next run ONLY after the current one is done
			setTimeout(this.Start.bind(this), 1000);
		}
	}

	async loop() {
		const tasks = await db.query.taskTable.findMany({
			where: {
				status: "pending",
			},
			orderBy: {
				createdAt: "asc",
			},
		});
		for (const task of tasks) {
			try {
				await db
					.update(table.taskTable)
					.set({ status: "claimed" })
					.where(eq(table.taskTable.id, task.id));
				console.log(`Processing task`, task);
				const chapterPage = await db.query.chapterPages.findFirst({
					where: { id: task.chapterPageId },
				});
				if (!chapterPage) throw new Error("Task missing chapter page");

				if (!task.stepStatus?.ocr) {
					const response = await generateText({
						model: this.openRouter("baidu/qianfan-ocr-fast:free"),
						output: Output.object({
							schema: OCRPageSchema,
						}),
						messages: [
							{
								role: "system",
								content: ocrSystemPrompt,
							},
							{
								role: "user",
								content: [
									{
										type: "text",
										text: "What is in this image?",
									},
									{
										type: "image",
										image: chapterPage.imageUrl,
									},
								],
							},
						],
					});

					const ocrResult: OCRPageOutput = OCRPageSchema.parse(response.output);
					const boxs = ocrResult.blocks.map((block) => ({
						x: block.bbox.x,
						y: block.bbox.y,
						width: block.bbox.width,
						height: block.bbox.height,
						text: block.text,
						translatedText: {},
					}));

					const content = ocrResult.blocks
						.map((block) => block.text.trim())
						.filter(Boolean)
						.join("\n\n");

					await db
						.update(table.chapterPageSubtitles)
						.set({
							boxs: { boxs: boxs },
							content,
							updatedAt: new Date(),
						})
						.where(
							eq(table.chapterPageSubtitles.id, task.chapterPageSubtitlesId),
						);

					await db
						.update(table.taskTable)
						.set({
							status: "pending",
							stepStatus: { ocr: true },
							stepResult: { ocr: ocrResult },
							updatedAt: new Date(),
						})
						.where(eq(table.taskTable.id, task.id));
				}
			} catch (error) {
				await db
					.update(table.taskTable)
					.set({
						status: "failed",
						errorLog: inspect(error),
						updatedAt: new Date(),
					})
					.where(eq(table.taskTable.id, task.id));
			}
		}
	}
	async End() {}

	async getDefaultUser() {
		return await getOrCreateSystemProfile();
	}
}
export const AiWorkerSerivce = new Elysia({ name: "ai-worker" })
	.decorate("AiWorker", new AiWorker())
	.onStart(async (ctx) => {
		await ctx.decorator.AiWorker.Start();
	})
	.onStop(async (ctx) => {
		await ctx.decorator.AiWorker.End();
	});
