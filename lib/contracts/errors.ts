import { z } from "zod";

/**
 * Common JSON error body shape returned by App Router API routes on failure.
 * Fields vary slightly by route; this is the union we normalize in the client.
 */
export const apiErrorBodySchema = z
  .object({
    error: z.string().optional(),
    code: z.string().optional(),
    type: z.string().optional(),
    retryable: z.boolean().optional(),
    retryAfter: z.number().optional(),
    detail: z.unknown().optional(),
  })
  .passthrough();

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
