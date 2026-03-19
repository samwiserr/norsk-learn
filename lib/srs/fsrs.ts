/**
 * Free Spaced Repetition Scheduler (FSRS) - simplified implementation
 * Based on the FSRS-4.5 algorithm with 4 states and power-law forgetting
 */

export interface FSRSCard {
  id: string;
  front: string; // word or phrase
  back: string; // translation or correction
  category: "vocabulary" | "grammar" | "correction";
  language: string;
  state: "new" | "learning" | "review" | "relearning";
  difficulty: number; // 0-1 scale
  stability: number; // days until ~90% recall
  due: number; // timestamp
  reps: number;
  lapses: number;
  lastReview: number | null;
  createdAt: number;
}

export type Rating = 1 | 2 | 3 | 4; // again | hard | good | easy

const DESIRED_RETENTION = 0.9;
const W: readonly number[] = [
  0.4, 0.6, 2.4, 5.8, // initial stability for each rating
  4.93, 0.94, 0.86, 0.01, // difficulty params
  1.49, 0.14, 0.94, // stability after success
  2.18, 0.05, 0.34, 1.26, // stability after failure
  0.29, 2.61, // difficulty update
] as const;

const w = (i: number) => W[i] ?? 0;

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

function daysFromMs(ms: number): number {
  return ms / (1000 * 60 * 60 * 24);
}

function initDifficulty(rating: Rating): number {
  return clamp(w(4) - (rating - 3) * w(5), 1, 10) / 10;
}

function initStability(rating: Rating): number {
  return Math.max(w(rating - 1), 0.1);
}

function nextDifficulty(d: number, rating: Rating): number {
  const d10 = d * 10;
  const newD = d10 - w(6) * (rating - 3);
  const meanReverted = w(7) * w(4) + (1 - w(7)) * newD;
  return clamp(meanReverted, 1, 10) / 10;
}

function recallProbability(stability: number, elapsedDays: number): number {
  return Math.pow(1 + (elapsedDays / (9 * stability)), -1);
}

function nextStabilitySuccess(d: number, s: number, r: number, rating: Rating): number {
  const hardPenalty = rating === 2 ? w(15) : 1;
  const easyBonus = rating === 4 ? w(16) : 1;
  return s * (1 + Math.exp(w(8)) * (11 - d * 10) * Math.pow(s, -w(9)) * (Math.exp((1 - r) * w(10)) - 1) * hardPenalty * easyBonus);
}

function nextStabilityFail(d: number, s: number, r: number): number {
  return Math.max(
    0.1,
    w(11) * Math.pow(d * 10, -w(12)) * (Math.pow(s + 1, w(13)) - 1) * Math.exp((1 - r) * w(14))
  );
}

function nextInterval(stability: number): number {
  return Math.max(1, Math.round(stability * 9 * (1 / DESIRED_RETENTION - 1)));
}

export function createCard(
  front: string,
  back: string,
  category: FSRSCard["category"],
  language: string
): FSRSCard {
  return {
    id: `srs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    front,
    back,
    category,
    language,
    state: "new",
    difficulty: 0,
    stability: 0,
    due: Date.now(),
    reps: 0,
    lapses: 0,
    lastReview: null,
    createdAt: Date.now(),
  };
}

export function reviewCard(card: FSRSCard, rating: Rating): FSRSCard {
  const now = Date.now();
  const elapsed = card.lastReview ? daysFromMs(now - card.lastReview) : 0;

  if (card.state === "new") {
    const d = initDifficulty(rating);
    const s = initStability(rating);
    const interval = rating === 1 ? 0 : nextInterval(s);

    return {
      ...card,
      difficulty: d,
      stability: s,
      state: rating === 1 ? "learning" : "review",
      due: now + interval * 24 * 60 * 60 * 1000,
      reps: card.reps + 1,
      lapses: rating === 1 ? card.lapses + 1 : card.lapses,
      lastReview: now,
    };
  }

  const r = recallProbability(card.stability, elapsed);
  const d = nextDifficulty(card.difficulty, rating);

  if (rating === 1) {
    const s = nextStabilityFail(card.difficulty, card.stability, r);
    return {
      ...card,
      difficulty: d,
      stability: s,
      state: "relearning",
      due: now + 5 * 60 * 1000, // 5 minutes
      reps: card.reps + 1,
      lapses: card.lapses + 1,
      lastReview: now,
    };
  }

  const s = nextStabilitySuccess(card.difficulty, card.stability, r, rating);
  const interval = nextInterval(s);

  return {
    ...card,
    difficulty: d,
    stability: s,
    state: "review",
    due: now + interval * 24 * 60 * 60 * 1000,
    reps: card.reps + 1,
    lastReview: now,
  };
}

export function getDueCards(cards: FSRSCard[]): FSRSCard[] {
  const now = Date.now();
  return cards
    .filter((c) => c.due <= now)
    .sort((a, b) => a.due - b.due);
}

export function getCardStats(cards: FSRSCard[]) {
  const now = Date.now();
  return {
    total: cards.length,
    new: cards.filter((c) => c.state === "new").length,
    learning: cards.filter((c) => c.state === "learning" || c.state === "relearning").length,
    review: cards.filter((c) => c.state === "review").length,
    due: cards.filter((c) => c.due <= now).length,
    mature: cards.filter((c) => c.stability >= 21).length,
  };
}
