/**
 * Session Repository
 * Data access layer for session operations
 */

import { Session, validateSession } from "@/lib/sessions";
import { StorageService } from "@/src/services/storageService";
import { createLogger } from "@/lib/logger";

const log = createLogger("SessionRepo");

export class SessionRepository {
  /**
   * Get all sessions
   */
  static getAll(): Session[] {
    const sessions = StorageService.loadSessions();
    return sessions.filter(validateSession);
  }

  /**
   * Get session by ID
   */
  static getById(id: string): Session | null {
    const sessions = this.getAll();
    return sessions.find((s) => s.id === id) || null;
  }

  /**
   * Save all sessions
   */
  static saveAll(sessions: Session[]): void {
    const validSessions = sessions.filter(validateSession);
    StorageService.saveSessions(validSessions);
    const maxU = validSessions.reduce((m, s) => Math.max(m, s.updatedAt), 0);
    StorageService.saveSessionBundleUpdatedAt(Math.max(maxU, Date.now()));
  }

  /**
   * Save a single session (updates existing or adds new)
   */
  static save(session: Session): void {
    if (!validateSession(session)) {
      log.error("Invalid session", { sessionId: (session as any)?.id });
      return;
    }

    const sessions = this.getAll();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);

    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }

    this.saveAll(sessions);
  }

  /**
   * Delete session by ID
   */
  static delete(id: string): void {
    const sessions = this.getAll();
    const filtered = sessions.filter((s) => s.id !== id);
    this.saveAll(filtered);
  }

  /**
   * Get latest session
   */
  static getLatest(): Session | null {
    const sessions = this.getAll();
    if (sessions.length === 0) return null;

    return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
  }

  /**
   * Get sessions sorted by updated date (newest first)
   */
  static getAllSorted(): Session[] {
    return this.getAll().sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Clear all sessions
   */
  static clearAll(): void {
    log.info("Clearing all sessions");
    StorageService.saveSessions([]);
    const verify = this.getAll();
    log.debug("Verification - sessions after clear", { remaining: verify.length });
  }
}

