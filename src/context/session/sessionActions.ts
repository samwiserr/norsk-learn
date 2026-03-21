import { Session } from "@/lib/sessions";
import { CEFRLevel } from "@/lib/cefr";
import { LanguageCode } from "@/lib/languages";
import type { SessionAction } from "./sessionReducer";

export const sessionActions = {
  initLoaded: (
    sessions: Session[],
    cefrLevel: CEFRLevel | null,
    preferredActiveSessionId?: string | null
  ): SessionAction => ({
    type: "INIT_LOADED",
    sessions,
    cefrLevel,
    preferredActiveSessionId: preferredActiveSessionId ?? undefined,
  }),
  setLevel: (level: CEFRLevel): SessionAction => ({ type: "SET_LEVEL", level }),
  setSessions: (sessions: Session[], activeId?: string | null): SessionAction => ({
    type: "SET_SESSIONS",
    sessions,
    activeId,
  }),
  setActive: (id: string | null): SessionAction => ({ type: "SET_ACTIVE", id }),
  updateSession: (id: string, data: Partial<Session>): SessionAction => ({
    type: "UPDATE_SESSION",
    id,
    data,
  }),
  deleteSession: (id: string): SessionAction => ({ type: "DELETE_SESSION", id }),
  setInput: (value: string): SessionAction => ({ type: "SET_INPUT", value }),
  sendStart: (): SessionAction => ({ type: "SEND_START" }),
  sendEnd: (): SessionAction => ({ type: "SEND_END" }),
  setShowResults: (value: boolean): SessionAction => ({ type: "SET_SHOW_RESULTS", value }),
  setMessageCount: (count: number): SessionAction => ({ type: "SET_MESSAGE_COUNT", count }),
  setPreviousLanguage: (lang: LanguageCode): SessionAction => ({
    type: "SET_PREVIOUS_LANGUAGE",
    lang,
  }),
  requestWelcome: (sessionId: string): SessionAction => ({
    type: "REQUEST_WELCOME",
    sessionId,
  }),
  clearWelcome: (): SessionAction => ({ type: "CLEAR_WELCOME" }),
  setTutorHint: (hint: string | null): SessionAction => ({ type: "SET_TUTOR_HINT", hint }),
  setLastUserInput: (input: string | null): SessionAction => ({
    type: "SET_LAST_USER_INPUT",
    input,
  }),
  exerciseCorrectTurn: (): SessionAction => ({ type: "EXERCISE_CORRECT_TURN" }),
  exerciseIncorrectTurn: (): SessionAction => ({ type: "EXERCISE_INCORRECT_TURN" }),
  resetExerciseScore: (): SessionAction => ({ type: "RESET_EXERCISE_SCORE" }),
};
