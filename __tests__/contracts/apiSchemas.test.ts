/**
 * @jest-environment node
 */
import {
  openaiRealtimeSuccessSchema,
} from "@/lib/contracts/realtime";
import {
  azureSpeechTokenSuccessSchema,
} from "@/lib/contracts/speech";
import { pronunciationErrorBodySchema } from "@/lib/contracts/pronunciation";

describe("api contract schemas (smoke)", () => {
  describe("openaiRealtimeSuccessSchema", () => {
    it("accepts a valid upstream response", () => {
      expect(
        openaiRealtimeSuccessSchema.parse({
          client_secret: { value: "cs_test", expires_at: 123 },
          session_id: "sess_123",
          expires_at: 123,
          model: "gpt-4o-realtime-preview-2024-12-17",
          rate_limit: { remaining: 3 },
        })
      ).toBeTruthy();
    });

    it("rejects missing required keys", () => {
      expect(() =>
        openaiRealtimeSuccessSchema.parse({
          // missing client_secret + session_id
          model: "gpt-4o-realtime-preview-2024-12-17",
        })
      ).toThrow();
    });
  });

  describe("azureSpeechTokenSuccessSchema", () => {
    it("accepts a valid token response", () => {
      expect(
        azureSpeechTokenSuccessSchema.parse({
          token: "token123",
          region: "norwayeast",
          expires_in: 600,
          rate_limit: { remaining: 5 },
        })
      ).toBeTruthy();
    });
  });

  describe("pronunciationErrorBodySchema", () => {
    it("accepts minimal error shape", () => {
      expect(pronunciationErrorBodySchema.parse({ error: "Bad gateway" })).toBeTruthy();
    });
  });
});

