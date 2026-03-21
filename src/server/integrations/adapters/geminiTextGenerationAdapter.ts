import "server-only";

import { createGeminiTextStream, generateGeminiText } from "@/lib/integrations/gemini/geminiAdapter";
import type { TextGenerationPort } from "@/src/server/integrations/ports/textGenerationPort";

export const geminiTextGenerationAdapter: TextGenerationPort = {
  generateText: (fullPrompt, model) => generateGeminiText(fullPrompt, model),
  createTextStream: (fullPrompt, model) => createGeminiTextStream(fullPrompt, model),
};
