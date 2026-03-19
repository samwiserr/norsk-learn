/**
 * Adaptive level assessment engine
 * Tracks rolling accuracy and suggests level changes based on performance
 */

import { CEFRLevel, CEFR_LEVELS } from "./cefr";
import { loadFromLocalStorage, saveToLocalStorage } from "./storage";

const STORAGE_KEY = "norsk_level_metrics";
const WINDOW_SIZE = 20; // rolling window of last N interactions

interface LevelMetrics {
  history: { delta: number; timestamp: number }[];
  currentLevel: CEFRLevel;
  lastSuggestion: number | null;
  suggestCooldownMs: number;
}

function loadMetrics(): LevelMetrics | null {
  return loadFromLocalStorage<LevelMetrics>(STORAGE_KEY);
}

function saveMetrics(metrics: LevelMetrics): void {
  saveToLocalStorage(STORAGE_KEY, metrics);
}

export function initMetrics(level: CEFRLevel): void {
  const existing = loadMetrics();
  if (existing && existing.currentLevel === level) return;
  saveMetrics({
    history: [],
    currentLevel: level,
    lastSuggestion: null,
    suggestCooldownMs: 24 * 60 * 60 * 1000, // 24h between suggestions
  });
}

export function recordProgressDelta(delta: number): void {
  const metrics = loadMetrics();
  if (!metrics) return;

  metrics.history.push({ delta, timestamp: Date.now() });
  if (metrics.history.length > WINDOW_SIZE * 2) {
    metrics.history = metrics.history.slice(-WINDOW_SIZE);
  }
  saveMetrics(metrics);
}

export type LevelSuggestion =
  | { type: "up"; from: CEFRLevel; to: CEFRLevel; accuracy: number }
  | { type: "down"; from: CEFRLevel; to: CEFRLevel; accuracy: number }
  | null;

export function checkLevelSuggestion(): LevelSuggestion {
  const metrics = loadMetrics();
  if (!metrics) return null;

  const recent = metrics.history.slice(-WINDOW_SIZE);
  if (recent.length < WINDOW_SIZE) return null;

  if (
    metrics.lastSuggestion &&
    Date.now() - metrics.lastSuggestion < metrics.suggestCooldownMs
  ) {
    return null;
  }

  const positives = recent.filter((h) => h.delta > 0).length;
  const accuracy = positives / recent.length;

  const idx = CEFR_LEVELS.indexOf(metrics.currentLevel);

  if (accuracy >= 0.85 && idx < CEFR_LEVELS.length - 1) {
    return {
      type: "up",
      from: metrics.currentLevel,
      to: CEFR_LEVELS[idx + 1]!,
      accuracy,
    };
  }

  if (accuracy <= 0.35 && idx > 0) {
    return {
      type: "down",
      from: metrics.currentLevel,
      to: CEFR_LEVELS[idx - 1]!,
      accuracy,
    };
  }

  return null;
}

export function acceptSuggestion(newLevel: CEFRLevel): void {
  const metrics = loadMetrics();
  if (!metrics) return;
  metrics.currentLevel = newLevel;
  metrics.lastSuggestion = Date.now();
  metrics.history = [];
  saveMetrics(metrics);
}

export function dismissSuggestion(): void {
  const metrics = loadMetrics();
  if (!metrics) return;
  metrics.lastSuggestion = Date.now();
  saveMetrics(metrics);
}

export function getAccuracy(): number | null {
  const metrics = loadMetrics();
  if (!metrics || metrics.history.length < 5) return null;
  const recent = metrics.history.slice(-WINDOW_SIZE);
  return recent.filter((h) => h.delta > 0).length / recent.length;
}
