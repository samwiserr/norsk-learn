/**
 * useProgress Hook
 * Manages progress calculations
 */

import { useMemo } from "react";
import { Session } from "@/lib/sessions";
import { ProgressService } from "@/src/services/progressService";

export function useProgress(activeSession: Session | null) {
  const progress = useMemo(() => {
    return activeSession?.progress ?? 0;
  }, [activeSession?.progress]);

  const percentage = useMemo(() => {
    return ProgressService.getPercentage(progress);
  }, [progress]);

  const currentLevel = useMemo(() => {
    return ProgressService.getCurrentLevel(progress);
  }, [progress]);

  const completedTasks = useMemo(() => {
    return activeSession?.completedTasks ?? 0;
  }, [activeSession?.completedTasks]);

  return {
    progress,
    percentage,
    currentLevel,
    completedTasks,
  };
}

