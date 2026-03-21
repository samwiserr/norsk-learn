import {
  conversationRequestSchema,
  tutorConversationResponseSchema,
} from "@/lib/contracts/conversation";
import { initialQuestionResponseSchema } from "@/lib/contracts/initial-question";

describe("lib/contracts/conversation", () => {
  it("parses a valid conversation request", () => {
    const parsed = conversationRequestSchema.safeParse({
      userInput: "Hei",
      cefrLevel: "A1",
      currentProgress: 10,
      language: "en",
      conversationHistory: [
        { id: "1", role: "user", content: "Hei", timestamp: 1 },
      ],
      exerciseMode: "free_conversation",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid CEFR in conversation request", () => {
    const parsed = conversationRequestSchema.safeParse({
      userInput: "Hei",
      cefrLevel: "C2",
      currentProgress: 0,
      language: "en",
      conversationHistory: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("allows empty userInput when turnType is exercise_start", () => {
    const parsed = conversationRequestSchema.safeParse({
      userInput: "",
      cefrLevel: "A1",
      currentProgress: 0,
      language: "en",
      conversationHistory: [],
      exerciseMode: "translation",
      turnType: "exercise_start",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty userInput for conversation turn", () => {
    const parsed = conversationRequestSchema.safeParse({
      userInput: "   ",
      cefrLevel: "A1",
      currentProgress: 0,
      language: "en",
      conversationHistory: [],
      turnType: "conversation",
    });
    expect(parsed.success).toBe(false);
  });

  it("parses tutor response matching API TutorResponse shape", () => {
    const parsed = tutorConversationResponseSchema.safeParse({
      uiLanguage: "en",
      cefrLevel: "A1",
      userInput: "Hei",
      summary: "Nice",
      fixes: [],
      nextQuestion: "Hvordan har du det?",
      progressDelta: 1,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects tutor response without nextQuestion", () => {
    const parsed = tutorConversationResponseSchema.safeParse({
      summary: "x",
      fixes: [],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("lib/contracts/initial-question", () => {
  it("parses initial question success body", () => {
    const parsed = initialQuestionResponseSchema.safeParse({
      welcomeMessage: "Velkommen!",
      firstQuestion: "Hva heter du?",
    });
    expect(parsed.success).toBe(true);
  });
});
