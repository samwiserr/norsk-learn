/**
 * useOfflineQueue Hook
 * Manages offline queue processing
 */

import { useEffect } from "react";
import { User } from "firebase/auth";
import { SyncService } from "@/src/services/syncService";

export function useOfflineQueue(
  user: User | null,
  syncFn: (userId: string, session: any) => Promise<void>
) {
  useEffect(() => {
    if (!user) return;

    const processQueue = async () => {
      if (navigator.onLine && user) {
        await SyncService.processQueue(user, syncFn);
      }
    };

    window.addEventListener("online", processQueue);
    processQueue();

    return () => {
      window.removeEventListener("online", processQueue);
    };
  }, [user, syncFn]);
}

