/**
 * API Service
 * Abstraction layer for all API calls
 */

import { AppError, ErrorType, createAppError } from "@/lib/error-handling";
import { withRetry, isRetryableError } from "@/lib/retry";
import { MAX_RETRIES, BASE_DELAY } from "@/lib/constants";
import { CEFRLevel } from "@/lib/cefr";
import { LanguageCode } from "@/lib/languages";
import { Message } from "@/lib/sessions";

export interface InitialQuestionResponse {
  welcomeMessage: string;
  firstQuestion?: string;
}

export interface ConversationResponse {
  hasError: boolean;
  correction?: string;
  explanation?: string;
  praise?: string;
  nextQuestion: string;
  progressDelta?: number;
}

export class ApiService {
  /**
   * Get initial question for a CEFR level
   */
  static async getInitialQuestion(
    cefrLevel: CEFRLevel,
    language: LanguageCode = "en"
  ): Promise<InitialQuestionResponse> {
    return withRetry(
      async () => {
        const response = await fetch("/api/initial-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cefrLevel, language }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new AppError(
            errorData.type || ErrorType.API,
            errorData.error || "Request failed",
            errorData.code,
            errorData.retryable ?? (response.status >= 500)
          );
        }

        return response.json();
      },
      {
        maxRetries: MAX_RETRIES,
        baseDelay: BASE_DELAY,
        retryable: isRetryableError,
      }
    );
  }

  /**
   * Send a conversation message
   */
  static async sendMessage(
    userInput: string,
    cefrLevel: CEFRLevel,
    currentProgress: number,
    language: LanguageCode,
    conversationHistory: Message[]
  ): Promise<ConversationResponse> {
    return withRetry(
      async () => {
        const response = await fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userInput,
            cefrLevel,
            currentProgress,
            language,
            conversationHistory,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new AppError(
            errorData.type || ErrorType.API,
            errorData.error || "Request failed",
            errorData.code,
            errorData.retryable ?? (response.status >= 500)
          );
        }

        return response.json();
      },
      {
        maxRetries: MAX_RETRIES,
        baseDelay: BASE_DELAY,
        retryable: isRetryableError,
      }
    );
  }
}

