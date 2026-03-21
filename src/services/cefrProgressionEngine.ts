import { CEFR_LEVELS, type CEFRLevel, isValidCEFRLevel } from "@/lib/cefr";
import { CEFR_PROGRESSION } from "@/lib/constants";
import type { TutorTurnAnalyticsEvent } from "@/src/services/analyticsService";

export type ProgressionSuggestion =
  | { kind: "level_up"; targetLevel: CEFRLevel }
  | { kind: "level_down"; targetLevel: CEFRLevel }
  | { kind: "exercise_focus" };

function getNextLevel(current: CEFRLevel): CEFRLevel | null {
  const i = CEFR_LEVELS.indexOf(current);
  if (i < 0 || i >= CEFR_LEVELS.length - 1) return null;
  return CEFR_LEVELS[i + 1] ?? null;
}

function getPrevLevel(current: CEFRLevel): CEFRLevel | null {
  const i = CEFR_LEVELS.indexOf(current);
  if (i <= 0) return null;
  return CEFR_LEVELS[i - 1] ?? null;
}

function windowEvents(events: TutorTurnAnalyticsEvent[], currentLevel: CEFRLevel, n: number) {
  const forLevel = events.filter((e) => e.cefrLevel === currentLevel);
  return forLevel.slice(-n);
}

/**
 * Heuristic suggestions from recent tutor turns. User must always confirm level changes in UI.
 */
export function evaluateProgressionSuggestion(
  events: TutorTurnAnalyticsEvent[],
  currentLevel: CEFRLevel | null
): ProgressionSuggestion | null {
  if (!currentLevel || !isValidCEFRLevel(currentLevel)) return null;

  const mastery = windowEvents(events, currentLevel, CEFR_PROGRESSION.MASTERY_WINDOW);
  if (mastery.length >= CEFR_PROGRESSION.MIN_SAMPLES_LEVEL_CHANGE) {
    const mustRate = mastery.filter((e) => e.hadMustFix).length / mastery.length;
    const graded = mastery.filter((e) => e.exerciseGraded);
    const exAvg =
      graded.length > 0
        ? graded.filter((e) => e.exerciseCorrect).length / graded.length
        : 1;
    if (
      mustRate <= CEFR_PROGRESSION.MASTERY_MAX_MUST_FIX_RATE &&
      exAvg >= 0.85
    ) {
      const next = getNextLevel(currentLevel);
      if (next) return { kind: "level_up", targetLevel: next };
    }
  }

  const struggle = windowEvents(events, currentLevel, CEFR_PROGRESSION.STRUGGLE_WINDOW);
  if (struggle.length >= Math.min(8, CEFR_PROGRESSION.STRUGGLE_WINDOW)) {
    const mustRate = struggle.filter((e) => e.hadMustFix).length / struggle.length;
    if (mustRate >= CEFR_PROGRESSION.STRUGGLE_MIN_MUST_FIX_RATE) {
      const prev = getPrevLevel(currentLevel);
      if (prev) return { kind: "level_down", targetLevel: prev };
    }
  }

  const plateau = windowEvents(events, currentLevel, CEFR_PROGRESSION.PLATEAU_WINDOW);
  if (plateau.length >= CEFR_PROGRESSION.PLATEAU_WINDOW) {
    const graded = plateau.filter((e) => e.exerciseGraded);
    if (graded.length >= plateau.length * CEFR_PROGRESSION.PLATEAU_EXERCISE_MIN_RATE) {
      const correctRate = graded.filter((e) => e.exerciseCorrect).length / graded.length;
      if (correctRate >= 0.4 && correctRate <= 0.65) {
        return { kind: "exercise_focus" };
      }
    }
  }

  return null;
}
