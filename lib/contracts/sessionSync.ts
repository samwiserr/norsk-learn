import { z } from "zod";

/** Opaque session bundle stored server-side (validated size only). */
export const sessionSnapshotSchema = z.object({
  version: z.number().int().min(1).max(1).default(1),
  /** Client wall clock when bundle was saved (ms); used for deterministic merge */
  updatedAt: z.number().optional(),
  sessions: z.array(z.record(z.unknown())).default([]),
  activeSessionId: z.string().optional(),
});

export const sessionSyncRequestSchema = z
  .object({
    snapshot: sessionSnapshotSchema,
  })
  .superRefine((val, ctx) => {
    const len = JSON.stringify(val.snapshot).length;
    if (len > 450_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Snapshot too large (max ~450KB JSON)",
        path: ["snapshot"],
      });
    }
  });

export type SessionSnapshot = z.infer<typeof sessionSnapshotSchema>;
export type SessionSyncRequest = z.infer<typeof sessionSyncRequestSchema>;
