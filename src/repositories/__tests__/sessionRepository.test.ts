/**
 * Unit tests for SessionRepository
 */

import { SessionRepository } from "@/src/repositories/sessionRepository";
import { StorageService } from "@/src/services/storageService";
import { Session, validateSession } from "@/lib/sessions";

// Mock StorageService
jest.mock("@/src/services/storageService");

describe("SessionRepository", () => {
  const mockSession: Session = {
    id: "session_123",
    title: "Test Session",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0,
    cefrLevel: "A1",
    messages: [],
    completedTasks: 0,
    progress: 0,
    srsReviewList: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (StorageService.loadSessions as jest.Mock).mockReturnValue([mockSession]);
  });

  describe("getAll", () => {
    it("should return all valid sessions", () => {
      const sessions = SessionRepository.getAll();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(mockSession.id);
    });

    it("should filter out invalid sessions", () => {
      (StorageService.loadSessions as jest.Mock).mockReturnValue([
        mockSession,
        { invalid: "session" },
      ]);

      const sessions = SessionRepository.getAll();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(mockSession.id);
    });
  });

  describe("getById", () => {
    it("should return session by id", () => {
      const session = SessionRepository.getById("session_123");
      expect(session).toBeDefined();
      expect(session?.id).toBe("session_123");
    });

    it("should return null for non-existent session", () => {
      const session = SessionRepository.getById("nonexistent");
      expect(session).toBeNull();
    });
  });

  describe("save", () => {
    it("should save a new session", () => {
      const newSession: Session = {
        ...mockSession,
        id: "session_456",
      };

      SessionRepository.save(newSession);
      expect(StorageService.saveSessions).toHaveBeenCalled();
    });

    it("should update existing session", () => {
      const updated = { ...mockSession, title: "Updated Title" };
      SessionRepository.save(updated);
      expect(StorageService.saveSessions).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should delete session by id", () => {
      SessionRepository.delete("session_123");
      expect(StorageService.saveSessions).toHaveBeenCalled();
    });
  });

  describe("getLatest", () => {
    it("should return the most recently updated session", () => {
      const olderSession: Session = {
        ...mockSession,
        id: "session_older",
        updatedAt: Date.now() - 1000,
      };
      const newerSession: Session = {
        ...mockSession,
        id: "session_newer",
        updatedAt: Date.now(),
      };

      (StorageService.loadSessions as jest.Mock).mockReturnValue([
        olderSession,
        newerSession,
      ]);

      const latest = SessionRepository.getLatest();
      expect(latest?.id).toBe("session_newer");
    });
  });
});




