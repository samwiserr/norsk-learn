import "server-only";

import { buildConversationPrompt } from "@/lib/conversation-prompts";
import { AppError, ErrorType } from "@/lib/error-handling";
import { withRetry, isRetryableError } from "@/lib/retry";
import { createLogger } from "@/lib/logger";
import {
  sanitizeUserMessage,
  sanitizeCEFRLevel,
  sanitizeLanguageCode,
} from "@/lib/input-sanitization";
import type { ConversationRequest } from "@/lib/contracts/conversation";
import { LanguageCode } from "@/lib/languages";
import { normalizeAiToTutorResponse, applySafetyFilters } from "@/lib/tutor-runtime";
import type { TextGenerationPort } from "@/src/server/integrations/ports/textGenerationPort";

const log = createLogger("ConversationTurnUseCase");

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

function extractJsonObjectText(raw: string): string {
  let jsonText = raw.trim();
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
  return jsonText;
}

export async function runConversationTurn(
  port: TextGenerationPort,
  body: ConversationRequest
): Promise<unknown> {
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
    throw new AppError(
      ErrorType.VALIDATION,
      e instanceof Error ? e.message : "Invalid input",
      "VALIDATION_ERROR",
      false
    );
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

  const result = await withRetry(
    async () => {
      log.debug("Model:", DEFAULT_MODEL, "prompt length:", prompt.length);
      const text = await port.generateText(fullPrompt, DEFAULT_MODEL);
      log.info("Response received, length:", text?.length || 0);
      return text;
    },
    { maxRetries: 3, baseDelay: 1000, retryable: isRetryableError }
  );

  if (!result) {
    throw new AppError(ErrorType.API, "No response from AI model", "EMPTY_RESPONSE", true);
  }

  const jsonText = extractJsonObjectText(result);

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

  return applySafetyFilters(userInput, tutor, language);
}
