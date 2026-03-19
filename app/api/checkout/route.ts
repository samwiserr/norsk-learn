import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createLogger } from "@/lib/logger";

const log = createLogger("CheckoutAPI");

export async function POST(request: NextRequest) {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return NextResponse.json(
                { error: "Stripe connection not configured (Missing STRIPE_SECRET_KEY)" },
                { status: 500 }
            );
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: "2024-06-20",
        } as any);

        const { tutorId, tutorName, rate } = await request.json();

        if (!tutorId || !rate) {
            return NextResponse.json({ error: "Missing required booking details" }, { status: 400 });
        }

        // Create a Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd", // Checking out in USD for global compatibility
                        product_data: {
                            name: `1-Hour Session with ${tutorName}`,
                            description: `Private Norwegian tutoring session via Norsk Tutor.`,
                        },
                        unit_amount: Math.round(rate * 100), // convert to cents
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${request.headers.get("origin")}/tutors?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${request.headers.get("origin")}/tutors?canceled=true`,
            metadata: {
                tutorId: tutorId.toString(),
            },
        });

        return NextResponse.json({ sessionId: session.id });
    } catch (err: any) {
        log.error("Stripe Checkout error:", err);
        return NextResponse.json(
            { error: err.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
