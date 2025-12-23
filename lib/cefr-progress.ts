import { CEFR_LEVELS, CEFRLevel } from "./cefr";

export const CEFR_PROGRESS_RANGES: Record<
  CEFRLevel,
  { min: number; max: number }
> = {
  A1: { min: 0, max: 16.67 },
  A2: { min: 16.67, max: 33.33 },
  B1: { min: 33.33, max: 50 },
  B2: { min: 50, max: 66.67 },
  C1: { min: 66.67, max: 83.33 },
  C2: { min: 83.33, max: 100 },
};

export const getCurrentCEFRLevel = (progress: number): CEFRLevel => {
  if (progress < 16.67) return "A1";
  if (progress < 33.33) return "A2";
  if (progress < 50) return "B1";
  if (progress < 66.67) return "B2";
  if (progress < 83.33) return "C1";
  return "C2";
};

export const calculateProgressDelta = (
  currentLevel: CEFRLevel,
  hasError: boolean,
): number => {
  const gainRates: Record<CEFRLevel, number> = {
    A1: 0.8,
    A2: 0.6,
    B1: 0.5,
    B2: 0.4,
    C1: 0.3,
    C2: 0.2,
  };

  const lossRates: Record<CEFRLevel, number> = {
    A1: 1.2,
    A2: 1.0,
    B1: 0.9,
    B2: 0.8,
    C1: 0.7,
    C2: 0.6,
  };

  return hasError ? -lossRates[currentLevel] : gainRates[currentLevel];
};

export const initializeProgress = (selectedLevel: CEFRLevel): number =>
  CEFR_PROGRESS_RANGES[selectedLevel].min;

export const clampProgress = (progress: number) =>
  Math.max(0, Math.min(100, progress));

