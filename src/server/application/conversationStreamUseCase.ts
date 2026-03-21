import "server-only";

import { buildConversationPrompt } from "@/lib/conversation-prompts";
import { AppError, createAppError, reportErrorToSentry } from "@/lib/error-handling";
import { withRetry, isRetryableError } from "@/lib/retry";
import { createLogger } from "@/lib/logger";
import {
  sanitizeUserMessage,
  sanitizeCEFRLevel,
  sanitizeLanguageCode,
} from "@/lib/input-sanitization";
import type { ConversationRequest } from "@/lib/contracts/conversation";
import { LanguageCode } from "@/lib/languages";
import {
  normalizeAiToTutorResponse,
  applySafetyFilters,
  cleanJsonResponse,
} from "@/lib/conversation-helpers";
import type { TextGenerationPort } from "@/src/server/integrations/ports/textGenerationPort";

const log = createLogger("ConversationStreamUseCase");

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

export type StreamSsePayload =
  | { type: "chunk"; text: string }
  | { type: "done"; result: unknown }
  | { type: "error"; error: string; code: string; retryable: boolean };

export async function* iterateConversationStream(
  port: TextGenerationPort,
  body: ConversationRequest,
  languageForErrors: LanguageCode
): AsyncGenerator<StreamSsePayload, void, undefined> {
  let userInput: string;
  let cefrLevel: string;
  let language: LanguageCode;

  try {
    if (body.turnType === "exercise_start") {
      userInput = "";
    } else {
      userInput = sanitizeUserMessage(body.userInput);
    }
    cefrLevel = sanitizeCEFRLevel(body.cefrLevel);
    language = sanitizeLanguageCode(body.language) as LanguageCode;
  } catch (e) {
    yield {
      type: "error",
      error: e instanceof Error ? e.message : "Invalid input",
      code: "VALIDATION_ERROR",
      retryable: false,
    };
    return;
  }

  const prompt = buildConversationPrompt({
    userInput,
    cefrLevel,
    currentProgress: body.currentProgress,
    language,
    conversationHistory: body.conversationHistory,
    mode: body.mode,
    exerciseMode: body.exerciseMode,
    topicId: body.topicId,
    turnType: body.turnType,
  });

  const fullPrompt = `Return ONLY JSON.\n${prompt}`;

  try {
    const streamResult = await withRetry(
      async () => {
        log.debug("Model:", DEFAULT_MODEL, "(stream), prompt length:", prompt.length);
        return port.createTextStream(fullPrompt, DEFAULT_MODEL);
      },
      { maxRetries: 3, baseDelay: 1000, retryable: isRetryableError }
    );

    let fullText = "";
    for await (const chunkText of streamResult) {
      if (chunkText) {
        fullText += chunkText;
        yield { type: "chunk", text: chunkText };
      }
    }

    if (!fullText.trim()) {
      yield {
        type: "error",
        error: "No response from AI model",
        code: "EMPTY_RESPONSE",
        retryable: true,
      };
      return;
    }

    log.info("Stream complete, total length:", fullText.length);

    const jsonText = cleanJsonResponse(fullText);
    let rawParsed: unknown;
    try {
      rawParsed = JSON.parse(jsonText);
    } catch {
      yield {
        type: "error",
        error: "Invalid JSON response from AI",
        code: "PARSE_ERROR",
        retryable: true,
      };
      return;
    }

    const tutor = normalizeAiToTutorResponse(userInput, cefrLevel, language, rawParsed);
    if (!tutor?.nextQuestion) {
      yield {
        type: "error",
        error: "Invalid response structure from AI",
        code: "INVALID_STRUCTURE",
        retryable: true,
      };
      return;
    }

    const filtered = applySafetyFilters(userInput, tutor, language);
    yield { type: "done", result: filtered };
  } catch (err) {
    log.error("Stream error:", err instanceof Error ? { name: err.name, message: err.message } : err);
    const appError = err instanceof AppError ? err : createAppError(err, languageForErrors);
    reportErrorToSentry(appError, languageForErrors);
    yield {
      type: "error",
      error: appError.message,
      code: appError.code ?? "STREAM_ERROR",
      retryable: appError.retryable,
    };
  }
}
