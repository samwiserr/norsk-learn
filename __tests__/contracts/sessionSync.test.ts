/**
 * @jest-environment node
 */
import { sessionSyncRequestSchema } from "@/lib/contracts/sessionSync";

describe("sessionSyncRequestSchema", () => {
  it("accepts a small snapshot", () => {
    const v = sessionSyncRequestSchema.parse({
      snapshot: { version: 1, sessions: [{ id: "s1" }], activeSessionId: "s1" },
    });
    expect(v.snapshot.version).toBe(1);
  });

  it("rejects oversized snapshot", () => {
    const big = "x".repeat(500_000);
    expect(() =>
      sessionSyncRequestSchema.parse({
        snapshot: { version: 1, sessions: [{ blob: big }] },
      })
    ).toThrow();
  });
});
