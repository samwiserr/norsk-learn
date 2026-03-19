/**
 * API Service
 * Abstraction layer for all API calls
 */

import { AppError, ErrorType } from "@/lib/error-handling";
import { withRetry, isRetryableError } from "@/lib/retry";
import { MAX_RETRIES, BASE_DELAY } from "@/lib/constants";
import { CEFRLevel } from "@/lib/cefr";
import { LanguageCode } from "@/lib/languages";
import { Message } from "@/lib/sessions";
import { createLogger } from "@/lib/logger";

const log = createLogger("ApiService");

export interface InitialQuestionResponse {
  welcomeMessage: string;
  firstQuestion?: string;
}

export interface ConversationResponse {
  uiLanguage?: LanguageCode;
  cefrLevel?: CEFRLevel;
  userInput?: string;
  summary?: string;
  fixes?: any[];
  improvedVersion?: string;
  nextQuestion: string;
  progressDelta?: number;
  hint?: string;
  vocabIntroduced?: { word: string; translation: string }[];

  // Legacy schema (backward compatibility)
  hasError?: boolean;
  correction?: string;
  explanation?: string;
  praise?: string;
}

export type StreamChunkCallback = (text: string) => void;

export class ApiService {
  /**
   * Get initial question for a CEFR level
   */
  static async getInitialQuestion(
    cefrLevel: CEFRLevel,
    language: LanguageCode = "en"
  ): Promise<InitialQuestionResponse> {
    log.info("getInitialQuestion called", { cefrLevel, language });
    try {
      return await withRetry(
        async () => {
          log.debug("Fetching /api/initial-question...");
          const response = await fetch("/api/initial-question", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cefrLevel, language }),
          });

          log.debug("Response status", { status: response.status, statusText: response.statusText });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            log.error("API error", { status: response.status, statusText: response.statusText, errorData });
            throw new AppError(
              errorData.type || ErrorType.API,
              errorData.error || "Request failed",
              errorData.code,
              errorData.retryable ?? (response.status >= 500)
            );
          }

          const data = await response.json();
          log.info("Successfully received initial question response");
          return data;
        },
        {
          maxRetries: MAX_RETRIES,
          baseDelay: BASE_DELAY,
          retryable: isRetryableError,
        }
      );
    } catch (error) {
      log.error("getInitialQuestion failed after retries", error);
      throw error;
    }
  }

  /**
   * Send a conversation message
   */
  static async sendMessage(
    userInput: string,
    cefrLevel: CEFRLevel,
    currentProgress: number,
    language: LanguageCode,
    conversationHistory: Message[],
    exerciseMode?: string,
    topicId?: string,
  ): Promise<ConversationResponse> {
    const MAX_HISTORY_MESSAGES = 20;
    const trimmedHistory = conversationHistory.length > MAX_HISTORY_MESSAGES
      ? conversationHistory.slice(-MAX_HISTORY_MESSAGES)
      : conversationHistory;

    log.info("sendMessage called", { cefrLevel, currentProgress, language, historyLength: trimmedHistory.length, exerciseMode, topicId });
    try {
      return await withRetry(
        async () => {
          log.debug("Fetching /api/conversation...");
          const response = await fetch("/api/conversation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userInput,
              cefrLevel,
              currentProgress,
              language,
              conversationHistory: trimmedHistory,
              exerciseMode,
              topicId,
            }),
          });

          log.debug("Response status", { status: response.status, statusText: response.statusText });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            log.error("API error", { status: response.status, statusText: response.statusText, errorData });
            throw new AppError(
              errorData.type || ErrorType.API,
              errorData.error || "Request failed",
              errorData.code,
              errorData.retryable ?? (response.status >= 500)
            );
          }

          const data = await response.json();
          log.info("Successfully received conversation response");
          return data;
        },
        {
          maxRetries: MAX_RETRIES,
          baseDelay: BASE_DELAY,
          retryable: isRetryableError,
        }
      );
    } catch (error) {
      log.error("sendMessage failed after retries", error);
      throw error;
    }
  }

  /**
   * Send a conversation message with streaming.
   * Raw text chunks are delivered via onChunk as they arrive.
   * Returns the final safety-filtered ConversationResponse once the stream completes.
   */
  static async sendMessageStreaming(
    userInput: string,
    cefrLevel: CEFRLevel,
    currentProgress: number,
    language: LanguageCode,
    conversationHistory: Message[],
    onChunk: StreamChunkCallback
  ): Promise<ConversationResponse> {
    const MAX_HISTORY_MESSAGES = 20;
    const trimmedHistory = conversationHistory.length > MAX_HISTORY_MESSAGES
      ? conversationHistory.slice(-MAX_HISTORY_MESSAGES)
      : conversationHistory;

    log.info("sendMessageStreaming called", { cefrLevel, currentProgress, language, historyLength: trimmedHistory.length });

    const response = await fetch("/api/conversation-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userInput,
        cefrLevel,
        currentProgress,
        language,
        conversationHistory: trimmedHistory,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      log.error("Stream API error", { status: response.status, errorData });
      throw new AppError(
        errorData.type || ErrorType.API,
        errorData.error || "Request failed",
        errorData.code,
        errorData.retryable ?? (response.status >= 500)
      );
    }

    if (!response.body) {
      throw new AppError(ErrorType.API, "No response body from stream", "NO_BODY", true);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult: ConversationResponse | null = null;

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          if (!jsonStr) continue;

          let data: Record<string, unknown>;
          try {
            data = JSON.parse(jsonStr);
          } catch {
            log.warn("Failed to parse SSE event:", jsonStr);
            continue;
          }

          if (data.type === "chunk" && typeof data.text === "string") {
            onChunk(data.text);
          } else if (data.type === "done" && data.result) {
            finalResult = data.result as ConversationResponse;
          } else if (data.type === "error") {
            throw new AppError(
              ErrorType.API,
              (data.error as string) || "Stream error",
              (data.code as string) || "STREAM_ERROR",
              (data.retryable as boolean) ?? true
            );
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!finalResult) {
      throw new AppError(ErrorType.API, "Stream ended without final result", "STREAM_INCOMPLETE", true);
    }

    log.info("Successfully received streaming conversation response");
    return finalResult;
  }
}

