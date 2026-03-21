"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { AnalyticsService } from "@/src/services/analyticsService";
import { evaluateProgressionSuggestion } from "@/src/services/cefrProgressionEngine";

export default function ProgressPage() {
  const router = useRouter();
  useLanguageContext();
  const { cefrLevel } = useSessionContext();
  const [gamification, setGamification] = useState<GamificationState | null>(null);
  const [srsStats, setSrsStats] = useState({ total: 0, new: 0, learning: 0, review: 0, due: 0, mature: 0 });
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [analyticsTick, setAnalyticsTick] = useState(0);

  useEffect(() => {
    setGamification(loadGamification());
    setSrsStats(getCardStats(loadCards()));
    setAccuracy(getAccuracy());
  }, []);

  useEffect(() => {
    const fn = () => setAnalyticsTick((n) => n + 1);
    window.addEventListener("norsk-analytics-updated", fn);
    return () => window.removeEventListener("norsk-analytics-updated", fn);
  }, []);

  const tutorInsights = useMemo(() => {
    void analyticsTick;
    const events = AnalyticsService.getEvents();
    const atLevel = cefrLevel ? events.filter((e) => e.cefrLevel === cefrLevel) : events;
    const last20 = atLevel.slice(-20);
    const mustRate = last20.length
      ? Math.round((last20.filter((e) => e.hadMustFix).length / last20.length) * 100)
      : null;
    const graded = last20.filter((e) => e.exerciseGraded);
    const exRate = graded.length
      ? Math.round((graded.filter((e) => e.exerciseCorrect).length / graded.length) * 100)
      : null;
    const suggestion = evaluateProgressionSuggestion(events, cefrLevel ?? null);
    return { sample: last20.length, mustRate, exRate, suggestion, totalTurns: atLevel.length };
  }, [cefrLevel, analyticsTick]);

  if (!gamification) return null;

  const xpProgress = getXpForNextLevel(gamification);
  const unlockedAchievements = gamification.achievements.filter((a) => a.unlockedAt !== null);
  const lockedAchievements = gamification.achievements.filter((a) => a.unlockedAt === null);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Your Progress</h1>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-muted-foreground hover:text-foreground transition"
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
        <div className="mb-6 rounded-3xl border border-border/80 bg-card/95 p-6 shadow-[0_14px_28px_hsl(224_30%_30%_/_0.09)]">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Level {gamification.level}</span>
            <span className="text-muted-foreground">
              {xpProgress.current} / {xpProgress.needed} XP
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(xpProgress.progress * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Accuracy */}
        {accuracy !== null && (
          <div className="mb-6 rounded-3xl border border-border/80 bg-card/95 p-6 shadow-[0_14px_28px_hsl(224_30%_30%_/_0.09)]">
            <h2 className="font-semibold mb-2">Rolling Accuracy</h2>
            <div className="text-3xl font-bold text-primary">
              {Math.round(accuracy * 100)}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Based on your last 20 interactions
            </p>
          </div>
        )}

        {/* Analytics-derived tutor insights */}
        {tutorInsights.totalTurns > 0 && (
          <div className="mb-6 rounded-3xl border border-border/80 bg-card/95 p-6 shadow-[0_14px_28px_hsl(224_30%_30%_/_0.09)]">
            <h2 className="font-semibold mb-3">Writing tutor (this level)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              From your last {tutorInsights.sample} recorded turns at {cefrLevel ?? "all levels"}.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {tutorInsights.mustRate !== null && (
                <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4">
                  <div className="text-xs text-muted-foreground">Turns with must-fix corrections</div>
                  <div className="text-2xl font-bold text-primary">{tutorInsights.mustRate}%</div>
                </div>
              )}
              {tutorInsights.exRate !== null && (
                <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4">
                  <div className="text-xs text-muted-foreground">Exercise turns marked correct</div>
                  <div className="text-2xl font-bold text-primary">{tutorInsights.exRate}%</div>
                </div>
              )}
            </div>
            {tutorInsights.suggestion && (
              <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm">
                <p className="font-medium text-foreground">Level suggestion</p>
                <p className="mt-1 text-muted-foreground">
                  {tutorInsights.suggestion.kind === "level_up" &&
                    `Consider trying ${tutorInsights.suggestion.targetLevel} when you are ready.`}
                  {tutorInsights.suggestion.kind === "level_down" &&
                    `You might find ${tutorInsights.suggestion.targetLevel} more comfortable for a while.`}
                  {tutorInsights.suggestion.kind === "exercise_focus" &&
                    "Try a focused exercise in Writing to push past a plateau."}
                </p>
                <Link
                  href="/level-selection"
                  className="mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Review CEFR level
                </Link>
              </div>
            )}
          </div>
        )}

        {/* SRS stats */}
        <div className="mb-6 rounded-3xl border border-border/80 bg-card/95 p-6 shadow-[0_14px_28px_hsl(224_30%_30%_/_0.09)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Review Cards</h2>
            {srsStats.due > 0 && (
              <button
                onClick={() => router.push("/review")}
                className="rounded-xl bg-primary px-4 py-1.5 text-sm text-primary-foreground transition hover:-translate-y-0.5 hover:opacity-95"
              >
                Review ({srsStats.due} due)
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-blue-500">{srsStats.new}</div>
              <div className="text-xs text-muted-foreground">New</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-500">{srsStats.learning}</div>
              <div className="text-xs text-muted-foreground">Learning</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-500">{srsStats.mature}</div>
              <div className="text-xs text-muted-foreground">Mature</div>
            </div>
          </div>
        </div>

        {/* More stats */}
        <div className="mb-6 rounded-3xl border border-border/80 bg-card/95 p-6 shadow-[0_14px_28px_hsl(224_30%_30%_/_0.09)]">
          <h2 className="font-semibold mb-4">Activity</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total messages</span>
              <span className="font-medium">{gamification.totalMessages}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conversations</span>
              <span className="font-medium">{gamification.totalSessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Longest streak</span>
              <span className="font-medium">{gamification.longestStreak} days</span>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="rounded-3xl border border-border/80 bg-card/95 p-6 shadow-[0_14px_28px_hsl(224_30%_30%_/_0.09)]">
          <h2 className="font-semibold mb-4">Achievements</h2>
          {unlockedAchievements.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {unlockedAchievements.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-secondary/45 p-3">
                  <span className="text-2xl">{a.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {lockedAchievements.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {lockedAchievements.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-secondary/35 p-3 opacity-55">
                  <span className="text-2xl grayscale">{a.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.description}</div>
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
    <div className="rounded-2xl border border-border/80 bg-card/95 p-4 text-center shadow-[0_10px_20px_hsl(224_30%_30%_/_0.08)]">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
