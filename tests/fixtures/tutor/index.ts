/**
 * Golden tutor raw payloads for eval tests (Phase 4).
 * Shapes mirror model JSON before normalizeAiToTutorResponse.
 */

/** New schema: fixes + nextQuestion */
export const structuredValidRaw = {
  summary: "Nice sentence.",
  fixes: [
    {
      id: "f1",
      category: "grammar",
      severity: "should_fix",
      evidence: [{ original: "er", corrected: "er", start: 4, end: 6 }],
      replacement: "er",
      explanation: "Use correct verb form here.",
      ruleConfidence: 0.9,
    },
  ],
  improvedVersion: "Jeg er glad.",
  nextQuestion: "Hva liker du å gjøre?",
  progressDelta: 1,
  meta: { model: "eval" },
};

/** Legacy schema */
export const legacyErrorRaw = {
  hasError: true,
  correction: "Jeg er glad.",
  explanation: "Small grammar fix.",
  praise: "",
  nextQuestion: "Fortell mer.",
  evidence: [{ type: "grammar", original: "er", corrected: "er" }],
};

/** Nonsense / not an object with expected shape */
export const invalidShapeRaw = "not json object";

/** Fix explanation contains assumption keyword → dropped by safety */
export const assumptionFixRaw = {
  summary: "Ok",
  fixes: [
    {
      id: "bad",
      category: "other",
      severity: "must_fix",
      evidence: [{ original: "hei", corrected: "hei", start: 0, end: 3 }],
      replacement: "hallo",
      explanation: "I probably misunderstood your intent.",
      ruleConfidence: 0.5,
    },
  ],
  nextQuestion: "Neste?",
};
