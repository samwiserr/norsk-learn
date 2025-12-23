/**
 * Storage Service
 * Abstraction layer for localStorage operations with error handling
 */

import {
  loadFromLocalStorage,
  saveToLocalStorage,
  getUserMessageCount,
  incrementUserMessageCount,
} from "@/lib/storage";
import { STORAGE_KEYS } from "@/lib/constants";
import { Session } from "@/lib/sessions";
import { User } from "firebase/auth";
import { LanguageCode } from "@/lib/languages";
import { CEFRLevel } from "@/lib/cefr";

export class StorageService {
  /**
   * Load CEFR level from storage
   */
  static loadCEFRLevel(): string | null {
    try {
      return loadFromLocalStorage<string>(STORAGE_KEYS.CEFR_LEVEL);
    } catch (error) {
      console.error("Error loading CEFR level:", error);
      return null;
    }
  }

  /**
   * Save CEFR level to storage
   */
  static saveCEFRLevel(level: CEFRLevel): void {
    try {
      saveToLocalStorage(STORAGE_KEYS.CEFR_LEVEL, level);
    } catch (error) {
      console.error("Error saving CEFR level:", error);
    }
  }

  /**
   * Load language from storage
   */
  static loadLanguage(): string | null {
    try {
      return loadFromLocalStorage<string>(STORAGE_KEYS.UI_LANGUAGE);
    } catch (error) {
      console.error("Error loading language:", error);
      return null;
    }
  }

  /**
   * Save language to storage
   */
  static saveLanguage(language: LanguageCode): void {
    try {
      saveToLocalStorage(STORAGE_KEYS.UI_LANGUAGE, language);
    } catch (error) {
      console.error("Error saving language:", error);
    }
  }

  /**
   * Load theme from storage
   */
  static loadTheme(): "light" | "dark" | "system" | null {
    try {
      return loadFromLocalStorage<"light" | "dark" | "system">(STORAGE_KEYS.THEME);
    } catch (error) {
      console.error("Error loading theme:", error);
      return null;
    }
  }

  /**
   * Save theme to storage
   */
  static saveTheme(theme: "light" | "dark" | "system"): void {
    try {
      saveToLocalStorage(STORAGE_KEYS.THEME, theme);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  }

  /**
   * Load sessions from storage
   */
  static loadSessions(): Session[] {
    try {
      return loadFromLocalStorage<Session[]>(STORAGE_KEYS.SESSIONS) || [];
    } catch (error) {
      console.error("Error loading sessions:", error);
      return [];
    }
  }

  /**
   * Save sessions to storage
   */
  static saveSessions(sessions: Session[]): void {
    try {
      saveToLocalStorage(STORAGE_KEYS.SESSIONS, sessions);
    } catch (error) {
      console.error("Error saving sessions:", error);
      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        console.warn("Storage quota exceeded. Consider cleaning up old sessions.");
      }
    }
  }

  /**
   * Load user from storage
   */
  static loadUser(): User | null {
    try {
      return loadFromLocalStorage<User>(STORAGE_KEYS.USER);
    } catch (error) {
      console.error("Error loading user:", error);
      return null;
    }
  }

  /**
   * Save user to storage
   */
  static saveUser(user: User | null): void {
    try {
      if (user) {
        saveToLocalStorage(STORAGE_KEYS.USER, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
      }
    } catch (error) {
      console.error("Error saving user:", error);
    }
  }

  /**
   * Get user message count
   */
  static getUserMessageCount(): number {
    try {
      return getUserMessageCount();
    } catch (error) {
      console.error("Error getting user message count:", error);
      return 0;
    }
  }

  /**
   * Increment user message count
   */
  static incrementUserMessageCount(): number {
    try {
      return incrementUserMessageCount();
    } catch (error) {
      console.error("Error incrementing user message count:", error);
      return 0;
    }
  }
}

