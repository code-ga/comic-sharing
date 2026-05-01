import { type Static, type TSchema, Type, Type as t } from "@sinclair/typebox";
import z from "zod";

export const baseResponseSchema = <T extends TSchema>(dataSchema: T) => {
	return t.Object({
		success: t.Boolean(),
		message: t.Optional(t.String()),
		data: dataSchema,
		timestamp: Type.Transform(Type.Optional(Type.Number()))
			.Decode((value) => value ?? Date.now()) // Set dynamic default on decode
			.Encode((value) => value),
		status: t.Optional(
			t.Number({
				default: 200,
			}),
		),
	});
};

export type BaseResponse<T extends TSchema> = Static<
	ReturnType<typeof baseResponseSchema<T>>
>;

export const paginatedResponseSchema = <T extends TSchema>(dataSchema: T) => {
	return baseResponseSchema(
		t.Object({
			items: t.Array(dataSchema),
			total: t.Number(),
			page: t.Number(),
			pageSize: t.Number(),
			totalPages: t.Number(),
		}),
	);
};

export type PaginatedResponse<T extends TSchema> = Static<
	ReturnType<typeof paginatedResponseSchema<T>>
>;

export const cursorPaginatedResponseSchema = <T extends TSchema>(dataSchema: T) => {
	return baseResponseSchema(
		t.Object({
			items: t.Array(dataSchema),
			total: t.Number(),
			limit: t.Number(),
			nextCursor: t.Optional(t.String()),
		}),
	);
};

export type CursorPaginatedResponse<T extends TSchema> = Static<
	ReturnType<typeof cursorPaginatedResponseSchema<T>>
>;

export const errorResponseSchema = t.Object({
	success: t.Boolean({ default: false }),
	message: t.String(),
	timestamp: Type.Transform(Type.Optional(Type.Number()))
		.Decode((value) => value ?? Date.now()) // Set dynamic default on decode
		.Encode((value) => value),
	status: t.Optional(
		t.Number({
			default: 500,
		}),
	),
});
export type ErrorResponse = Static<typeof errorResponseSchema>;


export const OCRPageSchema = z.object({
	page_language: z.string(),

	reading_direction: z.enum(["ltr", "rtl", "vertical"]),

	blocks: z.array(
		z.object({
			id: z.string(),

			type: z.enum([
				"dialogue",
				"narration",
				"sound_effect",
				"title",
				"background_text",
			]),

			text: z.string(),

			confidence: z.number().min(0).max(1),

			bbox: z.object({
				x: z.number(),
				y: z.number(),
				width: z.number(),
				height: z.number(),
			}),

			order: z.number().int().nonnegative(),
		}),
	),
});
export type OCRPageOutput = z.infer<typeof OCRPageSchema>;
