import { z } from "zod";

export const checkoutRequestSchema = z.object({
  tutorId: z.union([z.string(), z.number()]),
  tutorName: z.string().optional(),
  rate: z.number().positive(),
});

/** Successful JSON from POST /api/checkout. */
export const checkoutSuccessSchema = z.object({
  sessionId: z.string(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
export type CheckoutSuccess = z.infer<typeof checkoutSuccessSchema>;
