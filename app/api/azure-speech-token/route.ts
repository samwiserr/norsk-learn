import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import {
  runPublicGet,
  attachPublicHeaders,
  apiErrorResponse,
} from "@/lib/api/publicRoute";
import { azureSpeechTokenAdapter } from "@/src/server/integrations/adapters/azureSpeechTokenAdapter";

const log = createLogger("AzureSpeechAPI");

const DEFAULT_TTL_SECONDS = 600;

export async function GET(request: NextRequest) {
  return runPublicGet(request, async ({ requestId, rateLimitRemaining }) => {
    try {
      const { token, region, expires_in } = await azureSpeechTokenAdapter.mintToken();
      return attachPublicHeaders(
        NextResponse.json({
          token,
          region,
          expires_in: expires_in ?? DEFAULT_TTL_SECONDS,
          rate_limit: { remaining: rateLimitRemaining },
        }),
        requestId
      );
    } catch (error) {
      log.error("Token minting failed", error);
      const msg = error instanceof Error ? error.message : String(error);

      if (/key\/region not configured/i.test(msg)) {
        return apiErrorResponse("Azure Speech key/region not configured.", requestId, {
          code: "CONFIG_ERROR",
          status: 500,
        });
      }

      return apiErrorResponse("Unexpected error minting Azure Speech token", requestId, {
        code: "UPSTREAM_ERROR",
        status: 500,
      });
    }
  });
}
