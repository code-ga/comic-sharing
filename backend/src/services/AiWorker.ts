import { EventEmitter } from "node:events";
import { inspect } from "node:util";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output, type ModelMessage } from "ai";
import { and, eq, inArray } from "drizzle-orm";
import Elysia from "elysia";
import { db } from "../database";
import { table } from "../database/schema";
import type { SubtitleBox } from "../database/schema/comic";
import {
	type ChapterSummary,
	ChapterSummarySchema,
	type OCRPageOutput,
	OCRPageSchema,
	PageSummarySchema,
} from "../types";
import { getOrCreateSystemProfile } from "../utils/system-user";
import { logger } from "../utils/logger";

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


`;
/**
 * JSON format:

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
 */

const chapterPageSummarySystemPrompt = `You are analyzing a comic/manga/manhua page.

Input:

1. The comic page image
2. OCR extracted text from this page

Your task is to extract structured metadata about the page.

Analyze both the visual content and OCR text.

Focus on:

1. Scene summary

* Summarize what happens on this page in 1–3 sentences.

2. Characters

* Identify distinct characters if visible.
* Use descriptive placeholders if names are unknown.

3. Setting

* Describe the environment or location.

4. Objects

* List important visible objects.

5. Emotions

* Identify dominant emotions shown by characters.

6. Scene type
   Choose one:

* dialogue
* action
* exposition
* comedy
* romance
* horror
* suspense
* transition

7. Action level
   Choose one:

* low
* medium
* high

8. Important events

* Extract important events or reveals.

9. Content flags
   Choose all that apply:

* violence
* blood
* romance
* nudity
* horror
* comedy
* none

Rules:

* Use both image and OCR text.
* Do not invent details not supported by the image or text.
* If uncertain, use best-effort inference.
* Keep outputs concise.

Return JSON only.

{
"summary": "string",
"characters": ["string"],
"setting": "string",
"objects": ["string"],
"emotions": ["string"],
"scene_type": "dialogue|action|exposition|comedy|romance|horror|suspense|transition",
"action_level": "low|medium|high",
"important_events": ["string"],
"content_flags": ["string"]
}
`;

const chapterSummarySystemPrompt = `You are a comic chapter summarization engine.

Your job is to create a coherent chapter-level summary from ordered page-level summaries.

Input:

* A sequence of page summaries in chronological reading order.
* Optional important events extracted from each page.

Goals:

1. Build a coherent narrative of the chapter.
2. Preserve chronological order.
3. Merge repeated or similar events.
4. Highlight major character actions, conflicts, reveals, and emotional turning points.
5. Identify important themes and progression.
6. Avoid redundancy.
7. Do not invent events, dialogue, or characters not present in the input.

Rules:

* Treat page summaries as the source of truth.
* Prioritize plot-significant events over minor visual details.
* Keep the narrative concise but complete.
* Maintain story continuity across pages.
* If multiple pages describe the same event, merge them into one narrative point.
* If a character name is unknown, use descriptive placeholders.
* Do not mention page numbers in the final summary.

Output JSON only.

Return:

{
"summary": "A concise but complete summary of the chapter narrative.",
"major_events": [
"Important event 1",
"Important event 2"
],
"characters": [
"Character name or placeholder"
],
"themes": [
"theme1",
"theme2"
],
"emotional_arc": [
"emotion progression across the chapter"
],
"chapter_type": "action|dialogue|exposition|romance|comedy|horror|mixed"
}
`;

export class AiWorker extends EventEmitter<EventMap> {
	openRouter: import("@openrouter/ai-sdk-provider").OpenRouterProvider;
	constructor() {
		super();
		this.openRouter = createOpenRouter({
			apiKey: process.env.HACK_CLUB_AI_API_KEY,
			baseUrl: "https://ai.hackclub.com/proxy/v1",
		});
	}
	async Start() {
		logger.info("Ai worker started");
		try {
			await this.loop(); // Wait for completion
			logger.info("Task loop finished");
		} catch (error) {
			logger.error("Task loop failed", error);
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

		const chaptersToCheck = new Set<number>();

		for (const task of tasks) {
			try {
				await db
					.update(table.taskTable)
					.set({ status: "claimed" })
					.where(eq(table.taskTable.id, task.id));
				logger.info("Processing task", { taskId: task.id, taskType: task.taskType });

				if (task.taskType === "chapter") {
					if (!task.chapterId) throw new Error("Task missing chapter id");
					const chapter = await db.query.chapters.findFirst({
						where: { id: task.chapterId },
					});
					if (!chapter) throw new Error("Chapter not found");

					const chapterPages = await db.query.chapterPages.findMany({
						where: { chapterId: task.chapterId },
						orderBy: { pageNumber: "asc" },
						with: { subtitle: true },
					});

					const inputSummaries = chapterPages
						.map((p) => {
							const sub = p.subtitle?.[0];
							if (!sub) return null;
							return {
								pageNumber: p.pageNumber,
								summary: sub.summary,
								important_events: sub.important_events,
							};
						})
						.filter(Boolean);

					const response = await generateText({
						model: this.openRouter(
							"nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
						),
						output: Output.object({
							schema: ChapterSummarySchema,
						}),
						messages: [
							{
								role: "system",
								content: chapterSummarySystemPrompt,
							},
							{
								role: "user",
								content: [
									{
										type: "text",
										text: JSON.stringify(inputSummaries),
									},
								],
							},
						],
					});

					const summaryResult = ChapterSummarySchema.parse(response.output);

					await db
						.update(table.chapters)
						.set({
							summary: summaryResult.summary,
							majorEvents: summaryResult.major_events,
							characters: summaryResult.characters,
							themes: summaryResult.themes,
							emotionalArc: summaryResult.emotional_arc,
							chapterType: summaryResult.chapter_type as any,
							updatedAt: new Date(),
						})
						.where(eq(table.chapters.id, task.chapterId));

					await db
						.update(table.taskTable)
						.set({
							status: "completed",
							stepStatus: { ...task.stepStatus, chapterSummary: true },
							stepResult: { ...task.stepResult, chapterSummary: summaryResult },
							updatedAt: new Date(),
						})
						.where(eq(table.taskTable.id, task.id));

					continue;
				}

				if (!task.chapterPageId)
					throw new Error("Task missing chapter page id");
				const chapterPage = await db.query.chapterPages.findFirst({
					where: { id: task.chapterPageId },
				});
				if (!chapterPage) throw new Error("Task missing chapter page");

				if (!task.stepStatus?.ocr) {
					let response;
					const reqConfig = {
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
						] as ModelMessage[],
					};

					try {
						response = await generateText({
							model: this.openRouter("baidu/qianfan-ocr-fast:free"),
							...reqConfig,
						});
					} catch (ocrError) {
						logger.error(
							"Primary OCR failed, falling back to gemini-1.5-flash:free",
							ocrError,
						);
						response = await generateText({
							model: this.openRouter(
								"nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
							),
							...reqConfig,
						});
					}

					const ocrResult: OCRPageOutput = OCRPageSchema.parse(response.output);
					const boxs = ocrResult.blocks.map(
						(block) =>
							({
								x: block.bbox.x,
								y: block.bbox.y,
								width: block.bbox.width,
								height: block.bbox.height,
								text: block.text,
								boxType: block.type,
								order: block.order,
							}) as SubtitleBox,
					);

					const content = ocrResult.blocks
						.map((block) => block.text.trim())
						.filter(Boolean)
						.join("\n\n");

					await db
						.update(table.chapterPageSubtitles)
						.set({
							boxs: { boxs: boxs },
							content,
							readingDirection: ocrResult.reading_direction as any,
							updatedAt: new Date(),
						})
						.where(
							eq(table.chapterPageSubtitles.id, task.chapterPageSubtitlesId!),
						);

					await db
						.update(table.taskTable)
						.set({
							status: "pending",
							stepStatus: { ...task.stepStatus, ocr: true },
							stepResult: { ...task.stepResult, ocr: ocrResult },
							updatedAt: new Date(),
						})
						.where(eq(table.taskTable.id, task.id));
				} else if (!task.stepStatus.metadataExtraction) {
					const response = await generateText({
						model: this.openRouter(
							"nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
						),
						output: Output.object({
							schema: PageSummarySchema,
						}),
						messages: [
							{
								role: "system",
								content: chapterPageSummarySystemPrompt,
							},
							{
								role: "user",
								content: [
									{
										type: "text",
										text: JSON.stringify(task.stepResult?.ocr),
									},
									{
										type: "image",
										image: chapterPage.imageUrl,
									},
								],
							},
						],
					});
					const summaryResult = PageSummarySchema.parse(response.output);
					await db
						.update(table.chapterPageSubtitles)
						.set({
							...summaryResult,
							scene_type: summaryResult.scene_type,
							action_level: summaryResult.action_level,
							updatedAt: new Date(),
						})
						.where(
							eq(table.chapterPageSubtitles.id, task.chapterPageSubtitlesId),
						);
					await db
						.update(table.taskTable)
						.set({
							status: "completed",
							stepStatus: { ...task.stepStatus, metadataExtraction: true },
							stepResult: {
								...task.stepResult,
								metadataExtraction: summaryResult,
							},
							updatedAt: new Date(),
						})
						.where(eq(table.taskTable.id, task.id));

					if (chapterPage.chapterId) {
						chaptersToCheck.add(chapterPage.chapterId);
					}
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

		for (const chapterId of chaptersToCheck) {
			try {
				await this.checkChapterCompletion(chapterId);
			} catch (error) {
				logger.error("Failed to check chapter completion", {
					chapterId,
					error,
				});
			}
		}
	}

	private async checkChapterCompletion(chapterId: number) {
		const chapter = await db.query.chapters.findFirst({
			where: { id: chapterId },
			with: { pages: true },
		});

		if (chapter && chapter.pages && chapter.pages.length > 0) {
			const pageIdsNum = chapter.pages.map((p) => p.id);
			// Need to use explicit type since inArray requires it
			const allTasks = await db
				.select()
				.from(table.taskTable)
				.where(
					and(
						eq(table.taskTable.taskType, "page"),
						inArray(table.taskTable.chapterPageId, pageIdsNum),
					),
				);

			const tasksByPageId = new Set(allTasks.map((t) => t.chapterPageId));
			const allPagesHaveTasks = pageIdsNum.every((id) => tasksByPageId.has(id));
			const noPendingTasks = allTasks.every(
				(t) => t.status !== "pending" && t.status !== "claimed",
			);

			if (allPagesHaveTasks && noPendingTasks) {
				const successfulTasks = allTasks.filter(
					(t) => t.status === "completed" && t.stepStatus?.metadataExtraction,
				);
				const successRate = successfulTasks.length / chapter.pageIds.length;
				logger.info("Chapter completion check", {
					chapterId,
					successRate: `${(successRate * 100).toFixed(2)}%`,
				});
				if (successRate >= 0.9) {
					const existingActiveChapterTasks = await db
						.select()
						.from(table.taskTable)
						.where(
							and(
								eq(table.taskTable.taskType, "chapter"),
								eq(table.taskTable.chapterId, chapter.id),
								inArray(table.taskTable.status, ["pending", "claimed"]),
							),
						)
						.limit(1);

					if (existingActiveChapterTasks.length === 0) {
						logger.info("Creating chapter summary task", { chapterId });
						await db.insert(table.taskTable).values({
							taskType: "chapter",
							chapterId: chapter.id,
							status: "pending",
							stepStatus: { ocr: false, metadataExtraction: false },
						});
					}
				}
			}
		}
	}
	async End() {
		await db
			.update(table.taskTable)
			.set({
				status: "pending",
				updatedAt: new Date(),
			})
			.where(eq(table.taskTable.status, "claimed"));
	}

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
