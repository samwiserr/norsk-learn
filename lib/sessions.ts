import { CEFRLevel } from "./cefr";
import { randomHexBytes } from "./secureRandom";

export type Role = "user" | "assistant" | "assistant-streaming";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  cefrLevel: CEFRLevel;
  messages: Message[];
  completedTasks: number;
  progress: number;
  srsReviewList: string[];
  userId?: string;
  exerciseMode?: string;
  topicId?: string;
}

export const createSessionId = () =>
  `session_${Date.now()}_${randomHexBytes(6)}`;

export const createNewSession = (
  level: CEFRLevel,
  initialProgress = 0,
): Session => {
  const now = Date.now();
  return {
    id: createSessionId(),
    title: "New Conversation",
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    cefrLevel: level,
    messages: [],
    completedTasks: 0,
    progress: initialProgress,
    srsReviewList: [],
  };
};

export const validateSession = (session: unknown): session is Session => {
  if (!session || typeof session !== "object") return false;
  const obj = session as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.createdAt === "number" &&
    typeof obj.updatedAt === "number" &&
    typeof obj.cefrLevel === "string" &&
    Array.isArray(obj.messages)
  );
};

export const generateSessionTitle = (content: string, cefrLevel?: CEFRLevel) => {
  if (!content) return "New Conversation";
  
  // Extract first few words as summary (max 5-6 words)
  const words = content.trim().split(/\s+/);
  const summary = words.slice(0, 6).join(" ");
  const trimmedSummary = summary.length > 40 ? `${summary.slice(0, 40)}…` : summary;
  
  // Include CEFR level if provided
  if (cefrLevel) {
    return `${cefrLevel}: ${trimmedSummary}`;
  }
  
  return trimmedSummary.length > 48 ? `${trimmedSummary.slice(0, 48)}…` : trimmedSummary;
};

export const generateSessionTitleFromMessages = (
  messages: Message[],
  cefrLevel?: CEFRLevel
): string => {
  if (messages.length === 0) return "New Conversation";
  
  // Find the most recent assistant message with substantial content
  const assistantMessages = messages
    .filter((msg) => msg.role === "assistant" && msg.content.trim().length > 20)
    .reverse();
  
  if (assistantMessages.length === 0) {
    // Fallback to first user message
    const firstUserMessage = messages.find((msg) => msg.role === "user");
    if (firstUserMessage) {
      return generateSessionTitle(firstUserMessage.content, cefrLevel);
    }
    return "New Conversation";
  }
  
  // Use the most recent assistant message to generate title
  const latestAssistantMessage = assistantMessages[0];
  if (!latestAssistantMessage) return "New Conversation";
  const content = latestAssistantMessage.content;
  
  // Clean up the content - remove common prefixes/patterns
  let cleanedContent = content
    .replace(/^(Praise|Good|Great|Excellent|Perfect)[!.:\s]*/i, "")
    .replace(/^(Here|Now|Next|Your task)[!.:\s]*/i, "")
    .replace(/\*\*[^*]+\*\*/g, "") // Remove bold markdown
    .replace(/#{1,6}\s/g, "") // Remove markdown headers
    .replace(/\n+/g, " ") // Replace newlines with spaces
    .trim();
  
  // Extract meaningful words (exclude common words)
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "should", "could", "may", "might", "must", "can", "this",
    "that", "these", "those", "i", "you", "he", "she", "it", "we", "they",
    "me", "him", "her", "us", "them", "your", "his", "her", "its", "our", "their"
  ]);
  
  const words = cleanedContent
    .split(/\s+/)
    .filter((word) => {
      const lower = word.toLowerCase().replace(/[^\w]/g, "");
      return lower.length > 2 && !stopWords.has(lower);
    })
    .slice(0, 6); // Take first 6 meaningful words
  
  if (words.length === 0) {
    // Fallback to first few words of the content
    const fallbackWords = cleanedContent.split(/\s+/).slice(0, 5);
    const summary = fallbackWords.join(" ");
    const trimmedSummary = summary.length > 40 ? `${summary.slice(0, 40)}…` : summary;
    return cefrLevel ? `${cefrLevel}: ${trimmedSummary}` : trimmedSummary;
  }
  
  const summary = words.join(" ");
  const trimmedSummary = summary.length > 45 ? `${summary.slice(0, 45)}…` : summary;
  
  // Include CEFR level if provided
  if (cefrLevel) {
    return `${cefrLevel}: ${trimmedSummary}`;
  }
  
  return trimmedSummary.length > 48 ? `${trimmedSummary.slice(0, 48)}…` : trimmedSummary;
};

