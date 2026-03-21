"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadFromLocalStorage } from "@/lib/storage";
import { isValidLanguageCode } from "@/lib/languages";
import { isValidCEFRLevel } from "@/lib/cefr";
import { SESSION_STORAGE_KEYS } from "@/lib/constants";

/**
 * Redirects to language or level selection until the user has completed first-time setup.
 * - `dashboard`: same checks as the home dashboard (no return path stored).
 * - `writing` | `speaking`: stores RETURN_PATH so level selection can send the user back to that route.
 */
export type AppSetupGateMode = "dashboard" | "writing" | "speaking";

export function useAppSetupGate(mode: AppSetupGateMode): boolean {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const storedLanguage = loadFromLocalStorage<string>("norsk_ui_language");
    if (!storedLanguage || !isValidLanguageCode(storedLanguage)) {
      router.push("/language-selection");
      return;
    }

    const storedLevel = loadFromLocalStorage<string>("norsk_cefr_level");
    if (!storedLevel || !isValidCEFRLevel(storedLevel)) {
      if (mode === "writing") {
        sessionStorage.setItem(SESSION_STORAGE_KEYS.RETURN_PATH, "/writing");
      } else if (mode === "speaking") {
        sessionStorage.setItem(SESSION_STORAGE_KEYS.RETURN_PATH, "/speaking");
      }
      router.push("/level-selection");
      return;
    }

    setReady(true);
  }, [router, mode]);

  return ready;
}
