/**
 * Single module for tutor JSON → TutorResponse normalization and safety filters.
 * Used by POST /api/conversation, /api/conversation-stream (via conversation-helpers), and eval tests.
 * @see ADR-005
 */
import { LanguageCode } from "@/lib/languages";
import {
  TutorResponse,
  TutorFix,
  EvidenceSpan,
  isTutorCategory,
  isTutorSeverity,
} from "@/lib/tutor";

type LegacyAiConversationResponse = {
  hasError: boolean;
  correction?: string;
  explanation?: string;
  praise?: string;
  nextQuestion: string;
  progressDelta?: number;
  errorTypes?: string[];
  evidence?: Array<{
    type: string;
    original: string;
    corrected?: string;
  }>;
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const toStringSafe = (v: unknown) => (typeof v === "string" ? v : "");

const normalizeLegacyToTutorResponse = (
  userInput: string,
  cefrLevel: string,
  uiLanguage: LanguageCode,
  legacy: LegacyAiConversationResponse
): TutorResponse => {
  const summary = legacy.hasError
    ? toStringSafe(legacy.explanation)
    : toStringSafe(legacy.praise);

  const legacyEvidence = Array.isArray(legacy.evidence) ? legacy.evidence : [];
  const fixes: TutorFix[] = legacy.hasError
    ? [
        {
          id: "legacy_fix_1",
          category: "other",
          severity: "must_fix",
          evidence: legacyEvidence
            .filter((e) => typeof e?.original === "string" && e.original.length > 0)
            .flatMap((e) => {
              const idx = userInput.indexOf(e.original);
              if (idx < 0) return [];
              return [
                {
                  original: e.original,
                  corrected: typeof e?.corrected === "string" ? e.corrected : undefined,
                  start: idx,
                  end: idx + e.original.length,
                },
              ];
            }),
          replacement: toStringSafe(legacy.correction) || undefined,
          explanation: toStringSafe(legacy.explanation) || summary || "",
          ruleConfidence: 0.7,
        },
      ]
    : [];

  return {
    uiLanguage,
    cefrLevel: (cefrLevel as TutorResponse["cefrLevel"]) ?? "A1",
    userInput,
    summary: summary || "",
    fixes,
    improvedVersion: legacy.hasError ? toStringSafe(legacy.correction) || undefined : undefined,
    nextQuestion: toStringSafe(legacy.nextQuestion) || "Kan du si det en gang til?",
    progressDelta: legacy.progressDelta,
    meta: { model: "legacy" },
  };
};

const enrichEvidenceSpans = (userInput: string, evidence: unknown): EvidenceSpan[] => {
  const items = Array.isArray(evidence) ? evidence : [];
  const spans: EvidenceSpan[] = [];
  for (const ev of items) {
    if (!isPlainObject(ev)) continue;
    const original = toStringSafe(ev.original);
    const corrected = toStringSafe(ev.corrected) || undefined;
    if (!original) continue;
    const start = userInput.indexOf(original);
    if (start < 0) continue;
    spans.push({ original, corrected, start, end: start + original.length });
  }
  return spans;
};

export const normalizeAiToTutorResponse = (
  userInput: string,
  cefrLevel: string,
  uiLanguage: LanguageCode,
  raw: unknown
): TutorResponse => {
  if (isPlainObject(raw) && Array.isArray(raw.fixes) && typeof raw.nextQuestion === "string") {
    const fixes: TutorFix[] = (raw.fixes as unknown[]).flatMap((f, idx) => {
      if (!isPlainObject(f)) return [];
      const category = isTutorCategory(f.category) ? f.category : "other";
      const severity = isTutorSeverity(f.severity) ? f.severity : "should_fix";
      const explanation = toStringSafe(f.explanation);
      const ruleConfidence =
        typeof f.ruleConfidence === "number" && Number.isFinite(f.ruleConfidence)
          ? Math.min(1, Math.max(0, f.ruleConfidence))
          : 0.7;
      const id = toStringSafe(f.id) || `fix_${idx + 1}`;
      const replacement = toStringSafe(f.replacement) || undefined;
      const evidenceSpans = enrichEvidenceSpans(userInput, f.evidence);
      if (evidenceSpans.length === 0) return [];
      if (!explanation) return [];
      return [
        {
          id,
          category,
          severity,
          evidence: evidenceSpans,
          replacement,
          explanation,
          ruleConfidence,
        },
      ];
    });

    return {
      uiLanguage,
      cefrLevel: (cefrLevel as TutorResponse["cefrLevel"]) ?? "A1",
      userInput,
      summary: toStringSafe(raw.summary),
      fixes,
      improvedVersion: toStringSafe(raw.improvedVersion) || undefined,
      nextQuestion: toStringSafe(raw.nextQuestion) || "Kan du si det en gang til?",
      progressDelta: typeof raw.progressDelta === "number" ? raw.progressDelta : undefined,
      meta: isPlainObject(raw.meta) ? (raw.meta as TutorResponse["meta"]) : undefined,
    };
  }

  if (isPlainObject(raw) && typeof raw.hasError === "boolean" && typeof raw.nextQuestion === "string") {
    return normalizeLegacyToTutorResponse(userInput, cefrLevel, uiLanguage, raw as LegacyAiConversationResponse);
  }

  return {
    uiLanguage,
    cefrLevel: (cefrLevel as TutorResponse["cefrLevel"]) ?? "A1",
    userInput,
    summary: "",
    fixes: [],
    nextQuestion: "Kan du si det en gang til?",
    progressDelta: 0,
    meta: { safetyFlags: ["invalid_ai_shape"] },
  };
};

const DEFAULT_HALLUCINATION_FALLBACK = {
  explanation:
    "I'm not fully confident in that correction, so I'm keeping your original sentence. If you want, paste your sentence again and I'll check it carefully.",
  praise: "Thanks - let's continue.",
} as const;

const getHallucinationFallback = (
  language: string
): { explanation: string; praise: string } => {
  const map: Record<string, { explanation: string; praise: string }> = {
    en: DEFAULT_HALLUCINATION_FALLBACK,
    no: {
      explanation:
        "Jeg er ikke helt sikker pa den rettelsen, sa jeg beholder den originale setningen din. Hvis du vil, lim inn setningen pa nytt, sa sjekker jeg den noye.",
      praise: "Takk - la oss fortsette.",
    },
    it: {
      explanation:
        "Non sono del tutto sicuro di quella correzione, quindi mantengo la tua frase originale. Se vuoi, incolla di nuovo la frase e la ricontrollo con attenzione.",
      praise: "Grazie - continuiamo.",
    },
  };
  return map[language] ?? DEFAULT_HALLUCINATION_FALLBACK;
};

const containsAny = (text: string, patterns: RegExp[]) => patterns.some((p) => p.test(text));

const assumptionKeywords: RegExp[] = [
  /\bassum(?:e|ing)\b/i,
  /\bi\s*assume\b/i,
  /\bprobably\b/i,
  /\blikely\b/i,
  /\bsuppose\b/i,
  /\bforutsatt\b/i,
  /\bantar\b/i,
  /\bkanskje\b/i,
  /\bprobabilmente\b/i,
  /\bsuppongo\b/i,
  /\bje\s*suppose\b/i,
  /\bvermutlich\b/i,
];

const normalizeStr = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .trim();

const levenshtein = (a: string, b: string) => {
  const s = normalizeStr(a);
  const t = normalizeStr(b);
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const v0 = new Array(t.length + 1).fill(0);
  const v1 = new Array(t.length + 1).fill(0);
  for (let i = 0; i < v0.length; i++) v0[i] = i;
  for (let i = 0; i < s.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < t.length; j++) {
      const cost = s[i] === t[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j < v0.length; j++) v0[j] = v1[j];
  }
  return v1[t.length];
};

const normalizedEditDistance = (a: string, b: string) => {
  const s = normalizeStr(a);
  const t = normalizeStr(b);
  const denom = Math.max(s.length, t.length, 1);
  return levenshtein(s, t) / denom;
};

const isLowEffortNonNorwegian = (userInput: string) => {
  const t = userInput.trim().toLowerCase();
  return t === "none" || t === "nil" || t === "n/a" || t === "na" || t === "null" || t === "undefined";
};

const isCapitalizedWord = (token: string) => {
  const first = token.trim().charAt(0);
  return first && first === first.toUpperCase() && first !== first.toLowerCase();
};

const extractCapitalizedEntities = (text: string) => {
  const t = normalizeStr(text);
  const tokens = t.split(/\s+/);
  const stop = new Set([
    "Jeg",
    "Du",
    "Han",
    "Hun",
    "Vi",
    "De",
    "Det",
    "Den",
    "I",
    "En",
    "Et",
    "Ei",
  ]);
  const entities = new Set<string>();
  tokens.forEach((tok, idx) => {
    const cleaned = tok.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    if (!cleaned) return;
    const first = cleaned.charAt(0);
    const isCap = first === first.toUpperCase() && first !== first.toLowerCase();
    if (!isCap) return;
    if (stop.has(cleaned)) return;
    if (idx === 0) return;
    entities.add(cleaned);
  });
  return entities;
};

const buildSafeImprovedVersionFromFixes = (userInput: string, fixes: TutorFix[]) => {
  let out = userInput;
  for (const fix of fixes) {
    const replacement = typeof fix.replacement === "string" ? fix.replacement : "";
    if (!replacement) continue;
    const firstSpan = fix.evidence?.[0];
    if (!firstSpan?.original) continue;
    const o = firstSpan.original;
    if (isCapitalizedWord(o) && isCapitalizedWord(replacement) && o !== replacement) {
      continue;
    }
    if (out.includes(o)) out = out.split(o).join(replacement);
  }
  const trimmed = out.trim();
  return trimmed && !/[.!?]$/.test(trimmed) ? `${trimmed}.` : trimmed;
};

const sortFixesBySeverityAndConfidence = (fixes: TutorFix[]) => {
  const order: Record<string, number> = { must_fix: 0, should_fix: 1, suggestion: 2 };
  return [...fixes].sort((a, b) => {
    const sa = order[a.severity] ?? 9;
    const sb = order[b.severity] ?? 9;
    if (sa !== sb) return sa - sb;
    return (b.ruleConfidence ?? 0) - (a.ruleConfidence ?? 0);
  });
};

export const applySafetyFilters = (
  userInput: string,
  ai: TutorResponse,
  uiLanguage: string
): TutorResponse => {
  const safetyFlags: string[] = [];

  if (isLowEffortNonNorwegian(userInput)) {
    safetyFlags.push("low_effort_input");
    return {
      ...ai,
      userInput,
      summary:
        uiLanguage === "no"
          ? "Vennligst svar pa norsk bokmal (en kort setning er nok)."
          : "Please answer in Norwegian Bokmal (even a short sentence is fine).",
      fixes: [
        {
          id: "low_effort",
          category: "other",
          severity: "must_fix",
          evidence: [{ original: userInput, corrected: undefined, start: 0, end: userInput.length }],
          replacement: undefined,
          explanation:
            uiLanguage === "no"
              ? "Svar med en kort setning pa norsk bokmal."
              : "Reply with a short sentence in Norwegian Bokmal.",
          ruleConfidence: 1,
        },
      ],
      improvedVersion: undefined,
      progressDelta: 0,
      meta: { ...(ai.meta ?? {}), safetyFlags },
    };
  }

  const hasAssumption = ai.fixes.some((f) => containsAny(f.explanation || "", assumptionKeywords));
  if (hasAssumption) safetyFlags.push("assumption_language");

  const userEntities = extractCapitalizedEntities(userInput);

  const filteredFixes = ai.fixes.flatMap((fix) => {
    if (!fix || !Array.isArray(fix.evidence) || fix.evidence.length === 0) return [];

    const fixHasAssumption = containsAny(fix.explanation || "", assumptionKeywords);
    if (fixHasAssumption) {
      safetyFlags.push("assumption_fix_dropped");
      return [];
    }

    const evidenceOk = fix.evidence.every((ev) => {
      if (!ev || typeof ev.start !== "number" || typeof ev.end !== "number") return false;
      if (ev.start < 0 || ev.end < ev.start || ev.end > userInput.length) return false;
      return userInput.slice(ev.start, ev.end) === ev.original;
    });
    if (!evidenceOk) {
      safetyFlags.push("invalid_evidence_span");
      return [];
    }

    for (const ev of fix.evidence) {
      if (
        ev.corrected &&
        isCapitalizedWord(ev.original) &&
        isCapitalizedWord(ev.corrected) &&
        ev.original !== ev.corrected
      ) {
        safetyFlags.push("entity_swap_blocked");
        return [];
      }
    }

    const replacement = fix.replacement ?? "";
    if (replacement) {
      const replEntities = extractCapitalizedEntities(replacement);
      const newEntities = [...replEntities].filter((e) => !userEntities.has(e));
      if (newEntities.length > 0) {
        safetyFlags.push("replacement_introduces_new_entity");
        return [];
      }
    }

    return [fix];
  });

  const sortedFixes = sortFixesBySeverityAndConfidence(filteredFixes);

  let improvedVersion = ai.improvedVersion;
  if (improvedVersion) {
    const editRatio = normalizedEditDistance(userInput, improvedVersion);
    if (userInput.length >= 8 && editRatio > 0.55) {
      safetyFlags.push("excessive_rewrite_dropped");
      improvedVersion = undefined;
    }
  }

  if (!improvedVersion && sortedFixes.length > 0) {
    improvedVersion = buildSafeImprovedVersionFromFixes(userInput, sortedFixes) || undefined;
    safetyFlags.push("synthesized_improved_version");
  }

  const fallback = getHallucinationFallback(uiLanguage);
  const summary = (ai.summary || "").trim() || (sortedFixes.length > 0 ? "" : fallback.explanation);

  return {
    ...ai,
    userInput,
    summary,
    fixes: sortedFixes,
    improvedVersion,
    meta: { ...(ai.meta ?? {}), ...(safetyFlags.length ? { safetyFlags } : {}) },
  };
};
