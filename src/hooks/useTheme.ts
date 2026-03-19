/**
 * useTheme Hook
 * Manages theme state and application
 */

import { useState, useEffect, useCallback } from "react";
import { StorageService } from "@/src/services/storageService";

export type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = StorageService.loadTheme();
    return stored || "system";
  });

  const [highContrastMode, setHighContrastModeState] = useState<boolean>(() => {
    return StorageService.loadHighContrastMode();
  });

  const applyTheme = useCallback((value: Theme) => {
    if (typeof document === "undefined") return;
    let actual: "light" | "dark" = "light";
    if (value === "system") {
      actual = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } else {
      actual = value;
    }
    document.documentElement.setAttribute("data-theme", actual);
  }, []);

  // Load theme on mount
  useEffect(() => {
    const stored = StorageService.loadTheme();
    if (stored) {
      setThemeState(stored);
      applyTheme(stored);
    } else {
      StorageService.saveTheme("system");
    }

    const handler = () => {
      if (theme === "system") applyTheme("system");
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [applyTheme, theme]);

  // Save theme when it changes
  useEffect(() => {
    StorageService.saveTheme(theme);
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Apply high contrast mode
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-high-contrast", highContrastMode.toString());
    }
    StorageService.saveHighContrastMode(highContrastMode);
  }, [highContrastMode]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const setHighContrastMode = useCallback((value: boolean) => {
    setHighContrastModeState(value);
  }, []);

  return { theme, setTheme, highContrastMode, setHighContrastMode };
}

