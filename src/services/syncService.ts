/**
 * Sync Service
 * Business logic for syncing sessions to Firestore
 */

import { Session } from "@/lib/sessions";
import { User } from "firebase/auth";
import { syncSessionToFirestore } from "@/lib/firebase/sync";
import {
  addToOfflineQueue,
  processOfflineQueue,
  getQueueStats,
} from "@/lib/sync/offline-queue";
import { getMultiTabSync } from "@/lib/sync/multi-tab-sync";
import { SYNC_EVENT_TYPES } from "@/lib/constants";
import { createLogger } from "@/lib/logger";

const log = createLogger("SyncService");

export interface SyncStatus {
  syncing: boolean;
  lastSynced: number | null;
  error: string | null;
  pendingChanges: number;
}

export class SyncService {
  /**
   * Sync a session to Firestore
   */
  static async syncSession(
    user: User,
    session: Session,
    onStatusUpdate?: (status: Partial<SyncStatus>) => void
  ): Promise<void> {
    if (!user) {
      // Queue for later sync
      addToOfflineQueue({
        type: "UPDATE_SESSION",
        sessionId: session.id,
        data: session,
      });
      onStatusUpdate?.({
        pendingChanges: getQueueStats().total,
      });
      return;
    }

    onStatusUpdate?.({
      syncing: true,
      error: null,
    });

    try {
      await syncSessionToFirestore(user.uid, session);

      // Broadcast to other tabs
      if (typeof window !== "undefined") {
        const multiTabSync = getMultiTabSync();
        multiTabSync.broadcast({
          type: SYNC_EVENT_TYPES.SESSION_UPDATED,
          sessionId: session.id,
          data: session,
          timestamp: Date.now(),
        });
      }

      onStatusUpdate?.({
        syncing: false,
        lastSynced: Date.now(),
        pendingChanges: getQueueStats().total,
      });
    } catch (error) {
      log.error("Sync failed", error);
      addToOfflineQueue({
        type: "UPDATE_SESSION",
        sessionId: session.id,
        data: session,
      });

      onStatusUpdate?.({
        syncing: false,
        error: error instanceof Error ? error.message : "Sync failed",
        pendingChanges: getQueueStats().total,
      });
    }
  }

  /**
   * Process offline queue
   */
  static async processQueue(
    user: User,
    syncFn: (userId: string, session: Session) => Promise<void>
  ): Promise<void> {
    if (!navigator.onLine || !user) return;

    await processOfflineQueue(user.uid, syncFn);
  }

  /**
   * Get current sync status
   */
  static getStatus(): SyncStatus {
    const stats = getQueueStats();
    return {
      syncing: false,
      lastSynced: null,
      error: null,
      pendingChanges: stats.total,
    };
  }
}




