/**
 * Session Service
 * Business logic for session management
 */

import {
  Session,
  Message,
  createNewSession,
  generateSessionTitleFromMessages,
} from "@/lib/sessions";
import { CEFRLevel } from "@/lib/cefr";
import { initializeProgress, clampProgress } from "@/lib/cefr-progress";
import { SessionRepository } from "@/src/repositories/sessionRepository";
import { ApiService } from "@/src/services/apiService";
import { LanguageCode } from "@/lib/languages";

export class SessionService {
  /**
   * Create a new session
   */
  static create(cefrLevel: CEFRLevel): Session {
    const initialProgress = initializeProgress(cefrLevel);
    return createNewSession(cefrLevel, initialProgress);
  }

  /**
   * Check if a session is empty (no user messages)
   */
  static isEmpty(session: Session): boolean {
    return !session.messages.some((msg) => msg.role === "user");
  }

  /**
   * Find an empty session for a given level
   */
  static findEmptySession(cefrLevel: CEFRLevel): Session | null {
    const sessions = SessionRepository.getAll();
    return (
      sessions.find((s) => s.cefrLevel === cefrLevel && this.isEmpty(s)) ||
      null
    );
  }

  /**
   * Generate welcome message for a session
   */
  static async generateWelcomeMessage(
    sessionId: string,
    cefrLevel: CEFRLevel,
    language: LanguageCode
  ): Promise<Message | null> {
    try {
      const response = await ApiService.getInitialQuestion(cefrLevel, language);

      let welcomeContent = response.welcomeMessage || "";
      const firstQuestion = response.firstQuestion || "";

      if (firstQuestion && !welcomeContent.includes(firstQuestion)) {
        const hasQuestionReference = /(following|first|next).*question|spørsmål/i.test(
          welcomeContent
        );
        if (hasQuestionReference) {
          welcomeContent = welcomeContent.replace(
            /(?:following|first|next).*question[^:]*:?/i,
            `following question in Norwegian Bokmål:\n\n${firstQuestion}`
          );
          if (!welcomeContent.includes(firstQuestion)) {
            welcomeContent = `${welcomeContent}\n\n${firstQuestion}`;
          }
        } else {
          welcomeContent = `${welcomeContent}\n\n${firstQuestion}`;
        }
      }

      return {
        id: `msg_${Date.now()}_welcome`,
        role: "assistant",
        content: welcomeContent.trim(),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Welcome message error", error);
      return null;
    }
  }

  /**
   * Update session progress
   */
  static updateProgress(
    session: Session,
    progressDelta: number
  ): Session {
    const newProgress = clampProgress((session.progress ?? 0) + progressDelta);
    return {
      ...session,
      progress: newProgress,
      updatedAt: Date.now(),
    };
  }

  /**
   * Update session title based on messages
   */
  static updateTitle(session: Session, cefrLevel: CEFRLevel): Session {
    const isGenericTitle =
      session.title === "New Conversation" ||
      session.title.startsWith("New Conversation ");

    if (isGenericTitle && session.messages.length > 0) {
      const newTitle = generateSessionTitleFromMessages(
        session.messages,
        cefrLevel
      );
      return {
        ...session,
        title: newTitle,
        updatedAt: Date.now(),
      };
    }

    return session;
  }

  /**
   * Add message to session
   */
  static addMessage(session: Session, message: Message): Session {
    return {
      ...session,
      messages: [...session.messages, message],
      messageCount: session.messages.length + 1,
      updatedAt: Date.now(),
    };
  }

  /**
   * Replace message in session
   */
  static replaceMessage(
    session: Session,
    messageId: string,
    newMessage: Message
  ): Session {
    return {
      ...session,
      messages: session.messages.map((msg) =>
        msg.id === messageId ? newMessage : msg
      ),
      updatedAt: Date.now(),
    };
  }
}

