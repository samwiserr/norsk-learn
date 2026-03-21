import { evaluateProgressionSuggestion } from "@/src/services/cefrProgressionEngine";
import type { TutorTurnAnalyticsEvent } from "@/src/services/analyticsService";

function ev(p: Partial<TutorTurnAnalyticsEvent>): TutorTurnAnalyticsEvent {
  return {
    ts: Date.now(),
    cefrLevel: "A1",
    hadMustFix: false,
    hadHint: false,
    exerciseGraded: false,
    exerciseCorrect: false,
    ...p,
  };
}

describe("evaluateProgressionSuggestion", () => {
  it("returns null with no events", () => {
    expect(evaluateProgressionSuggestion([], "A1")).toBeNull();
  });

  it("suggests level up when mastery window is strong", () => {
    const events: TutorTurnAnalyticsEvent[] = [];
    for (let i = 0; i < 20; i++) {
      events.push(
        ev({
          hadMustFix: false,
          exerciseGraded: true,
          exerciseCorrect: true,
        }),
      );
    }
    expect(evaluateProgressionSuggestion(events, "A1")?.kind).toBe("level_up");
  });
});
