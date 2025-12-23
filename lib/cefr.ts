export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type CEFRLevel = (typeof CEFR_LEVELS)[number];

export const CEFR_LEVEL_INFO: Record<
  CEFRLevel,
  { name: string; description: string }
> = {
  A1: {
    name: "Beginner",
    description: "Basic phrases and introductions.",
  },
  A2: {
    name: "Elementary",
    description: "Simple everyday conversations.",
  },
  B1: {
    name: "Intermediate",
    description: "Clear communication on familiar topics.",
  },
  B2: {
    name: "Upper Intermediate",
    description: "Confident argumentation and discussions.",
  },
  C1: {
    name: "Advanced",
    description: "Fluent and spontaneous expression.",
  },
  C2: {
    name: "Proficient",
    description: "Near-native mastery.",
  },
};

export const isValidCEFRLevel = (value: string): value is CEFRLevel =>
  CEFR_LEVELS.includes(value as CEFRLevel);

export const getNextLevel = (currentLevel: CEFRLevel): CEFRLevel | null => {
  const index = CEFR_LEVELS.indexOf(currentLevel);
  return index < CEFR_LEVELS.length - 1 ? CEFR_LEVELS[index + 1] : null;
};

export const calculateProgress = (completedTasks: number, targetTasks: number): number => {
  return Math.min(100, Math.max(0, (completedTasks / targetTasks) * 100));
};

