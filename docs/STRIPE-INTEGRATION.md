# Stripe Integration Guide
**Skill applied:** `stripe-integration-expert`  
**Date:** 2026-04-08

---

## Subscription Plans

| Plan | Price ID | Features |
|---|---|---|
| Free | — | 10 AI sessions/month |
| Pro | `STRIPE_PRO_PRICE_ID` | Unlimited AI sessions + full exercise library |
| Premium | `STRIPE_PREMIUM_PRICE_ID` | Pro + 4 live tutor credits/month |

---

## Environment Variables

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_CONNECT_CLIENT_ID=ca_...  # For tutor payouts
```

---

## Stripe Client Singleton

```typescript
// lib/stripe.ts
import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
})
```

---

## Subscription Lifecycle Routes

### Checkout (`app/api/billing/checkout/route.ts`)

```typescript
import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { priceId, successUrl, cancelUrl } = await req.json()

  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name ?? undefined })
    customerId = customer.id
    await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id))
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: { trial_period_days: 14 },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
```

### Customer Portal (`app/api/billing/portal/route.ts`)

```typescript
export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user?.stripeCustomerId) return NextResponse.json({ error: "No billing account" }, { status: 400 })

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  })

  return NextResponse.json({ url: session.url })
}
```

---

## Webhook Handler (`app/api/webhooks/stripe/route.ts`)

```typescript
import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/db"
import { subscriptions, users } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== "subscription") break

      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      const planName = getPlanFromPriceId(sub.items.data[0].price.id)

      await db.insert(subscriptions).values({
        userId: await getUserIdByCustomer(session.customer as string),
        stripeSubscriptionId: sub.id,
        stripePriceId: sub.items.data[0].price.id,
        status: sub.status,
        planName,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      }).onConflictDoUpdate({
        target: subscriptions.userId,
        set: { stripeSubscriptionId: sub.id, status: sub.status, planName, currentPeriodEnd: new Date(sub.current_period_end * 1000) },
      })
      break
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status
      const planName = status === "canceled" ? "free" : getPlanFromPriceId(sub.items.data[0].price.id)

      await db.update(subscriptions)
        .set({ status, planName, currentPeriodEnd: new Date(sub.current_period_end * 1000), updatedAt: new Date() })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id))
      break
    }

    case "payment_intent.succeeded": {
      // For one-time tutor bookings — update booking status
      const pi = event.data.object as Stripe.PaymentIntent
      const bookingId = pi.metadata.bookingId
      if (bookingId) {
        await db.update(bookings).set({ status: "confirmed", amountPaid: String(pi.amount / 100) })
          .where(eq(bookings.stripePaymentIntentId, pi.id))
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}

function getPlanFromPriceId(priceId: string): "free" | "pro" | "premium" {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro"
  if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) return "premium"
  return "free"
}

async function getUserIdByCustomer(customerId: string): Promise<string> {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.stripeCustomerId, customerId))
  return user.id
}
```

---

## Stripe Connect (Tutor Payouts)

```typescript
// app/api/tutors/connect/route.ts — Onboard a new tutor
export async function POST(req: Request) {
  const user = await getAuthUser(req)
  const account = await stripe.accounts.create({
    type: "express",
    email: user.email,
    capabilities: { transfers: { requested: true } },
  })

  await db.update(tutors).set({ stripeAccountId: account.id }).where(eq(tutors.userId, user.id))

  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/tutors/onboard`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/tutors/dashboard`,
    type: "account_onboarding",
  })

  return NextResponse.json({ url: link.url })
}

// After booking completion — transfer to tutor
async function payoutTutor(bookingId: string, tutorStripeAccountId: string, amountCents: number) {
  const platformFee = Math.round(amountCents * 0.15)  // 15% platform cut
  await stripe.transfers.create({
    amount: amountCents - platformFee,
    currency: "usd",
    destination: tutorStripeAccountId,
    transfer_group: bookingId,
  })
}
```

---

## Test Cards

| Scenario | Card Number |
|---|---|
| Successful payment | `4242 4242 4242 4242` |
| Authentication required | `4000 0025 0000 3155` |
| Declined | `4000 0000 0000 9995` |

---

## Local Testing

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```

---

## Subscription Gate (Middleware)

```typescript
// lib/subscription.ts
export async function requirePro(userId: string) {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId))
  if (!sub || sub.planName === "free" || sub.status !== "active") {
    throw new Error("PRO_REQUIRED")
  }
}
```
