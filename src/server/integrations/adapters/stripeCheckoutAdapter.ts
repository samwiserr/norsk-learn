import "server-only";

import { createStripeCheckoutSession } from "@/lib/integrations/stripe/stripeAdapter";
import type { CheckoutPort } from "@/src/server/integrations/ports/checkoutPort";

export const stripeCheckoutAdapter: CheckoutPort = {
  async createCheckoutSession(input) {
    const { sessionId } = await createStripeCheckoutSession({
      tutorId: input.tutorId,
      tutorName: input.tutorName,
      rate: input.rate,
      origin: input.origin,
    });
    return { sessionId };
  },
};
