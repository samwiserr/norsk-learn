/**
 * Send-message tutoring use-case: user message → API → assistant reply + session updates.
 * Invoked from SessionProvider; keeps orchestration out of the reducer.
 */
import type { Dispatch } from "react";
import { Session, Message } from "@/lib/sessions";
import { CEFRLevel, isValidCEFRLevel } from "@/lib/cefr";
import { LanguageCode } from "@/lib/languages";
import { ApiService } from "@/src/services/apiService";
import { SessionService } from "@/src/services/sessionService";
import { StorageService } from "@/src/services/storageService";
import { UserRepository } from "@/src/repositories/userRepository";
import { formatTutorAssistantMessage } from "@/src/utils/tutorFormat";
import { AppError, createAppError, getErrorMessage } from "@/lib/error-handling";
import { createLogger } from "@/lib/logger";
import { recordCorrectWord } from "@/lib/vocabulary-tracker";
import {
  AUTH_HARD_GATE_MESSAGE_COUNT,
  AUTH_NUDGE_MESSAGE_COUNT,
  CUSTOM_EVENTS,
  SESSION_STORAGE_KEYS,
} from "@/lib/constants";
import type { SessionAction } from "@/src/context/session";
import { sessionActions } from "@/src/context/session";
import { AnalyticsService } from "@/src/services/analyticsService";

const log = createLogger("SendTutorMessage");

export interface SendTutorMessageParams {
  effectiveInput: string;
  activeSession: Session;
  cefrLevel: CEFRLevel | null;
  currentLanguage: LanguageCode;
  isAuthenticated: boolean;
}

export interface SendTutorMessagePorts {
  dispatch: Dispatch<SessionAction>;
  updateSession: (id: string, data: Partial<Session>) => void;
}

export async function sendTutorMessage(
  ports: SendTutorMessagePorts,
  params: SendTutorMessageParams
): Promise<void> {
  const { dispatch, updateSession } = ports;
  const { effectiveInput, activeSession, cefrLevel, currentLanguage, isAuthenticated } = params;

  if (!effectiveInput || !activeSession) return;

  const currentCount = UserRepository.getUserMessageCount();
  if (currentCount >= AUTH_HARD_GATE_MESSAGE_COUNT && !isAuthenticated) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(CUSTOM_EVENTS.AUTH_REQUIRED));
    }
    return;
  }

  const newCount = UserRepository.incrementUserMessageCount();
  dispatch(sessionActions.setMessageCount(newCount));

  if (
    typeof window !== "undefined" &&
    !isAuthenticated &&
    newCount === AUTH_NUDGE_MESSAGE_COUNT &&
    !sessionStorage.getItem(SESSION_STORAGE_KEYS.AUTH_NUDGE_SHOWN)
  ) {
    sessionStorage.setItem(SESSION_STORAGE_KEYS.AUTH_NUDGE_SHOWN, "1");
    window.dispatchEvent(new Event(CUSTOM_EVENTS.AUTH_NUDGE));
  }

  const sessionLevel =
    activeSession.cefrLevel || cefrLevel || StorageService.loadCEFRLevel();
  if (!sessionLevel || !isValidCEFRLevel(sessionLevel)) {
    log.error("Cannot send message: invalid level");
    return;
  }

  const userMessage: Message = {
    id: `msg_${Date.now()}_user`,
    role: "user",
    content: effectiveInput,
    timestamp: Date.now(),
  };

  const originalMessages = activeSession.messages;
  const messagesWithUser = [...originalMessages, userMessage];
  const placeholder: Message = {
    id: `msg_${Date.now()}_assistant_placeholder`,
    role: "assistant-streaming",
    content: "",
    timestamp: Date.now(),
  };

  updateSession(activeSession.id, {
    messages: [...messagesWithUser, placeholder],
    messageCount: messagesWithUser.length + 1,
  });
  dispatch(sessionActions.setInput(""));
  dispatch(sessionActions.sendStart());
  dispatch(sessionActions.setLastUserInput(effectiveInput));

  try {
    const sessionMode = activeSession.exerciseMode ?? undefined;
    const sessionTopic = activeSession.topicId ?? undefined;

    const data = await ApiService.sendMessage(
      effectiveInput,
      sessionLevel,
      activeSession.progress ?? 0,
      currentLanguage,
      originalMessages,
      sessionMode,
      sessionTopic
    );

    if (data.hint) {
      dispatch(sessionActions.setTutorHint(data.hint));
    }

    if (Array.isArray(data.vocabIntroduced)) {
      for (const v of data.vocabIntroduced) {
        if (typeof v?.word === "string") {
          recordCorrectWord(v.word, v.translation);
        }
      }
    }

    const hasMustFix =
      Array.isArray(data.fixes) &&
      data.fixes.some((f: { severity?: string }) => f?.severity === "must_fix");
    dispatch(hasMustFix ? sessionActions.exerciseIncorrectTurn() : sessionActions.exerciseCorrectTurn());

    const assistantContent = formatTutorAssistantMessage(data, currentLanguage);
    const assistantMessage: Message = {
      id: placeholder.id,
      role: "assistant",
      content: assistantContent.trim(),
      timestamp: Date.now(),
    };

    const finalMessages = [...messagesWithUser, assistantMessage];
    const delta = data.progressDelta ?? 0;
    const updated = SessionService.updateProgress(activeSession, delta);
    const titled = SessionService.updateTitle(updated, sessionLevel);

    updateSession(activeSession.id, {
      ...titled,
      messages: finalMessages,
      messageCount: finalMessages.length,
      completedTasks: activeSession.completedTasks + 1,
    });

    if (typeof window !== "undefined") {
      const exerciseMode = activeSession.exerciseMode;
      const exerciseGraded = !!exerciseMode && exerciseMode !== "free_conversation";
      AnalyticsService.emitTutorTurn({
        cefrLevel: sessionLevel,
        hadMustFix: hasMustFix,
        hadHint: Boolean(data.hint),
        exerciseGraded,
        exerciseCorrect: exerciseGraded ? !hasMustFix : false,
      });
    }
  } catch (error) {
    log.error("Error sending message", error);
    const appError = error instanceof AppError ? error : createAppError(error);
    const errorMsg: Message = {
      id: placeholder.id,
      role: "assistant",
      content: getErrorMessage(appError, currentLanguage),
      timestamp: Date.now(),
    };
    updateSession(activeSession.id, {
      messages: [...messagesWithUser, errorMsg],
      messageCount: messagesWithUser.length + 1,
    });
  } finally {
    dispatch(sessionActions.sendEnd());
  }
}
