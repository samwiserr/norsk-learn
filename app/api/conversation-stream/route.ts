import { NextRequest, NextResponse } from "next/server";
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
import { LanguageCode } from "@/lib/languages";
import {
  normalizeAiToTutorResponse,
  applySafetyFilters,
  getGenAI,
  cleanJsonResponse,
} from "@/lib/conversation-helpers";

const log = createLogger("ConversationStreamAPI");

export const dynamic = "force-dynamic";

function sseEvent(data: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest) {
  // --- Pre-stream validation (returns normal HTTP errors) ---

  const ip = request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  try {
    const rateLimitResult = await rateLimit(ip);
    if (!rateLimitResult.success) {
      const maxRequests = (() => {
        try { return config.rateLimit.maxRequests; } catch { return 100; }
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
            "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
            "X-RateLimit-Limit": maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining?.toString() || "0",
          },
        }
      );
    }
  } catch (rlError) {
    log.error("Rate limit check failed:", rlError);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "INVALID_BODY", type: ErrorType.VALIDATION, retryable: false },
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
  } = body;

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
        error: validationError instanceof Error ? validationError.message : "Invalid input",
        code: "VALIDATION_ERROR",
        type: ErrorType.VALIDATION,
        retryable: false,
      },
      { status: 400 }
    );
  }

  if (typeof currentProgress !== "number" || currentProgress < 0 || currentProgress > 100) {
    return NextResponse.json(
      { error: "Invalid currentProgress. Must be a number between 0 and 100", code: "VALIDATION_ERROR", type: ErrorType.VALIDATION, retryable: false },
      { status: 400 }
    );
  }

  if (!Array.isArray(conversationHistory)) {
    return NextResponse.json(
      { error: "Invalid conversationHistory. Must be an array", code: "VALIDATION_ERROR", type: ErrorType.VALIDATION, retryable: false },
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
  });

  // --- SSE stream ---

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const streamResult = await withRetry(
          async () => {
            const ai = getGenAI();
            log.debug("Model: gemini-2.5-flash-lite (stream), prompt length:", prompt.length);
            const model = ai.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
            return model.generateContentStream(`Return ONLY JSON.\n${prompt}`);
          },
          { maxRetries: 3, baseDelay: 1000, retryable: isRetryableError }
        );

        let fullText = "";

        for await (const chunk of streamResult.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            fullText += chunkText;
            controller.enqueue(sseEvent({ type: "chunk", text: chunkText }));
          }
        }

        if (!fullText.trim()) {
          controller.enqueue(sseEvent({
            type: "error",
            error: "No response from AI model",
            code: "EMPTY_RESPONSE",
            retryable: true,
          }));
          controller.close();
          return;
        }

        log.info("Stream complete, total length:", fullText.length);

        const jsonText = cleanJsonResponse(fullText);
        let rawParsed: unknown;
        try {
          rawParsed = JSON.parse(jsonText);
        } catch {
          controller.enqueue(sseEvent({
            type: "error",
            error: "Invalid JSON response from AI",
            code: "PARSE_ERROR",
            retryable: true,
          }));
          controller.close();
          return;
        }

        const tutor = normalizeAiToTutorResponse(userInput, cefrLevel, language, rawParsed);
        if (!tutor?.nextQuestion) {
          controller.enqueue(sseEvent({
            type: "error",
            error: "Invalid response structure from AI",
            code: "INVALID_STRUCTURE",
            retryable: true,
          }));
          controller.close();
          return;
        }

        const filtered = applySafetyFilters(userInput, tutor, language);
        controller.enqueue(sseEvent({ type: "done", result: filtered }));
        controller.close();
      } catch (err) {
        log.error("Stream error:", err instanceof Error ? { name: err.name, message: err.message } : err);

        const appError = err instanceof AppError
          ? err
          : createAppError(err, language);
        reportErrorToSentry(appError, language);

        controller.enqueue(sseEvent({
          type: "error",
          error: appError.message,
          code: appError.code,
          retryable: appError.retryable,
        }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
