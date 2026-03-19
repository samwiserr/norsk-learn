/**
 * Theme Context
 * Manages theme state
 */

"use client";

import { createContext, useContext, ReactNode } from "react";
import { useTheme, Theme } from "@/src/hooks/useTheme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  highContrastMode: boolean;
  setHighContrastMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({} as ThemeContextValue);

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { theme, setTheme, highContrastMode, setHighContrastMode } = useTheme();

  return (
    <ThemeContext.Provider value={{ theme, setTheme, highContrastMode, setHighContrastMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

