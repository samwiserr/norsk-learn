/** @jest-environment node */
import {
  normalizeAiToTutorResponse,
  applySafetyFilters,
} from "@/lib/tutor-runtime/normalizeAndSafety";
import {
  structuredValidRaw,
  legacyErrorRaw,
  invalidShapeRaw,
  assumptionFixRaw,
} from "../fixtures/tutor";

const UI = "en" as const;
const USER = "Jeg er glad i norsk";
const CEFR = "A2";

describe("tutor-runtime eval", () => {
  describe("normalizeAiToTutorResponse", () => {
    it("parses structured schema with aligned evidence spans", () => {
      const raw = {
        ...structuredValidRaw,
        fixes: [
          {
            ...structuredValidRaw.fixes[0],
            evidence: [{ original: "glad", corrected: "glad", start: 7, end: 11 }],
          },
        ],
      };
      const n = normalizeAiToTutorResponse(USER, CEFR, UI, raw);
      expect(n.nextQuestion).toBe("Hva liker du å gjøre?");
      expect(n.fixes).toHaveLength(1);
      expect(n.fixes[0]?.evidence[0]?.original).toBe("glad");
    });

    it("maps legacy error schema", () => {
      const user = "Jeg er feil her";
      const legacy = {
        ...legacyErrorRaw,
        evidence: [{ type: "x", original: "feil", corrected: "riktig" }],
      };
      const n = normalizeAiToTutorResponse(user, CEFR, UI, legacy);
      expect(n.fixes.length).toBeGreaterThanOrEqual(1);
      expect(n.meta?.model).toBe("legacy");
      expect(n.nextQuestion).toBeTruthy();
    });

    it("falls back to invalid_ai_shape for garbage input", () => {
      const n = normalizeAiToTutorResponse(USER, CEFR, UI, invalidShapeRaw);
      expect(n.meta?.safetyFlags).toContain("invalid_ai_shape");
      expect(n.fixes).toHaveLength(0);
    });
  });

  describe("applySafetyFilters", () => {
    it("flags low-effort English tokens", () => {
      const normalized = normalizeAiToTutorResponse("none", CEFR, UI, {
        summary: "Great!",
        fixes: [],
        nextQuestion: "Ok?",
      });
      const out = applySafetyFilters("none", normalized, "en");
      expect(out.meta?.safetyFlags).toContain("low_effort_input");
      expect(out.fixes[0]?.id).toBe("low_effort");
    });

    it("drops fixes whose explanation uses assumption language", () => {
      const n = normalizeAiToTutorResponse("hei der", CEFR, UI, assumptionFixRaw);
      expect(n.fixes).toHaveLength(1);
      const out = applySafetyFilters("hei der", n, "en");
      expect(out.fixes).toHaveLength(0);
      expect(out.meta?.safetyFlags).toEqual(
        expect.arrayContaining(["assumption_fix_dropped", "assumption_language"])
      );
    });

    it("preserves non-empty summary when fixes are dropped (no forced fallback if summary exists)", () => {
      const n = normalizeAiToTutorResponse("hei der", CEFR, UI, assumptionFixRaw);
      const out = applySafetyFilters("hei der", n, "en");
      expect(out.fixes).toHaveLength(0);
      expect(out.summary).toBe("Ok");
    });

    it("uses hallucination fallback when summary empty and no fixes after filter", () => {
      const raw = { ...assumptionFixRaw, summary: "" };
      const n = normalizeAiToTutorResponse("hei der", CEFR, UI, raw);
      const out = applySafetyFilters("hei der", n, "en");
      expect(out.fixes).toHaveLength(0);
      expect(out.summary).toMatch(/confident|correction|sentence/i);
    });
  });
});
