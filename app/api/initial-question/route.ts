import { NextRequest } from "next/server";
import { initialQuestionRequestSchema } from "@/lib/contracts/initial-question";
import { runPublicPostJson, jsonWithRequestId } from "@/lib/api/publicRoute";
import { runInitialQuestion } from "@/src/server/application/initialQuestionUseCase";
import { geminiTextGenerationAdapter } from "@/src/server/integrations/adapters/geminiTextGenerationAdapter";

export async function POST(request: NextRequest) {
  return runPublicPostJson(request, initialQuestionRequestSchema, async ({ requestId, data }) => {
    const result = await runInitialQuestion(geminiTextGenerationAdapter, data);
    return jsonWithRequestId(result, requestId);
  });
}
