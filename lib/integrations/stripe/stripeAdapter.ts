import "server-only";

import Stripe from "stripe";
import { createLogger } from "@/lib/logger";
import { config } from "@/lib/config";

const log = createLogger("StripeAdapter");

export type CreateStripeCheckoutSessionArgs = {
  tutorId: string | number;
  tutorName?: string;
  rate: number;
  origin: string | null;
};

/**
 * Provider-specific: create Stripe Checkout session for a tutoring booking.
 */
export async function createStripeCheckoutSession(
  args: CreateStripeCheckoutSessionArgs
): Promise<{ sessionId: string }> {
  const secretKey = config.stripe.secretKey;
  if (!secretKey) {
    throw new Error("Stripe connection not configured (Missing STRIPE_SECRET_KEY)");
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
  } as unknown as ConstructorParameters<typeof Stripe>[1]);

  const { tutorId, tutorName, rate, origin } = args;
  if (!origin) {
    throw new Error("Missing request origin for Stripe success/cancel URLs");
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `1-Hour Session with ${tutorName ?? "Tutor"}`,
            description: `Private Norwegian tutoring session via Norsk Tutor.`,
          },
          unit_amount: Math.round(rate * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${origin}/tutors?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/tutors?canceled=true`,
    metadata: {
      tutorId: String(tutorId),
    },
  });

  log.debug("Stripe checkout session created", { sessionId: session.id });
  return { sessionId: session.id };
}

