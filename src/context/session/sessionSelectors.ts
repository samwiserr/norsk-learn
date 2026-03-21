import type { Session } from "@/lib/sessions";
import type { SessionState } from "./sessionReducer";

export function selectActiveSession(state: SessionState): Session | null {
  return state.sessions.find((s) => s.id === state.activeSessionId) ?? null;
}

export function selectSessionsLoaded(state: SessionState): boolean {
  return state.phase !== "loading";
}
