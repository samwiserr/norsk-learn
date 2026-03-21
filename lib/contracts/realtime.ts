import { z } from "zod";

/** Body for POST /api/openai-realtime. */
export const openaiRealtimeRequestSchema = z.object({
  model: z.string().optional(),
  modalities: z.array(z.string()).optional(),
});

export type OpenaiRealtimeRequest = z.infer<typeof openaiRealtimeRequestSchema>;

/** OpenAI may return client_secret as a string or { value: string }. */
export const openaiClientSecretSchema = z.union([
  z.string(),
  z.object({ value: z.string() }).passthrough(),
]);

/** Successful JSON from POST /api/openai-realtime. */
export const openaiRealtimeSuccessSchema = z
  .object({
    client_secret: openaiClientSecretSchema,
    session_id: z.string(),
    expires_at: z.number().optional(),
    model: z.string(),
    rate_limit: z
      .object({
        remaining: z.number().optional(),
      })
      .optional(),
  })
  .passthrough();

export type OpenaiRealtimeSuccess = z.infer<typeof openaiRealtimeSuccessSchema>;
