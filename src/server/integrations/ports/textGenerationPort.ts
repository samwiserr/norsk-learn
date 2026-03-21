import "server-only";

/** Port for text LLM calls used by tutor use cases (implementation: Gemini today). */
export interface TextGenerationPort {
  generateText(fullPrompt: string, model?: string): Promise<string>;
  createTextStream(fullPrompt: string, model?: string): Promise<AsyncIterable<string>>;
}
