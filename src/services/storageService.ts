/**
 * Storage Service
 * Abstraction layer for localStorage operations with error handling
 */

import {
  loadFromLocalStorage,
  saveToLocalStorage,
  getUserMessageCount,
  incrementUserMessageCount,
  resetUserMessageCount as resetMessageCount,
} from "@/lib/storage";
import { STORAGE_KEYS } from "@/lib/constants";
import { Session } from "@/lib/sessions";
import { User } from "firebase/auth";
import { LanguageCode } from "@/lib/languages";
import { CEFRLevel } from "@/lib/cefr";
import { createLogger } from "@/lib/logger";

const log = createLogger("StorageService");

export class StorageService {
  /**
   * Load CEFR level from storage
   */
  static loadCEFRLevel(): string | null {
    try {
      return loadFromLocalStorage<string>(STORAGE_KEYS.CEFR_LEVEL);
    } catch (error) {
      log.error("Error loading CEFR level", error);
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
      log.error("Error saving CEFR level", error);
    }
  }

  /**
   * Load language from storage
   */
  static loadLanguage(): string | null {
    try {
      return loadFromLocalStorage<string>(STORAGE_KEYS.UI_LANGUAGE);
    } catch (error) {
      log.error("Error loading language", error);
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
      log.error("Error saving language", error);
    }
  }

  /**
   * Load theme from storage
   */
  static loadTheme(): "light" | "dark" | "system" | null {
    try {
      return loadFromLocalStorage<"light" | "dark" | "system">(STORAGE_KEYS.THEME);
    } catch (error) {
      log.error("Error loading theme", error);
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
      log.error("Error saving theme", error);
    }
  }

  /**
   * Load sessions from storage
   */
  static loadSessions(): Session[] {
    try {
      return loadFromLocalStorage<Session[]>(STORAGE_KEYS.SESSIONS) || [];
    } catch (error) {
      log.error("Error loading sessions", error);
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
      log.error("Error saving sessions", error);
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        log.warn("Storage quota exceeded. Consider cleaning up old sessions.");
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
      log.error("Error loading user", error);
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
      log.error("Error saving user", error);
    }
  }

  /**
   * Get user message count
   */
  static getUserMessageCount(): number {
    try {
      return getUserMessageCount();
    } catch (error) {
      log.error("Error getting user message count", error);
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
      log.error("Error incrementing user message count", error);
      return 0;
    }
  }

  /**
   * Reset user message count
   */
  static resetUserMessageCount(): void {
    try {
      resetMessageCount();
    } catch (error) {
      log.error("Error resetting user message count", error);
    }
  }

  /**
   * Load high contrast mode setting
   */
  static loadHighContrastMode(): boolean {
    try {
      return loadFromLocalStorage<boolean>(STORAGE_KEYS.HIGH_CONTRAST) ?? false;
    } catch (error) {
      log.error("Error loading high contrast setting", error);
      return false;
    }
  }

  /**
   * Save high contrast mode setting
   */
  static saveHighContrastMode(enabled: boolean): void {
    try {
      saveToLocalStorage(STORAGE_KEYS.HIGH_CONTRAST, enabled);
    } catch (error) {
      log.error("Error saving high contrast setting", error);
    }
  }
}

