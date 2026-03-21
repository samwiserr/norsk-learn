/**
 * Exercise start use-case: set mode/topic, show opener via tutor API.
 */
import type { Dispatch } from "react";
import { Session, Message } from "@/lib/sessions";
import { CEFRLevel } from "@/lib/cefr";
import { LanguageCode } from "@/lib/languages";
import { ApiService } from "@/src/services/apiService";
import { formatTutorAssistantMessage } from "@/src/utils/tutorFormat";
import { AppError, createAppError, getErrorMessage } from "@/lib/error-handling";
import { createLogger } from "@/lib/logger";
import { recordCorrectWord } from "@/lib/vocabulary-tracker";
import type { SessionAction } from "@/src/context/session";
import { sessionActions } from "@/src/context/session";

const log = createLogger("StartExercise");

const MODE_TITLES: Record<string, string> = {
  free_conversation: "Free Conversation",
  translation: "Translation Practice",
  grammar_drill: "Grammar Drill",
  topic_practice: "Topic Practice",
};

export function exerciseTitleForMode(mode: string, topicId?: string): string {
  const base = MODE_TITLES[mode] ?? mode;
  return topicId ? `${base}: ${topicId.replace(/_/g, " ")}` : base;
}

export interface StartExerciseParams {
  mode: string;
  topicId?: string;
  activeSession: Session;
  cefrLevel: CEFRLevel;
  currentLanguage: LanguageCode;
}

export interface StartExercisePorts {
  dispatch: Dispatch<SessionAction>;
  updateSession: (id: string, data: Partial<Session>) => void;
}

export async function startExercise(
  ports: StartExercisePorts,
  params: StartExerciseParams
): Promise<void> {
  const { dispatch, updateSession } = ports;
  const { mode, topicId, activeSession, cefrLevel, currentLanguage } = params;

  const title = exerciseTitleForMode(mode, topicId);

  updateSession(activeSession.id, {
    exerciseMode: mode,
    topicId: topicId ?? undefined,
    title,
  });

  dispatch(sessionActions.resetExerciseScore());
  dispatch(sessionActions.setTutorHint(null));

  const placeholder: Message = {
    id: `msg_${Date.now()}_mode_opener`,
    role: "assistant-streaming",
    content: "",
    timestamp: Date.now(),
  };
  updateSession(activeSession.id, {
    exerciseMode: mode,
    topicId: topicId ?? undefined,
    title,
    messages: [placeholder],
    messageCount: 1,
  });
  dispatch(sessionActions.setShowResults(true));
  dispatch(sessionActions.sendStart());

  try {
    const data = await ApiService.sendMessage(
      "",
      cefrLevel,
      activeSession.progress ?? 0,
      currentLanguage,
      [],
      mode,
      topicId,
      "exercise_start"
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

    const content = formatTutorAssistantMessage(data, currentLanguage);
    const openerMsg: Message = {
      id: placeholder.id,
      role: "assistant",
      content: content.trim(),
      timestamp: Date.now(),
    };
    updateSession(activeSession.id, {
      messages: [openerMsg],
      messageCount: 1,
    });
  } catch (error) {
    log.error("Error generating exercise opener", error);
    const appError = error instanceof AppError ? error : createAppError(error);
    const fallback: Message = {
      id: placeholder.id,
      role: "assistant",
      content: getErrorMessage(appError, currentLanguage),
      timestamp: Date.now(),
    };
    updateSession(activeSession.id, {
      messages: [fallback],
      messageCount: 1,
    });
  } finally {
    dispatch(sessionActions.sendEnd());
  }
}
