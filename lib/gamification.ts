/**
 * Gamification engine: streaks, XP, achievements
 */

import { loadFromLocalStorage, saveToLocalStorage } from "./storage";

const STORAGE_KEY = "norsk_gamification";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number | null;
}

export interface GamificationState {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  lastActiveDate: string | null; // ISO date string YYYY-MM-DD
  totalMessages: number;
  totalSessions: number;
  achievements: Achievement[];
}

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6500];

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: "first_message", name: "First Words", description: "Send your first message", icon: "💬", unlockedAt: null },
  { id: "first_session", name: "Getting Started", description: "Complete your first conversation", icon: "🎯", unlockedAt: null },
  { id: "streak_3", name: "On a Roll", description: "3-day streak", icon: "🔥", unlockedAt: null },
  { id: "streak_7", name: "Weekly Warrior", description: "7-day streak", icon: "⚡", unlockedAt: null },
  { id: "streak_30", name: "Monthly Master", description: "30-day streak", icon: "🏆", unlockedAt: null },
  { id: "messages_10", name: "Conversationalist", description: "Send 10 messages", icon: "🗣️", unlockedAt: null },
  { id: "messages_50", name: "Chatterbox", description: "Send 50 messages", icon: "📢", unlockedAt: null },
  { id: "messages_100", name: "Language Explorer", description: "Send 100 messages", icon: "🌍", unlockedAt: null },
  { id: "xp_500", name: "Rising Star", description: "Earn 500 XP", icon: "⭐", unlockedAt: null },
  { id: "xp_2000", name: "Language Enthusiast", description: "Earn 2000 XP", icon: "🌟", unlockedAt: null },
  { id: "level_5", name: "Intermediate", description: "Reach level 5", icon: "📚", unlockedAt: null },
];

function todayStr(): string {
  return new Date().toISOString().split("T")[0]!;
}

function levelFromXp(xp: number): number {
  let level = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]!) level = i;
  }
  return level;
}

export function loadGamification(): GamificationState {
  const stored = loadFromLocalStorage<GamificationState>(STORAGE_KEY);
  if (stored) {
    if (!stored.achievements || stored.achievements.length < DEFAULT_ACHIEVEMENTS.length) {
      const existingIds = new Set(stored.achievements?.map((a) => a.id) ?? []);
      const merged = [
        ...(stored.achievements ?? []),
        ...DEFAULT_ACHIEVEMENTS.filter((a) => !existingIds.has(a.id)),
      ];
      stored.achievements = merged;
    }
    return stored;
  }
  return {
    xp: 0,
    level: 0,
    streak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    totalMessages: 0,
    totalSessions: 0,
    achievements: DEFAULT_ACHIEVEMENTS,
  };
}

function saveGamification(state: GamificationState): void {
  saveToLocalStorage(STORAGE_KEY, state);
}

function checkAchievements(state: GamificationState): string[] {
  const newlyUnlocked: string[] = [];
  const now = Date.now();

  const checks: Record<string, boolean> = {
    first_message: state.totalMessages >= 1,
    first_session: state.totalSessions >= 1,
    streak_3: state.streak >= 3,
    streak_7: state.streak >= 7,
    streak_30: state.streak >= 30,
    messages_10: state.totalMessages >= 10,
    messages_50: state.totalMessages >= 50,
    messages_100: state.totalMessages >= 100,
    xp_500: state.xp >= 500,
    xp_2000: state.xp >= 2000,
    level_5: state.level >= 5,
  };

  for (const achievement of state.achievements) {
    if (achievement.unlockedAt === null && checks[achievement.id]) {
      achievement.unlockedAt = now;
      newlyUnlocked.push(achievement.id);
    }
  }

  return newlyUnlocked;
}

export interface XPEvent {
  newlyUnlocked: string[];
  xpGained: number;
  levelUp: boolean;
}

export function recordMessage(hasCorrection: boolean): XPEvent {
  const state = loadGamification();
  const today = todayStr();

  // Update streak
  if (state.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (state.lastActiveDate === yesterdayStr) {
      state.streak += 1;
    } else if (state.lastActiveDate !== today) {
      state.streak = 1;
    }
    state.lastActiveDate = today;
    state.longestStreak = Math.max(state.longestStreak, state.streak);
  }

  // XP calculation
  let xpGained = 10; // base
  if (!hasCorrection) xpGained += 5; // bonus for no errors
  if (state.streak >= 3) xpGained += 5; // streak bonus
  if (state.streak >= 7) xpGained += 5;

  state.xp += xpGained;
  state.totalMessages += 1;

  const oldLevel = state.level;
  state.level = levelFromXp(state.xp);

  const newlyUnlocked = checkAchievements(state);
  saveGamification(state);

  return {
    newlyUnlocked,
    xpGained,
    levelUp: state.level > oldLevel,
  };
}

export function recordSessionComplete(): void {
  const state = loadGamification();
  state.totalSessions += 1;
  checkAchievements(state);
  saveGamification(state);
}

export function getXpForNextLevel(state: GamificationState): {
  current: number;
  needed: number;
  progress: number;
} {
  const nextIdx = Math.min(state.level + 1, LEVEL_THRESHOLDS.length - 1);
  const currentThreshold = LEVEL_THRESHOLDS[state.level] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[nextIdx] ?? currentThreshold;
  const rangeSize = nextThreshold - currentThreshold;
  const current = state.xp - currentThreshold;
  return {
    current,
    needed: rangeSize,
    progress: rangeSize > 0 ? current / rangeSize : 1,
  };
}
