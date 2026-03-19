import { CEFRLevel } from "@/lib/cefr";
import { LanguageCode } from "@/lib/languages";

export type TutorSeverity = "must_fix" | "should_fix" | "suggestion";

export type TutorCategory =
  | "spelling"
  | "inflection"
  | "word_order"
  | "article_definiteness"
  | "pronoun"
  | "preposition"
  | "vocabulary"
  | "idiom_naturalness"
  | "register_tone"
  | "coherence_logic"
  | "punctuation"
  | "other";

export type EvidenceItem = {
  original: string; // exact substring from user input
  corrected?: string; // corrected form (if applicable)
};

export type EvidenceSpan = EvidenceItem & {
  start: number;
  end: number; // exclusive
};

export type TutorFix = {
  id: string;
  category: TutorCategory;
  severity: TutorSeverity;
  evidence: EvidenceSpan[]; // server enriches start/end based on evidence.original
  replacement?: string; // minimal local replacement (Bokmål)
  explanation: string; // UI language
  ruleConfidence: number; // 0..1
};

export type TutorResponse = {
  uiLanguage: LanguageCode;
  cefrLevel: CEFRLevel;
  userInput: string;

  summary: string; // UI language
  fixes: TutorFix[];
  improvedVersion?: string; // Bokmål (optional)
  nextQuestion: string; // Bokmål
  progressDelta?: number;

  // Debug/telemetry. Must never be shown to users.
  meta?: {
    safetyFlags?: string[];
    model?: string;
  };
};

export const isTutorSeverity = (v: unknown): v is TutorSeverity =>
  v === "must_fix" || v === "should_fix" || v === "suggestion";

export const isTutorCategory = (v: unknown): v is TutorCategory => {
  const set: Set<TutorCategory> = new Set([
    "spelling",
    "inflection",
    "word_order",
    "article_definiteness",
    "pronoun",
    "preposition",
    "vocabulary",
    "idiom_naturalness",
    "register_tone",
    "coherence_logic",
    "punctuation",
    "other",
  ]);
  return typeof v === "string" && set.has(v as TutorCategory);
};


