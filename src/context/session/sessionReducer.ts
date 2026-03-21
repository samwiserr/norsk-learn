import { Session } from "@/lib/sessions";
import { CEFRLevel } from "@/lib/cefr";
import { LanguageCode } from "@/lib/languages";

export type SessionPhase = "loading" | "needLevel" | "ready";

export interface SessionState {
  phase: SessionPhase;
  sessions: Session[];
  activeSessionId: string | null;
  cefrLevel: CEFRLevel | null;
  input: string;
  loading: boolean;
  showResults: boolean;
  userMessageCount: number;
  previousLanguage: LanguageCode | null;
  needsWelcome: string | null;
  lastTutorHint: string | null;
  lastUserInput: string | null;
  exerciseScore: number;
  exerciseTurns: number;
}

export type SessionAction =
  | {
      type: "INIT_LOADED";
      sessions: Session[];
      cefrLevel: CEFRLevel | null;
      /** When restoring from server snapshot, prefer this tab as active. */
      preferredActiveSessionId?: string | null;
    }
  | { type: "SET_LEVEL"; level: CEFRLevel }
  | { type: "SET_SESSIONS"; sessions: Session[]; activeId?: string | null }
  | { type: "SET_ACTIVE"; id: string | null }
  | { type: "UPDATE_SESSION"; id: string; data: Partial<Session> }
  | { type: "DELETE_SESSION"; id: string }
  | { type: "SET_INPUT"; value: string }
  | { type: "SEND_START" }
  | { type: "SEND_END" }
  | { type: "SET_SHOW_RESULTS"; value: boolean }
  | { type: "SET_MESSAGE_COUNT"; count: number }
  | { type: "SET_PREVIOUS_LANGUAGE"; lang: LanguageCode }
  | { type: "REQUEST_WELCOME"; sessionId: string }
  | { type: "CLEAR_WELCOME" }
  | { type: "SET_TUTOR_HINT"; hint: string | null }
  | { type: "SET_LAST_USER_INPUT"; input: string | null }
  | { type: "EXERCISE_CORRECT_TURN" }
  | { type: "EXERCISE_INCORRECT_TURN" }
  | { type: "RESET_EXERCISE_SCORE" };

export const initialSessionState: SessionState = {
  phase: "loading",
  sessions: [],
  activeSessionId: null,
  cefrLevel: null,
  input: "",
  loading: false,
  showResults: false,
  userMessageCount: 0,
  previousLanguage: null,
  needsWelcome: null,
  lastTutorHint: null,
  lastUserInput: null,
  exerciseScore: 0,
  exerciseTurns: 0,
};

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "INIT_LOADED": {
      const phase: SessionPhase = action.cefrLevel ? "ready" : "needLevel";
      const preferred = action.preferredActiveSessionId;
      const preferredOk =
        preferred &&
        action.sessions.some((s) => s.id === preferred);
      const activeId =
        action.sessions.length > 0
          ? preferredOk
            ? preferred!
            : action.sessions.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b)).id
          : null;
      return {
        ...state,
        phase,
        sessions: action.sessions,
        activeSessionId: activeId,
        cefrLevel: action.cefrLevel,
        showResults: action.sessions.length > 0,
      };
    }
    case "SET_LEVEL":
      return { ...state, phase: "ready", cefrLevel: action.level };
    case "SET_SESSIONS": {
      const activeId = action.activeId !== undefined ? action.activeId : state.activeSessionId;
      return { ...state, sessions: action.sessions, activeSessionId: activeId };
    }
    case "SET_ACTIVE":
      return { ...state, activeSessionId: action.id, showResults: action.id !== null };
    case "UPDATE_SESSION": {
      const exists = state.sessions.some((s) => s.id === action.id);
      if (exists) {
        return {
          ...state,
          sessions: state.sessions.map((s) =>
            s.id === action.id ? { ...s, ...action.data, updatedAt: Date.now() } : s
          ),
        };
      }
      if (action.data && "id" in action.data) {
        return {
          ...state,
          sessions: [...state.sessions, action.data as Session],
        };
      }
      return state;
    }
    case "DELETE_SESSION": {
      const filtered = state.sessions.filter((s) => s.id !== action.id);
      const newActive =
        state.activeSessionId === action.id
          ? filtered.length > 0
            ? filtered.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b)).id
            : null
          : state.activeSessionId;
      return {
        ...state,
        sessions: filtered,
        activeSessionId: newActive,
        showResults: newActive !== null,
      };
    }
    case "SET_INPUT":
      return { ...state, input: action.value };
    case "SEND_START":
      return { ...state, loading: true, showResults: true };
    case "SEND_END":
      return { ...state, loading: false };
    case "SET_SHOW_RESULTS":
      return { ...state, showResults: action.value };
    case "SET_MESSAGE_COUNT":
      return { ...state, userMessageCount: action.count };
    case "SET_PREVIOUS_LANGUAGE":
      return { ...state, previousLanguage: action.lang };
    case "REQUEST_WELCOME":
      return { ...state, needsWelcome: action.sessionId };
    case "CLEAR_WELCOME":
      return { ...state, needsWelcome: null };
    case "SET_TUTOR_HINT":
      return { ...state, lastTutorHint: action.hint };
    case "SET_LAST_USER_INPUT":
      return { ...state, lastUserInput: action.input };
    case "EXERCISE_CORRECT_TURN":
      return { ...state, exerciseScore: state.exerciseScore + 1, exerciseTurns: state.exerciseTurns + 1 };
    case "EXERCISE_INCORRECT_TURN":
      return { ...state, exerciseTurns: state.exerciseTurns + 1 };
    case "RESET_EXERCISE_SCORE":
      return { ...state, exerciseScore: 0, exerciseTurns: 0 };
    default:
      return state;
  }
}
