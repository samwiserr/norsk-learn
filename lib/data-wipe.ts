import { deleteFromLocalStorage } from "@/lib/storage";
import { createLogger } from "@/lib/logger";

const log = createLogger("DataWipe");

const LEARNING_DATA_KEYS = [
  "norsk_sessions",
  "norsk_session_bundle_updated_at",
  "norsk_user_message_count",
  "norsk_srs_cards",
  "norsk_gamification",
  "norsk_level_metrics",
  "norsk_sync_queue",
  "norsk_cefr_level",
  "norsk_tutor_analytics_v1",
] as const;

/**
 * Wipe all learning data from localStorage.
 * Used when the user changes language after tutorial has started.
 * Does NOT clear: norsk_user, norsk_theme, norsk_ui_language.
 */
export function wipeAllLearningData() {
  if (typeof window === "undefined") return;

  for (const key of LEARNING_DATA_KEYS) {
    deleteFromLocalStorage(key);
  }

  sessionStorage.clear();
  log.info("All learning data wiped");
}

/**
 * Wipe learning data AND clear Firestore sessions for an authenticated user.
 */
export async function wipeAllLearningDataWithSync(userId?: string) {
  wipeAllLearningData();

  if (!userId) return;

  try {
    const { loadAllSessionsFromFirestore, deleteSessionFromFirestore } =
      await import("@/lib/firebase/sync");
    const remoteSessions = await loadAllSessionsFromFirestore(userId);
    await Promise.allSettled(
      remoteSessions.map((s) => deleteSessionFromFirestore(userId, s.id))
    );
    log.info("Remote sessions deleted", { count: remoteSessions.length });
  } catch (err) {
    log.warn("Failed to clear Firestore sessions (Firebase may not be configured)", err);
  }
}
