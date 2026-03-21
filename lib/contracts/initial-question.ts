import { z } from "zod";
import { cefrLevelSchema, languageCodeSchema } from "@/lib/contracts/primitives";

export const initialQuestionRequestSchema = z.object({
  cefrLevel: cefrLevelSchema,
  language: languageCodeSchema.default("en"),
});

/** Successful JSON from POST /api/initial-question (Gemini JSON payload). */
export const initialQuestionResponseSchema = z
  .object({
    welcomeMessage: z.string(),
    firstQuestion: z.string().optional(),
  })
  .passthrough();

export type InitialQuestionRequest = z.infer<typeof initialQuestionRequestSchema>;
export type InitialQuestionResponse = z.infer<typeof initialQuestionResponseSchema>;
