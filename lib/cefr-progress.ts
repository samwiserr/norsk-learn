import { CEFRLevel } from "./cefr";

export const CEFR_PROGRESS_RANGES: Record<
  CEFRLevel,
  { min: number; max: number }
> = {
  A1: { min: 0, max: 20 },
  A2: { min: 20, max: 40 },
  B1: { min: 40, max: 60 },
  B2: { min: 60, max: 80 },
};

export const getCurrentCEFRLevel = (progress: number): CEFRLevel => {
  if (progress < 20) return "A1";
  if (progress < 40) return "A2";
  if (progress < 60) return "B1";
  if (progress < 80) return "B2";
  return "B2";
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
  };

  const lossRates: Record<CEFRLevel, number> = {
    A1: 1.2,
    A2: 1.0,
    B1: 0.9,
    B2: 0.8,
  };

  return hasError ? -lossRates[currentLevel] : gainRates[currentLevel];
};

export const initializeProgress = (selectedLevel: CEFRLevel): number =>
  CEFR_PROGRESS_RANGES[selectedLevel].min;

export const clampProgress = (progress: number) =>
  Math.max(0, Math.min(100, progress));

