import { NextRequest } from "next/server";
import { conversationRequestSchema } from "@/lib/contracts/conversation";
import { runPublicPostJson, jsonWithRequestId } from "@/lib/api/publicRoute";
import { runConversationTurn } from "@/src/server/application/conversationTurnUseCase";
import { geminiTextGenerationAdapter } from "@/src/server/integrations/adapters/geminiTextGenerationAdapter";

export async function POST(request: NextRequest) {
  return runPublicPostJson(request, conversationRequestSchema, async ({ requestId, data }) => {
    const result = await runConversationTurn(geminiTextGenerationAdapter, data);
    return jsonWithRequestId(result, requestId);
  });
}
