"use client";

import { useSyncContext } from "@/src/context/SyncContext";
import { useLanguageContext } from "@/src/context/LanguageContext";
import { getTranslation, type Translations } from "@/lib/languages";
import "./SyncStatus.css";

interface SyncStatusProps {
  className?: string;
}

const SyncStatus = ({ className }: SyncStatusProps) => {
  const { syncStatus } = useSyncContext();
  const { language } = useLanguageContext();
  const t = (key: keyof Translations) => getTranslation(language, key);

  if (!syncStatus || (!syncStatus.syncing && !syncStatus.error && syncStatus.pendingChanges === 0)) {
    return null;
  }

  return (
    <div className={`sync-status ${className || ""}`}>
      {syncStatus.syncing && (
        <span className="sync-indicator syncing" title={t("syncing") || "Syncing..."}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle
              cx="6"
              cy="6"
              r="5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="31.416"
              strokeDashoffset="31.416"
            >
              <animate
                attributeName="stroke-dasharray"
                dur="1.5s"
                values="0 31.416;15.708 15.708;0 31.416;0 31.416"
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-dashoffset"
                dur="1.5s"
                values="0;-15.708;-31.416;-31.416"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
          {t("syncing") || "Syncing..."}
        </span>
      )}
      {syncStatus.error && !syncStatus.syncing && (
        <span className="sync-indicator error" title={syncStatus.error}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 4v2M6 7h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {t("syncError") || "Sync error"}
        </span>
      )}
      {syncStatus.pendingChanges > 0 && !syncStatus.syncing && (
        <span className="sync-indicator pending" title={`${syncStatus.pendingChanges} ${t("pendingChanges") || "pending changes"}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {syncStatus.pendingChanges} {t("pendingChanges") || "pending"}
        </span>
      )}
    </div>
  );
};

export default SyncStatus;

