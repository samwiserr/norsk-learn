import "server-only";

export type CheckoutSessionInput = {
  tutorId: string | number;
  tutorName?: string;
  rate: number;
  /** Trusted public app origin (never pass the raw Origin header through). */
  appBaseUrl: string;
};

export interface CheckoutPort {
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ sessionId: string }>;
}
