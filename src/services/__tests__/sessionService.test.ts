/**
 * Unit tests for SessionService
 */

import { SessionService } from "@/src/services/sessionService";
import { SessionRepository } from "@/src/repositories/sessionRepository";
import { Session } from "@/lib/sessions";
import { CEFRLevel } from "@/lib/cefr";

// Mock dependencies
jest.mock("@/src/repositories/sessionRepository");
jest.mock("@/src/services/apiService");

describe("SessionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new session with initial progress", () => {
      const level: CEFRLevel = "A1";
      const session = SessionService.create(level);

      expect(session).toBeDefined();
      expect(session.cefrLevel).toBe(level);
      expect(session.progress).toBe(0);
      expect(session.messages).toEqual([]);
      expect(session.id).toContain("session_");
    });
  });

  describe("isEmpty", () => {
    it("should return true for session with no user messages", () => {
      const session: Session = {
        id: "test",
        title: "Test",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 1,
        cefrLevel: "A1",
        messages: [{ id: "1", role: "assistant", content: "Hello", timestamp: Date.now() }],
        completedTasks: 0,
        progress: 0,
        srsReviewList: [],
      };

      expect(SessionService.isEmpty(session)).toBe(true);
    });

    it("should return false for session with user messages", () => {
      const session: Session = {
        id: "test",
        title: "Test",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 2,
        cefrLevel: "A1",
        messages: [
          { id: "1", role: "assistant", content: "Hello", timestamp: Date.now() },
          { id: "2", role: "user", content: "Hi", timestamp: Date.now() },
        ],
        completedTasks: 0,
        progress: 0,
        srsReviewList: [],
      };

      expect(SessionService.isEmpty(session)).toBe(false);
    });
  });

  describe("updateProgress", () => {
    it("should update session progress correctly", () => {
      const session: Session = {
        id: "test",
        title: "Test",
        createdAt: Date.now(),
        updatedAt: Date.now() - 1000, // Set to past to ensure update is newer
        messageCount: 0,
        cefrLevel: "A1",
        messages: [],
        completedTasks: 0,
        progress: 10,
        srsReviewList: [],
      };

      const updated = SessionService.updateProgress(session, 5);
      expect(updated.progress).toBe(15);
      expect(updated.updatedAt).toBeGreaterThanOrEqual(session.updatedAt);
    });

    it("should clamp progress to valid range", () => {
      const session: Session = {
        id: "test",
        title: "Test",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0,
        cefrLevel: "A1",
        messages: [],
        completedTasks: 0,
        progress: 99,
        srsReviewList: [],
      };

      const updated = SessionService.updateProgress(session, 10);
      expect(updated.progress).toBeLessThanOrEqual(100);
    });
  });
});

