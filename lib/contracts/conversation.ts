import { z } from "zod";
import { cefrLevelSchema, languageCodeSchema } from "@/lib/contracts/primitives";

/** One message in conversation history sent to the API. */
export const conversationMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "assistant-streaming"]),
  content: z.string(),
  timestamp: z.number(),
});

export const conversationTurnTypeSchema = z.enum(["conversation", "exercise_start"]);

export const conversationRequestSchema = z
  .object({
    userInput: z.string(),
    cefrLevel: cefrLevelSchema,
    currentProgress: z.number().min(0).max(100),
    language: languageCodeSchema,
    conversationHistory: z.array(conversationMessageSchema),
    mode: z.enum(["writing", "speaking"]).default("writing"),
    exerciseMode: z.string().optional(),
    topicId: z.string().optional(),
    /** Structured exercise opener — no synthetic `[EXERCISE_START]` user line in client history */
    turnType: conversationTurnTypeSchema.default("conversation"),
  })
  .superRefine((data, ctx) => {
    if (data.turnType === "conversation" && data.userInput.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "userInput is required for conversation turns",
        path: ["userInput"],
      });
    }
  });

const evidenceSpanSchema = z
  .object({
    original: z.string(),
    corrected: z.string().optional(),
    start: z.number().optional(),
    end: z.number().optional(),
  })
  .passthrough();

export const tutorFixSchema = z
  .object({
    id: z.string().optional(),
    category: z.string().optional(),
    severity: z.enum(["must_fix", "should_fix", "suggestion"]).optional(),
    evidence: z.array(evidenceSpanSchema).default([]),
    replacement: z.string().optional(),
    explanation: z.string().optional(),
    ruleConfidence: z.number().optional(),
  })
  .passthrough();

const vocabItemSchema = z.object({
  word: z.string(),
  translation: z.string().optional(),
});

/**
 * Successful tutor payload from POST /api/conversation and SSE `done` from /api/conversation-stream.
 * Matches server `TutorResponse` plus optional client-only extensions used by SessionContext / tutorFormat.
 */
export const tutorConversationResponseSchema = z
  .object({
    uiLanguage: languageCodeSchema.optional(),
    cefrLevel: cefrLevelSchema.optional(),
    userInput: z.string().optional(),
    summary: z.string().optional(),
    fixes: z.array(tutorFixSchema).optional(),
    improvedVersion: z.string().optional(),
    nextQuestion: z.string(),
    progressDelta: z.number().optional(),
    meta: z
      .object({
        safetyFlags: z.array(z.string()).optional(),
        model: z.string().optional(),
      })
      .passthrough()
      .optional(),
    hint: z.string().optional(),
    vocabIntroduced: z.array(vocabItemSchema).optional(),
    // Legacy shape still supported by formatTutorAssistantMessage
    hasError: z.boolean().optional(),
    correction: z.string().optional(),
    explanation: z.string().optional(),
    praise: z.string().optional(),
  })
  .passthrough();

export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type ConversationRequest = z.infer<typeof conversationRequestSchema>;
export type TutorConversationResponse = z.infer<typeof tutorConversationResponseSchema>;
