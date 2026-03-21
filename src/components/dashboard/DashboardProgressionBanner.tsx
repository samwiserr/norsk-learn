"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { AnalyticsService } from "@/src/services/analyticsService";
import {
  evaluateProgressionSuggestion,
  type ProgressionSuggestion,
} from "@/src/services/cefrProgressionEngine";
import type { CEFRLevel } from "@/lib/cefr";
import { SESSION_STORAGE_KEYS_PROGRESS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { LanguageCode } from "@/lib/languages";
import { getTranslation } from "@/lib/languages";

function suggestionKey(s: ProgressionSuggestion): string {
  if (s.kind === "level_up") return `up_${s.targetLevel}`;
  if (s.kind === "level_down") return `down_${s.targetLevel}`;
  return "exercise";
}

export function DashboardProgressionBanner({
  cefrLevel,
  language,
}: {
  cefrLevel: CEFRLevel | null;
  language: LanguageCode;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onUp = () => setTick((n) => n + 1);
    window.addEventListener("norsk-analytics-updated", onUp);
    return () => window.removeEventListener("norsk-analytics-updated", onUp);
  }, []);

  const suggestion = useMemo(() => {
    void tick;
    if (!cefrLevel || typeof window === "undefined") return null;
    const s = evaluateProgressionSuggestion(AnalyticsService.getEvents(), cefrLevel);
    if (!s) return null;
    const k = suggestionKey(s);
    const dismissed = sessionStorage.getItem(SESSION_STORAGE_KEYS_PROGRESS.DISMISS_LEVEL_SUGGESTION);
    if (dismissed === k) return null;
    return s;
  }, [cefrLevel, tick]);

  const dismiss = () => {
    if (!suggestion) return;
    sessionStorage.setItem(
      SESSION_STORAGE_KEYS_PROGRESS.DISMISS_LEVEL_SUGGESTION,
      suggestionKey(suggestion),
    );
    setTick((n) => n + 1);
  };

  if (!suggestion || !cefrLevel) return null;

  const t = (k: Parameters<typeof getTranslation>[1], p?: Record<string, string>) =>
    getTranslation(language, k, p);

  let message: string;
  if (suggestion.kind === "level_up") {
    message = t("progressionBannerLevelUp", { level: suggestion.targetLevel });
  } else if (suggestion.kind === "level_down") {
    message = t("progressionBannerLevelDown", { level: suggestion.targetLevel });
  } else {
    message = t("progressionBannerExercise");
  }

  return (
    <div
      className={cn(
        "mx-auto mb-8 max-w-4xl rounded-2xl border border-border/80 bg-muted/40 px-4 py-3 text-sm shadow-sm",
      )}
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-foreground">{message}</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/level-selection"
            onClick={dismiss}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-[0_10px_20px_hsl(228_45%_45%_/_0.2)] transition hover:-translate-y-0.5 hover:brightness-105"
          >
            {t("progressionReviewLevels")}
          </Link>
          <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
            {t("progressionDismiss")}
          </Button>
        </div>
      </div>
    </div>
  );
}
