import { z } from "zod";

/**
 * POST /api/pronunciation proxies the upstream service; success body is often JSON as text.
 * Client hooks typically do not parse through ApiService. This documents minimal error shape.
 */
export const pronunciationErrorBodySchema = z
  .object({
    error: z.string().optional(),
  })
  .passthrough();

export type PronunciationErrorBody = z.infer<typeof pronunciationErrorBodySchema>;
