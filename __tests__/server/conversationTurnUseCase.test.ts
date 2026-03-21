/**
 * @jest-environment node
 */
jest.mock("@/lib/logger", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }),
}));

import { runConversationTurn } from "@/src/server/application/conversationTurnUseCase";
import type { TextGenerationPort } from "@/src/server/integrations/ports/textGenerationPort";
import type { ConversationRequest } from "@/lib/contracts/conversation";

const minimalBody: ConversationRequest = {
  userInput: "Hei",
  cefrLevel: "A1",
  currentProgress: 0,
  language: "en",
  conversationHistory: [],
  mode: "writing",
};

describe("runConversationTurn", () => {
  it("returns normalized tutor payload when model returns JSON with nextQuestion", async () => {
    const port: TextGenerationPort = {
      generateText: async () =>
        JSON.stringify({
          nextQuestion: "Hvordan har du det?",
          summary: "Nice greeting",
        }),
      createTextStream: async () => ({
        async *[Symbol.asyncIterator]() {
          yield "{}";
        },
      }),
    };

    const out = await runConversationTurn(port, minimalBody);
    expect(out).toEqual(
      expect.objectContaining({
        nextQuestion: expect.any(String),
      })
    );
  });

  it("throws when model returns empty text", async () => {
    const port: TextGenerationPort = {
      generateText: async () => "",
      createTextStream: async () => ({
        async *[Symbol.asyncIterator]() {
          yield "";
        },
      }),
    };

    await expect(runConversationTurn(port, minimalBody)).rejects.toThrow(/EMPTY_RESPONSE|response/i);
  });
});
