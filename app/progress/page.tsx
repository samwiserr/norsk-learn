"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguageContext } from "@/src/context/LanguageContext";
import { useSessionContext } from "@/src/context/SessionContext";
import {
  loadGamification,
  getXpForNextLevel,
  type GamificationState,
} from "@/lib/gamification";
import { getCardStats } from "@/lib/srs/fsrs";
import { loadCards } from "@/lib/srs/storage";
import { getAccuracy } from "@/lib/adaptive-level";

export default function ProgressPage() {
  const router = useRouter();
  useLanguageContext();
  const { cefrLevel } = useSessionContext();
  const [gamification, setGamification] = useState<GamificationState | null>(null);
  const [srsStats, setSrsStats] = useState({ total: 0, new: 0, learning: 0, review: 0, due: 0, mature: 0 });
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    setGamification(loadGamification());
    setSrsStats(getCardStats(loadCards()));
    setAccuracy(getAccuracy());
  }, []);

  if (!gamification) return null;

  const xpProgress = getXpForNextLevel(gamification);
  const unlockedAchievements = gamification.achievements.filter((a) => a.unlockedAt !== null);
  const lockedAchievements = gamification.achievements.filter((a) => a.unlockedAt === null);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Your Progress</h1>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            &larr; Back to Chat
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="XP" value={gamification.xp.toLocaleString()} />
          <StatCard label="Level" value={gamification.level.toString()} />
          <StatCard label="Streak" value={`${gamification.streak} day${gamification.streak !== 1 ? "s" : ""}`} />
          <StatCard label="CEFR" value={cefrLevel ?? "—"} />
        </div>

        {/* XP bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Level {gamification.level}</span>
            <span className="text-[var(--text-secondary)]">
              {xpProgress.current} / {xpProgress.needed} XP
            </span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(xpProgress.progress * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Accuracy */}
        {accuracy !== null && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm">
            <h2 className="font-semibold mb-2">Rolling Accuracy</h2>
            <div className="text-3xl font-bold text-[var(--primary)]">
              {Math.round(accuracy * 100)}%
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Based on your last 20 interactions
            </p>
          </div>
        )}

        {/* SRS stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Review Cards</h2>
            {srsStats.due > 0 && (
              <button
                onClick={() => router.push("/review")}
                className="text-sm px-4 py-1.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition"
              >
                Review ({srsStats.due} due)
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-blue-500">{srsStats.new}</div>
              <div className="text-xs text-[var(--text-secondary)]">New</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-500">{srsStats.learning}</div>
              <div className="text-xs text-[var(--text-secondary)]">Learning</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-500">{srsStats.mature}</div>
              <div className="text-xs text-[var(--text-secondary)]">Mature</div>
            </div>
          </div>
        </div>

        {/* More stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="font-semibold mb-4">Activity</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Total messages</span>
              <span className="font-medium">{gamification.totalMessages}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Conversations</span>
              <span className="font-medium">{gamification.totalSessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Longest streak</span>
              <span className="font-medium">{gamification.longestStreak} days</span>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold mb-4">Achievements</h2>
          {unlockedAchievements.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {unlockedAchievements.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
                  <span className="text-2xl">{a.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{a.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {lockedAchievements.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {lockedAchievements.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 opacity-50">
                  <span className="text-2xl grayscale">{a.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{a.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
      <div className="text-2xl font-bold text-[var(--primary)]">{value}</div>
      <div className="text-xs text-[var(--text-secondary)] mt-1">{label}</div>
    </div>
  );
}
