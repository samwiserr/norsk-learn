/**
 * useSync Hook
 * Manages sync operations
 */

import { useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import { Session } from "@/lib/sessions";
import { SyncService, SyncStatus } from "@/src/services/syncService";
import { useOfflineQueue } from "@/src/hooks/useOfflineQueue";
import { getMultiTabSync } from "@/lib/sync/multi-tab-sync";
import { SYNC_EVENT_TYPES } from "@/lib/constants";

export function useSync(
  user: User | null,
  activeSessionId: string | null,
  sessions: Session[],
  onSessionUpdate: (sessionId: string, session: Session) => void
) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    syncing: false,
    lastSynced: null,
    error: null,
    pendingChanges: 0,
  });

  const syncSession = useCallback(
    async (session: Session) => {
      if (!user) {
        await SyncService.syncSession(user!, session, (status) => {
          setSyncStatus((prev) => ({ ...prev, ...status }));
        });
      } else {
        await SyncService.syncSession(user, session, (status) => {
          setSyncStatus((prev) => ({ ...prev, ...status }));
        });
      }
    },
    [user]
  );

  // Process offline queue
  useOfflineQueue(user, async (userId: string, session: Session) => {
    await syncSession(session);
  });

  // Listen for multi-tab sync events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const multiTabSync = getMultiTabSync();

    const unsubscribe = multiTabSync.subscribe(
      SYNC_EVENT_TYPES.SESSION_UPDATED,
      ({ sessionId, data }) => {
        if (sessionId === activeSessionId) {
          onSessionUpdate(sessionId, data);
        } else {
          const exists = sessions.find((s) => s.id === sessionId);
          if (exists) {
            onSessionUpdate(sessionId, data);
          }
        }
      }
    );

    return () => {
      // Cleanup handled by MultiTabSync
    };
  }, [activeSessionId, sessions, onSessionUpdate]);

  return { syncStatus, syncSession };
}

