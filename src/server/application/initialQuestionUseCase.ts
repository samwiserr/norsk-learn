import "server-only";

import { buildInitialQuestionPrompt } from "@/lib/conversation-prompts";
import { sanitizeCEFRLevel, sanitizeLanguageCode } from "@/lib/input-sanitization";
import { AppError, ErrorType } from "@/lib/error-handling";
import { createLogger } from "@/lib/logger";
import type { InitialQuestionRequest } from "@/lib/contracts/initial-question";
import type { TextGenerationPort } from "@/src/server/integrations/ports/textGenerationPort";

const log = createLogger("InitialQuestionUseCase");

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

export async function runInitialQuestion(
  port: TextGenerationPort,
  body: InitialQuestionRequest
): Promise<unknown> {
  let cefrLevel: string;
  let language: string;

  try {
    cefrLevel = sanitizeCEFRLevel(body.cefrLevel);
    language = sanitizeLanguageCode(body.language);
  } catch (e) {
    throw new AppError(
      ErrorType.VALIDATION,
      e instanceof Error ? e.message : "Invalid input",
      "VALIDATION_ERROR",
      false
    );
  }

  const prompt = buildInitialQuestionPrompt(cefrLevel, language);
  const fullPrompt = `Respond with JSON only.\n${prompt}`;

  log.debug("Initial question prompt length:", prompt.length);
  const responseText = await port.generateText(fullPrompt, DEFAULT_MODEL);
  log.info("Response received, length:", responseText?.length || 0);

  if (!responseText) {
    throw new AppError(ErrorType.API, "No response from Gemini", "EMPTY_RESPONSE", true);
  }

  const jsonText = extractJsonObjectText(responseText);

  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    throw new AppError(
      ErrorType.API,
      "Invalid JSON response from AI",
      "PARSE_ERROR",
      true,
      parseError
    );
  }
}
