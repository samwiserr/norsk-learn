/**
 * Lightweight client-side analytics buffer for progression heuristics.
 * Stored in localStorage (bounded list).
 */

import { createLogger } from "@/lib/logger";
import type { CEFRLevel } from "@/lib/cefr";

const log = createLogger("AnalyticsService");

const STORAGE_KEY = "norsk_tutor_analytics_v1";
const MAX_EVENTS = 200;

export type TutorTurnAnalyticsEvent = {
  ts: number;
  cefrLevel: CEFRLevel;
  /** Any must_fix correction in this tutor turn */
  hadMustFix: boolean;
  /** Learner saw a hint in the response */
  hadHint: boolean;
  /** Turn was graded as exercise practice */
  exerciseGraded: boolean;
  /** When exerciseGraded, whether the turn counted as "correct" */
  exerciseCorrect: boolean;
};

function loadRaw(): TutorTurnAnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEvent);
  } catch (e) {
    log.warn("Failed to load analytics buffer", e);
    return [];
  }
}

function isValidEvent(x: unknown): x is TutorTurnAnalyticsEvent {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.ts === "number" &&
    typeof o.cefrLevel === "string" &&
    typeof o.hadMustFix === "boolean" &&
    typeof o.hadHint === "boolean" &&
    typeof o.exerciseGraded === "boolean" &&
    typeof o.exerciseCorrect === "boolean"
  );
}

function saveRaw(events: TutorTurnAnalyticsEvent[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = events.slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    log.warn("Failed to save analytics buffer", e);
  }
}

export class AnalyticsService {
  static getEvents(): TutorTurnAnalyticsEvent[] {
    return loadRaw();
  }

  static emitTutorTurn(event: Omit<TutorTurnAnalyticsEvent, "ts"> & { ts?: number }): void {
    const full: TutorTurnAnalyticsEvent = {
      ts: event.ts ?? Date.now(),
      cefrLevel: event.cefrLevel,
      hadMustFix: event.hadMustFix,
      hadHint: event.hadHint,
      exerciseGraded: event.exerciseGraded,
      exerciseCorrect: event.exerciseCorrect,
    };
    const next = [...loadRaw(), full];
    saveRaw(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("norsk-analytics-updated"));
    }
  }

  static clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }
}
