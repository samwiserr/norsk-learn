import "server-only";

export type CheckoutSessionInput = {
  tutorId: string | number;
  tutorName?: string;
  rate: number;
  origin: string | null;
};

export interface CheckoutPort {
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ sessionId: string }>;
}
