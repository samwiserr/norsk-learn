/**
 * API Service
 * Abstraction layer for all API calls (schema-validated responses in Phase 1).
 */

import { AppError, ErrorType, reportErrorToSentry } from "@/lib/error-handling";
import { withRetry, isRetryableError } from "@/lib/retry";
import { MAX_RETRIES, BASE_DELAY } from "@/lib/constants";
import { CEFRLevel } from "@/lib/cefr";
import { LanguageCode } from "@/lib/languages";
import { Message } from "@/lib/sessions";
import { createLogger } from "@/lib/logger";
import { parseResponseBody } from "@/lib/api/parseResponse";
import {
  initialQuestionResponseSchema,
  type InitialQuestionResponse as InitialQuestionResponseValidated,
} from "@/lib/contracts/initial-question";
import {
  conversationRequestSchema,
  tutorConversationResponseSchema,
  type TutorConversationResponse,
} from "@/lib/contracts/conversation";
import { sseEventSchema } from "@/lib/contracts/streaming";
import {
  openaiRealtimeSuccessSchema,
  type OpenaiRealtimeSuccess,
} from "@/lib/contracts/realtime";
import {
  azureSpeechTokenSuccessSchema,
  type AzureSpeechTokenSuccess,
} from "@/lib/contracts/speech";
import { z } from "zod";
import { sessionSnapshotSchema } from "@/lib/contracts/sessionSync";
import { Session, validateSession } from "@/lib/sessions";
import { randomHexBytes } from "@/lib/secureRandom";
import { getOrCreateDeviceId } from "@/src/utils/deviceId";
import { getCurrentUser } from "@/lib/firebase/auth";

const log = createLogger("ApiService");

const sessionRestoreResponseSchema = z.object({
  found: z.boolean(),
  snapshot: sessionSnapshotSchema.nullable(),
});

const sessionSyncPostResponseSchema = z
  .object({
    ok: z.boolean(),
    synced: z.boolean().optional(),
    reason: z.string().optional(),
  })
  .passthrough();

function createRequestId(): string {
  // Browser-friendly request id correlation for publicRoute preflight.
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `req_${Date.now()}_${randomHexBytes(8)}`;
}

function withRequestIdHeaders(
  requestId: string,
  headers: Record<string, string> = {}
): Record<string, string> {
  return {
    ...headers,
    "x-request-id": requestId,
  };
}

/** Validated initial-question payload from POST /api/initial-question. */
export type InitialQuestionResponse = InitialQuestionResponseValidated;

/**
 * Tutor conversation success payload (conversation + streaming done).
 * @deprecated Prefer importing TutorConversationResponse from @/lib/contracts/conversation
 */
export type ConversationResponse = TutorConversationResponse;

export type StreamChunkCallback = (text: string) => void;

function buildConversationRequestBody(
  userInput: string,
  cefrLevel: CEFRLevel,
  currentProgress: number,
  language: LanguageCode,
  conversationHistory: Message[],
  exerciseMode?: string,
  topicId?: string,
  turnType: "conversation" | "exercise_start" = "conversation"
) {
  const MAX_HISTORY_MESSAGES = 20;
  const trimmedHistory =
    conversationHistory.length > MAX_HISTORY_MESSAGES
      ? conversationHistory.slice(-MAX_HISTORY_MESSAGES)
      : conversationHistory;

  return conversationRequestSchema.parse({
    userInput: turnType === "exercise_start" ? "" : userInput,
    cefrLevel,
    currentProgress,
    language,
    conversationHistory: trimmedHistory,
    exerciseMode,
    topicId,
    turnType,
  });
}

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
      const requestId = createRequestId();
      return await withRetry(
        async () => {
          log.debug("Fetching /api/initial-question...");
          const response = await fetch("/api/initial-question", {
            method: "POST",
            headers: withRequestIdHeaders(requestId, {
              "Content-Type": "application/json",
            }),
            body: JSON.stringify({ cefrLevel, language }),
          });

          log.debug("Response status", { status: response.status, statusText: response.statusText });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            log.error("API error", { status: response.status, statusText: response.statusText, errorData });
            throw new AppError(
              (errorData as { type?: ErrorType }).type || ErrorType.API,
              (errorData as { error?: string }).error || "Request failed",
              (errorData as { code?: string }).code,
              (errorData as { retryable?: boolean }).retryable ?? response.status >= 500
            );
          }

          const data: unknown = await response.json();
          log.info("Successfully received initial question response");
          return parseResponseBody(initialQuestionResponseSchema, data, "ApiService.getInitialQuestion");
        },
        {
          maxRetries: MAX_RETRIES,
          baseDelay: BASE_DELAY,
          retryable: isRetryableError,
        }
      );
    } catch (error) {
      log.error("getInitialQuestion failed after retries", error);
      reportErrorToSentry(error as Error | AppError, language);
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
    turnType: "conversation" | "exercise_start" = "conversation"
  ): Promise<TutorConversationResponse> {
    const body = buildConversationRequestBody(
      userInput,
      cefrLevel,
      currentProgress,
      language,
      conversationHistory,
      exerciseMode,
      topicId,
      turnType
    );

    log.info("sendMessage called", {
      cefrLevel,
      currentProgress: body.currentProgress,
      language,
      historyLength: body.conversationHistory.length,
      exerciseMode,
      topicId,
    });
    try {
      const requestId = createRequestId();
      return await withRetry(
        async () => {
          log.debug("Fetching /api/conversation...");
          const response = await fetch("/api/conversation", {
            method: "POST",
            headers: withRequestIdHeaders(requestId, {
              "Content-Type": "application/json",
            }),
            body: JSON.stringify(body),
          });

          log.debug("Response status", { status: response.status, statusText: response.statusText });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            log.error("API error", { status: response.status, statusText: response.statusText, errorData });
            throw new AppError(
              (errorData as { type?: ErrorType }).type || ErrorType.API,
              (errorData as { error?: string }).error || "Request failed",
              (errorData as { code?: string }).code,
              (errorData as { retryable?: boolean }).retryable ?? response.status >= 500
            );
          }

          const data: unknown = await response.json();
          log.info("Successfully received conversation response");
          return parseResponseBody(tutorConversationResponseSchema, data, "ApiService.sendMessage");
        },
        {
          maxRetries: MAX_RETRIES,
          baseDelay: BASE_DELAY,
          retryable: isRetryableError,
        }
      );
    } catch (error) {
      log.error("sendMessage failed after retries", error);
      reportErrorToSentry(error as Error | AppError, language);
      throw error;
    }
  }

  /**
   * Mint an OpenAI Realtime session via POST /api/openai-realtime.
   * This keeps token/session creation details out of UI hooks.
   */
  static async mintOpenaiRealtimeSession(
    args: { model?: string; modalities?: string[] } = {}
  ): Promise<OpenaiRealtimeSuccess> {
    const requestId = createRequestId();
    log.info("mintOpenaiRealtimeSession called", {
      model: args.model,
      hasModalities: Array.isArray(args.modalities),
    });

    try {
      const response = await fetch("/api/openai-realtime", {
        method: "POST",
        headers: withRequestIdHeaders(requestId, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(args),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        log.error("OpenAI Realtime API error", { status: response.status, errorData });
        throw new AppError(
          (errorData as { type?: ErrorType }).type || ErrorType.API,
          (errorData as { error?: string }).error || "Request failed",
          (errorData as { code?: string }).code,
          (errorData as { retryable?: boolean }).retryable ?? response.status >= 500
        );
      }

      const data: unknown = await response.json();
      return parseResponseBody(
        openaiRealtimeSuccessSchema,
        data,
        "ApiService.mintOpenaiRealtimeSession"
      );
    } catch (error) {
      // language is unknown here; report without language context.
      reportErrorToSentry(error as Error | AppError);
      throw error;
    }
  }

  /**
   * Mint an Azure Speech recognition token via GET /api/azure-speech-token.
   */
  static async getAzureSpeechToken(): Promise<AzureSpeechTokenSuccess> {
    const requestId = createRequestId();
    log.info("getAzureSpeechToken called");

    try {
      const response = await fetch("/api/azure-speech-token", {
        method: "GET",
        headers: withRequestIdHeaders(requestId, {}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        log.error("Azure Speech API error", { status: response.status, errorData });
        throw new AppError(
          (errorData as { type?: ErrorType }).type || ErrorType.API,
          (errorData as { error?: string }).error || "Request failed",
          (errorData as { code?: string }).code,
          (errorData as { retryable?: boolean }).retryable ?? response.status >= 500
        );
      }

      const data: unknown = await response.json();
      return parseResponseBody(
        azureSpeechTokenSuccessSchema,
        data,
        "ApiService.getAzureSpeechToken"
      );
    } catch (error) {
      reportErrorToSentry(error as Error | AppError);
      throw error;
    }
  }

  /**
   * Send a conversation message with streaming.
   * Raw text chunks are delivered via onChunk as they arrive.
   * Returns the final safety-filtered tutor payload once the stream completes.
   */
  static async sendMessageStreaming(
    userInput: string,
    cefrLevel: CEFRLevel,
    currentProgress: number,
    language: LanguageCode,
    conversationHistory: Message[],
    onChunk: StreamChunkCallback
  ): Promise<TutorConversationResponse> {
    const requestId = createRequestId();
    const body = buildConversationRequestBody(
      userInput,
      cefrLevel,
      currentProgress,
      language,
      conversationHistory,
      undefined,
      undefined,
      "conversation"
    );

    log.info("sendMessageStreaming called", {
      cefrLevel,
      currentProgress: body.currentProgress,
      language,
      historyLength: body.conversationHistory.length,
    });

    try {
      const response = await fetch("/api/conversation-stream", {
        method: "POST",
        headers: withRequestIdHeaders(requestId, { "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        log.error("Stream API error", { status: response.status, errorData });
        throw new AppError(
          (errorData as { type?: ErrorType }).type || ErrorType.API,
          (errorData as { error?: string }).error || "Request failed",
          (errorData as { code?: string }).code,
          (errorData as { retryable?: boolean }).retryable ?? response.status >= 500
        );
      }

      if (!response.body) {
        throw new AppError(ErrorType.API, "No response body from stream", "NO_BODY", true);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: TutorConversationResponse | null = null;

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

            let raw: unknown;
            try {
              raw = JSON.parse(jsonStr);
            } catch {
              log.warn("Failed to parse SSE event:", jsonStr);
              continue;
            }

            const parsed = sseEventSchema.safeParse(raw);
            if (!parsed.success) {
              log.warn("Unknown SSE event shape", raw);
              continue;
            }

            const data = parsed.data;
            if (data.type === "chunk") {
              onChunk(data.text);
            } else if (data.type === "done") {
              finalResult = parseResponseBody(
                tutorConversationResponseSchema,
                data.result,
                "ApiService.sendMessageStreaming.done"
              );
            } else if (data.type === "error") {
              throw new AppError(
                ErrorType.API,
                data.error || "Stream error",
                data.code || "STREAM_ERROR",
                data.retryable ?? true
              );
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (!finalResult) {
        throw new AppError(
          ErrorType.API,
          "Stream ended without final result",
          "STREAM_INCOMPLETE",
          true
        );
      }

      log.info("Successfully received streaming conversation response");
      return finalResult;
    } catch (error) {
      reportErrorToSentry(error as Error | AppError, language);
      throw error;
    }
  }

  /**
   * Best-effort server snapshot (Upstash Redis when configured). Dual-write from client.
   */
  static async syncSessionSnapshotToServer(
    sessions: Session[],
    activeSessionId: string | null
  ): Promise<void> {
    if (typeof window === "undefined") return;
    const deviceId = getOrCreateDeviceId();
    if (!deviceId) return;

    let snapshot;
    try {
      const updatedAt = Math.max(
        sessions.length ? Math.max(...sessions.map((s) => s.updatedAt)) : 0,
        typeof window !== "undefined" ? Date.now() : 0
      );
      snapshot = sessionSnapshotSchema.parse({
        version: 1,
        updatedAt,
        sessions: sessions.map((s) => s as unknown as Record<string, unknown>),
        activeSessionId: activeSessionId ?? undefined,
      });
    } catch (e) {
      log.warn("Session snapshot validation failed (sync skipped)", e);
      return;
    }

    const requestId = createRequestId();

    let authToken: string | null = null;
    try {
      const u = getCurrentUser();
      if (u) authToken = await u.getIdToken();
    } catch {
      authToken = null;
    }

    try {
      const response = await fetch("/api/sessions/sync", {
        method: "POST",
        headers: withRequestIdHeaders(requestId, {
          "Content-Type": "application/json",
          "x-device-id": deviceId,
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        }),
        body: JSON.stringify({ snapshot }),
      });
      if (!response.ok) {
        log.debug("Session sync HTTP non-OK", { status: response.status });
        return;
      }
      const raw: unknown = await response.json();
      sessionSyncPostResponseSchema.safeParse(raw);
    } catch (e) {
      log.debug("Session sync failed (non-fatal)", e);
    }
  }

  /**
   * Restore sessions from server when local storage is empty (cold start / new device with Redis backup).
   */
  static async tryRestoreServerSessionSnapshot(): Promise<{
    sessions: Session[];
    activeSessionId: string | null;
    snapshotUpdatedAt: number;
  } | null> {
    if (typeof window === "undefined") return null;
    const deviceId = getOrCreateDeviceId();
    if (!deviceId) return null;

    const requestId = createRequestId();

    let authToken: string | null = null;
    try {
      const u = getCurrentUser();
      if (u) authToken = await u.getIdToken();
    } catch {
      authToken = null;
    }

    try {
      const response = await fetch("/api/sessions/restore", {
        method: "GET",
        headers: withRequestIdHeaders(requestId, {
          "x-device-id": deviceId,
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        }),
      });
      if (!response.ok) return null;
      const raw: unknown = await response.json();
      const parsed = sessionRestoreResponseSchema.safeParse(raw);
      if (!parsed.success || !parsed.data.found || !parsed.data.snapshot) return null;

      const rawList = parsed.data.snapshot.sessions || [];
      const sessions: Session[] = [];
      for (const s of rawList) {
        if (validateSession(s)) sessions.push(s);
      }
      if (sessions.length === 0) return null;

      const preferred = parsed.data.snapshot.activeSessionId;
      const activeSessionId =
        preferred && sessions.some((s) => s.id === preferred)
          ? preferred
          : sessions.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b)).id;

      const snapAt = parsed.data.snapshot.updatedAt;
      const snapshotUpdatedAt =
        typeof snapAt === "number" && !Number.isNaN(snapAt)
          ? snapAt
          : sessions.reduce((m, s) => Math.max(m, s.updatedAt), 0);

      return { sessions, activeSessionId, snapshotUpdatedAt };
    } catch {
      return null;
    }
  }
}
