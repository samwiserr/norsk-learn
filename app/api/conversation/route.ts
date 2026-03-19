import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildConversationPrompt } from "@/lib/conversation-prompts";
import { AppError, ErrorType, createAppError, reportErrorToSentry } from "@/lib/error-handling";
import { withRetry, isRetryableError } from "@/lib/retry";
import { config } from "@/lib/config";
import { createLogger } from "@/lib/logger";
import {
  sanitizeUserMessage,
  sanitizeCEFRLevel,
  sanitizeLanguageCode,
} from "@/lib/input-sanitization";
import { rateLimit } from "@/lib/rate-limiting";
import { setLanguageContext } from "@/sentry.server.config";
import { LanguageCode } from "@/lib/languages";
import {
  TutorResponse,
  TutorFix,
  EvidenceSpan,
  isTutorCategory,
  isTutorSeverity,
} from "@/lib/tutor";

const log = createLogger("ConversationAPI");

type LegacyAiConversationResponse = {
  hasError: boolean;
  correction?: string;
  explanation?: string;
  praise?: string;
  nextQuestion: string;
  progressDelta?: number;
  // Optional metadata fields (prompt may or may not include them)
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

const normalizeAiToTutorResponse = (
  userInput: string,
  cefrLevel: string,
  uiLanguage: LanguageCode,
  raw: unknown
): TutorResponse => {
  // New schema
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

  // Legacy schema
  if (isPlainObject(raw) && typeof raw.hasError === "boolean" && typeof raw.nextQuestion === "string") {
    return normalizeLegacyToTutorResponse(userInput, cefrLevel, uiLanguage, raw as LegacyAiConversationResponse);
  }

  // Fallback minimal
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
  language: string,
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

const containsAny = (text: string, patterns: RegExp[]) =>
  patterns.some((p) => p.test(text));

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


const normalize = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();

const levenshtein = (a: string, b: string) => {
  const s = normalize(a);
  const t = normalize(b);
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
  const s = normalize(a);
  const t = normalize(b);
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
  // Heuristic: capture capitalized words not at sentence-start pronouns.
  const t = normalize(text);
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
    // Skip sentence-start token unless it's clearly a name-like (length>=3 and not "Jeg"/etc.)
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

    // Never change capitalized entities (names/places) to something else.
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
  const sorted = [...fixes].sort((a, b) => {
    const sa = order[a.severity] ?? 9;
    const sb = order[b.severity] ?? 9;
    if (sa !== sb) return sa - sb;
    return (b.ruleConfidence ?? 0) - (a.ruleConfidence ?? 0);
  });
  return sorted;
};

const applySafetyFilters = (
  userInput: string,
  ai: TutorResponse,
  uiLanguage: string
): TutorResponse => {
  const safetyFlags: string[] = [];

  // Low-effort answers should never be praised; treat as incorrect and prompt to answer in Norwegian.
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

  // Filter bad fixes (entity swaps, missing evidence, or suspicious replacements).
  const filteredFixes = ai.fixes.flatMap((fix) => {
    if (!fix || !Array.isArray(fix.evidence) || fix.evidence.length === 0) return [];

    // Drop any fix that relies on assumption language ("assuming/probably/likely/...").
    // We prefer to omit the fix rather than risk hallucination.
    const fixHasAssumption = containsAny(fix.explanation || "", assumptionKeywords);
    if (fixHasAssumption) {
      safetyFlags.push("assumption_fix_dropped");
      return [];
    }

    // Evidence must match exact substring ranges
    const evidenceOk = fix.evidence.every((ev) => {
      if (!ev || typeof ev.start !== "number" || typeof ev.end !== "number") return false;
      if (ev.start < 0 || ev.end < ev.start || ev.end > userInput.length) return false;
      return userInput.slice(ev.start, ev.end) === ev.original;
    });
    if (!evidenceOk) {
      safetyFlags.push("invalid_evidence_span");
      return [];
    }

    // Block entity swaps: capitalized original -> different capitalized corrected/replacement
    for (const ev of fix.evidence) {
      if (ev.corrected && isCapitalizedWord(ev.original) && isCapitalizedWord(ev.corrected) && ev.original !== ev.corrected) {
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

  // Rewrite gate: if improvedVersion is a huge rewrite, drop it.
  let improvedVersion = ai.improvedVersion;
  if (improvedVersion) {
    const editRatio = normalizedEditDistance(userInput, improvedVersion);
    if (userInput.length >= 8 && editRatio > 0.55) {
      safetyFlags.push("excessive_rewrite_dropped");
      improvedVersion = undefined;
    }
  }

  // If we have fixes but no improvedVersion, synthesize a conservative one from local replacements.
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

// Initialize Gemini AI - use env var directly as fallback for build compatibility
const getGeminiApiKey = () => {
  // Try process.env first to avoid config validation issues
  let key = process.env.GEMINI_API_KEY || '';

  // If not in process.env, try config (but don't fail if config throws)
  if (!key) {
    try {
      key = config.gemini.apiKey || '';
    } catch (configError) {
      log.error('Config access failed, using process.env only:', configError);
    }
  }

  if (!key) {
    log.error('GEMINI_API_KEY is not set in process.env or config!');
    throw new Error('GEMINI_API_KEY is required');
  }

  if (key.length < 30) {
    log.warn('GEMINI_API_KEY appears to be invalid (too short):', key.length, 'characters');
  }

  return key;
};

// Lazy initialization - only create when needed
let genAI: GoogleGenerativeAI | null = null;
const getGenAI = () => {
  if (!genAI) {
    const apiKey = getGeminiApiKey();
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateLimitResult = await rateLimit(ip);

    if (!rateLimitResult.success) {
      const maxRequests = (() => {
        try {
          return config.rateLimit.maxRequests;
        } catch {
          return 100; // fallback
        }
      })();

      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          type: ErrorType.VALIDATION,
          retryable: false,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
          },
        }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          code: "INVALID_BODY",
          type: ErrorType.VALIDATION,
          retryable: false,
        },
        { status: 400 }
      );
    }

    const {
      userInput: rawUserInput,
      cefrLevel: rawCefrLevel,
      currentProgress = 0,
      language: rawLanguage = "en",
      conversationHistory = [],
      mode = "writing",
      exerciseMode,
      topicId,
    } = body;

    // Sanitize and validate inputs
    let userInput: string;
    let cefrLevel: string;
    let language: LanguageCode;

    try {
      userInput = sanitizeUserMessage(rawUserInput);
      cefrLevel = sanitizeCEFRLevel(rawCefrLevel);
      language = sanitizeLanguageCode(rawLanguage) as LanguageCode;
    } catch (validationError) {
      return NextResponse.json(
        {
          error: validationError instanceof Error
            ? validationError.message
            : "Invalid input",
          code: "VALIDATION_ERROR",
          type: ErrorType.VALIDATION,
          retryable: false,
        },
        { status: 400 }
      );
    }

    // Validate progress is a number
    if (typeof currentProgress !== 'number' || currentProgress < 0 || currentProgress > 100) {
      return NextResponse.json(
        {
          error: "Invalid currentProgress. Must be a number between 0 and 100",
          code: "VALIDATION_ERROR",
          type: ErrorType.VALIDATION,
          retryable: false,
        },
        { status: 400 }
      );
    }

    // Validate conversation history is an array
    if (!Array.isArray(conversationHistory)) {
      return NextResponse.json(
        {
          error: "Invalid conversationHistory. Must be an array",
          code: "VALIDATION_ERROR",
          type: ErrorType.VALIDATION,
          retryable: false,
        },
        { status: 400 }
      );
    }

    const prompt = buildConversationPrompt({
      userInput,
      cefrLevel,
      currentProgress,
      language,
      conversationHistory,
      mode: mode as "writing" | "speaking",
      exerciseMode: typeof exerciseMode === "string" ? exerciseMode : undefined,
      topicId: typeof topicId === "string" ? topicId : undefined,
    });

    // Retry logic for API calls
    const result = await withRetry(
      async () => {
        try {
          const ai = getGenAI();
          log.debug('Model: gemini-2.5-flash-lite, prompt length:', prompt.length);

          const model = ai.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

          const result = await model.generateContent(
            `Return ONLY JSON.\n${prompt}`
          );

          const text = result.response.text();
          log.info('Response received, length:', text?.length || 0);
          return text;
        } catch (apiError: any) {
          // Safely extract error information without circular references
          const errorInfo: any = {
            message: apiError?.message,
            status: apiError?.status,
            statusText: apiError?.statusText,
            code: apiError?.code,
            name: apiError?.name,
          };

          // Only include stack if it's a string
          if (typeof apiError?.stack === 'string') {
            errorInfo.stack = apiError.stack;
          }

          log.error('Gemini API error:', errorInfo);
          throw apiError;
        }
      },
      {
        maxRetries: 3,
        baseDelay: 1000,
        retryable: isRetryableError,
      }
    );

    if (!result) {
      throw new AppError(
        ErrorType.API,
        "No response from AI model",
        "EMPTY_RESPONSE",
        true
      );
    }

    // Extract JSON from markdown code blocks
    let jsonText = result.trim();

    if (jsonText.startsWith("```")) {
      const lines = jsonText.split("\n");
      lines.shift();
      const lastLine = lines[lines.length - 1];
      if (lines.length > 0 && lastLine && lastLine.trim() === "```") {
        lines.pop();
      }
      jsonText = lines.join("\n");
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    let rawParsed: unknown;
    try {
      rawParsed = JSON.parse(jsonText);
    } catch (parseError) {
      throw new AppError(
        ErrorType.API,
        "Invalid JSON response from AI",
        "PARSE_ERROR",
        true,
        parseError
      );
    }

    const tutor = normalizeAiToTutorResponse(userInput, cefrLevel, language, rawParsed);
    if (!tutor?.nextQuestion) {
      throw new AppError(
        ErrorType.API,
        "Invalid response structure from AI",
        "INVALID_STRUCTURE",
        true
      );
    }

    const filtered = applySafetyFilters(userInput, tutor, language);
    return NextResponse.json(filtered);

  } catch (error) {
    // Safe error logging helper to prevent serialization crashes
    const safeError = (err: unknown) => {
      if (err instanceof Error) {
        const result: any = {
          name: err.name,
          message: err.message,
          stack: err.stack,
        };
        if ((err as any).code) {
          result.code = (err as any).code;
        }
        if ((err as any).status) {
          result.status = (err as any).status;
        }
        return result;
      }
      try {
        return JSON.parse(JSON.stringify(err));
      } catch {
        return { type: typeof err, value: String(err) };
      }
    };

    const errorInfo = safeError(error);
    log.error("Top-level error caught:", errorInfo);

    // Handle AppError
    if (error instanceof AppError) {
      log.error("AppError details:", {
        type: error.type,
        code: error.code,
        message: error.message,
        retryable: error.retryable,
        ...(error.originalError ? { originalError: safeError(error.originalError) } : {})
      });
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          type: error.type,
          retryable: error.retryable,
          // Include original error message for debugging in development
          ...(process.env.NODE_ENV === 'development' && error.originalError instanceof Error ? {
            originalError: error.originalError.message
          } : {})
        },
        {
          status: error.type === ErrorType.VALIDATION ? 400 : 500
        }
      );
    }

    // Convert unknown errors to AppError
    // Get language from header (set by middleware) or default to 'en'
    const language: LanguageCode = (request.headers.get('x-locale') as LanguageCode) || 'en';

    // Set language context for Sentry before creating error
    if (language) {
      setLanguageContext(language);
    }

    const appError = createAppError(error, language);

    // Report to Sentry
    reportErrorToSentry(appError, language);

    log.error("Converted to AppError:", {
      type: appError.type,
      code: appError.code,
      message: appError.message,
      retryable: appError.retryable
    });
    return NextResponse.json(
      {
        error: appError.message,
        code: appError.code,
        type: appError.type,
        retryable: appError.retryable,
        // Include original error for debugging in development
        ...(process.env.NODE_ENV === 'development' ? {
          originalError: error instanceof Error ? error.message : String(error)
        } : {})
      },
      { status: 500 }
    );
  }
}