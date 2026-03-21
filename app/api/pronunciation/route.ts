import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import {
  publicRoutePreflight,
  attachPublicHeaders,
  apiErrorResponse,
} from "@/lib/api/publicRoute";
import { pronunciationProxyPortAdapter } from "@/src/server/integrations/adapters/pronunciationProxyPortAdapter";

const log = createLogger("PronunciationAPI");

export async function POST(req: NextRequest) {
  const pre = await publicRoutePreflight(req);
  if (!pre.ok) return pre.response;
  const { requestId } = pre.ctx;

  const formData = await req.formData();

  try {
    const { status, text, contentType } = await pronunciationProxyPortAdapter.proxyAssess(formData);
    return attachPublicHeaders(
      new NextResponse(text, {
        status,
        headers: { "content-type": contentType || "application/json" },
      }),
      requestId
    );
  } catch (error) {
    log.error("Proxy error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (/PRONUNCIATION_SERVICE_URL is not configured/i.test(msg)) {
      return apiErrorResponse("PRONUNCIATION_SERVICE_URL is not configured", requestId, {
        code: "CONFIG_ERROR",
        status: 503,
      });
    }

    return apiErrorResponse("Failed to connect to pronunciation service", requestId, {
      code: "UPSTREAM_ERROR",
      status: 502,
      retryable: true,
    });
  }
}
