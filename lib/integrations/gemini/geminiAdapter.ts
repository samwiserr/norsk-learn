import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "@/lib/config";
import { createLogger } from "@/lib/logger";

const log = createLogger("GeminiAdapter");

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

function getGeminiApiKey() {
  try {
    const key = config.gemini.apiKey?.trim() || "";
    if (!key) {
      log.error("GEMINI_API_KEY is not set (use lib/config validated env).");
      throw new Error("GEMINI_API_KEY is required");
    }
    return key;
  } catch (e) {
    log.error("Gemini config access failed:", e);
    throw e instanceof Error ? e : new Error("GEMINI_API_KEY is required");
  }
}

let genAI: GoogleGenerativeAI | null = null;
function getGenAI() {
  if (!genAI) {
    const apiKey = getGeminiApiKey();
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Provider-specific: call Gemini and return the raw text output.
 * The caller is responsible for JSON extraction and normalization.
 */
export async function generateGeminiText(fullPrompt: string, model: string = DEFAULT_GEMINI_MODEL) {
  const ai = getGenAI();
  const modelClient = ai.getGenerativeModel({ model });
  const result = await modelClient.generateContent(fullPrompt);
  return result.response.text();
}

/**
 * Provider-specific: stream Gemini output into text chunks.
 * Caller is responsible for turning chunks into transport (SSE) and parsing.
 */
export async function* streamGeminiText(fullPrompt: string, model: string = DEFAULT_GEMINI_MODEL) {
  const ai = getGenAI();
  const modelClient = ai.getGenerativeModel({ model });
  const streamResult = await modelClient.generateContentStream(fullPrompt);

  for await (const chunk of streamResult.stream) {
    const chunkText = chunk.text();
    if (chunkText) {
      yield chunkText;
    }
  }
}

/**
 * Same as `streamGeminiText`, but returns an async-iterable after initializing the upstream stream.
 * This preserves "retry on stream initialization" behavior in callers.
 */
export async function createGeminiTextStream(
  fullPrompt: string,
  model: string = DEFAULT_GEMINI_MODEL
): Promise<AsyncIterable<string>> {
  const ai = getGenAI();
  const modelClient = ai.getGenerativeModel({ model });
  const streamResult = await modelClient.generateContentStream(fullPrompt);

  return {
    async *[Symbol.asyncIterator]() {
      for await (const chunk of streamResult.stream) {
        const chunkText = chunk.text();
        if (chunkText) yield chunkText;
      }
    },
  };
}

