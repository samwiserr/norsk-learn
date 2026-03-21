import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import {
  runPublicPostJson,
  attachPublicHeaders,
  apiErrorResponse,
} from "@/lib/api/publicRoute";
import { openaiRealtimeRequestSchema } from "@/lib/contracts/realtime";
import { openaiRealtimePortAdapter } from "@/src/server/integrations/adapters/openaiRealtimePortAdapter";

const log = createLogger("OpenAIRealtimeAPI");

export async function POST(request: NextRequest) {
  return runPublicPostJson(request, openaiRealtimeRequestSchema, async ({ requestId, data, rateLimitRemaining }) => {
    try {
      const payload = await openaiRealtimePortAdapter.createSession({
        model: data.model,
        modalities: data.modalities,
      });
      const model = data.model || payload?.model || "";
      const clientSecret = payload?.client_secret;
      if (!clientSecret) {
        return attachPublicHeaders(
          NextResponse.json(
            { error: "OpenAI response missing client_secret", detail: payload },
            { status: 502 }
          ),
          requestId
        );
      }

      return attachPublicHeaders(
        NextResponse.json({
          client_secret: clientSecret,
          session_id: payload?.id,
          expires_at: payload?.expires_at,
          model,
          rate_limit: { remaining: rateLimitRemaining },
        }),
        requestId
      );
    } catch (error: unknown) {
      log.error("Realtime session creation failed", error);
      const msg = error instanceof Error ? error.message : String(error);

      if (/key is not configured/i.test(msg)) {
        return apiErrorResponse("OpenAI Realtime API key is not configured.", requestId, {
          code: "CONFIG_ERROR",
          status: 500,
        });
      }

      return apiErrorResponse("Unexpected error creating realtime session", requestId, {
        code: "UPSTREAM_ERROR",
        status: 500,
      });
    }
  });
}
