import { NextRequest } from "next/server";
import { conversationRequestSchema } from "@/lib/contracts/conversation";
import {
  publicRoutePreflight,
  readJsonBody,
  parseBodyWithSchema,
  HEADER_REQUEST_ID,
} from "@/lib/api/publicRoute";
import { LanguageCode } from "@/lib/languages";
import { iterateConversationStream } from "@/src/server/application/conversationStreamUseCase";
import { geminiTextGenerationAdapter } from "@/src/server/integrations/adapters/geminiTextGenerationAdapter";

export const dynamic = "force-dynamic";

function sseEvent(data: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest) {
  const pre = await publicRoutePreflight(request, { rateLimitFailOpen: true });
  if (!pre.ok) return pre.response;
  const { requestId } = pre.ctx;

  const raw = await readJsonBody(request, requestId);
  if (!raw.ok) return raw.response;

  const valid = parseBodyWithSchema(requestId, raw.value, conversationRequestSchema);
  if (!valid.ok) return valid.response;

  const languageForErrors: LanguageCode =
    (request.headers.get("x-locale") as LanguageCode) || "en";

  const stream = new ReadableStream({
    async start(controller) {
      for await (const event of iterateConversationStream(
        geminiTextGenerationAdapter,
        valid.data,
        languageForErrors
      )) {
        controller.enqueue(sseEvent(event as unknown as Record<string, unknown>));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      [HEADER_REQUEST_ID]: requestId,
    },
  });
}
