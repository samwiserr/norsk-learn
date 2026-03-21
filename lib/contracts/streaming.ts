import { z } from "zod";

export const sseChunkEventSchema = z
  .object({
    type: z.literal("chunk"),
    text: z.string(),
  })
  .passthrough();

export const sseErrorEventSchema = z
  .object({
    type: z.literal("error"),
    error: z.string().optional(),
    code: z.string().optional(),
    retryable: z.boolean().optional(),
  })
  .passthrough();

export const sseDoneEventSchema = z
  .object({
    type: z.literal("done"),
    result: z.unknown(),
  })
  .passthrough();

export const sseEventSchema = z.union([
  sseChunkEventSchema,
  sseErrorEventSchema,
  sseDoneEventSchema,
]);

export type SseChunkEvent = z.infer<typeof sseChunkEventSchema>;
export type SseErrorEvent = z.infer<typeof sseErrorEventSchema>;
export type SseDoneEvent = z.infer<typeof sseDoneEventSchema>;
