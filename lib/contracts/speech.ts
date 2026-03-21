import { z } from "zod";

/** Successful JSON from GET /api/azure-speech-token. */
export const azureSpeechTokenSuccessSchema = z
  .object({
    token: z.string(),
    region: z.string(),
    expires_in: z.number().optional(),
    rate_limit: z
      .object({
        remaining: z.number().optional(),
      })
      .optional(),
  })
  .passthrough();

export type AzureSpeechTokenSuccess = z.infer<typeof azureSpeechTokenSuccessSchema>;
