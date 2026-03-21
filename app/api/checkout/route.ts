import { NextRequest } from "next/server";
import { createLogger } from "@/lib/logger";
import { checkoutRequestSchema } from "@/lib/contracts/checkout";
import { ErrorType } from "@/lib/error-handling";
import {
  runPublicPostJson,
  jsonWithRequestId,
  apiErrorResponse,
} from "@/lib/api/publicRoute";
import { stripeCheckoutAdapter } from "@/src/server/integrations/adapters/stripeCheckoutAdapter";

const log = createLogger("CheckoutAPI");

export async function POST(request: NextRequest) {
  return runPublicPostJson(request, checkoutRequestSchema, async ({ requestId, data }) => {
    const origin = request.headers.get("origin");

    try {
      const { sessionId } = await stripeCheckoutAdapter.createCheckoutSession({
        tutorId: data.tutorId,
        tutorName: data.tutorName,
        rate: data.rate,
        origin,
      });
      return jsonWithRequestId({ sessionId }, requestId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/Missing STRIPE_SECRET_KEY/i.test(msg)) {
        return apiErrorResponse(msg, requestId, {
          code: "CONFIG_ERROR",
          status: 500,
          type: ErrorType.API,
        });
      }
      log.error("Stripe Checkout error:", err);
      throw err;
    }
  });
}
