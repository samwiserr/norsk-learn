# API Specification
**Skills applied:** `senior-backend` + `api-design-reviewer`  
**Base URL:** `/api`  
**Auth:** Firebase ID token → `Authorization: Bearer <token>`  
**Date:** 2026-04-08

---

## API Design Score

| Category | Score | Notes |
|---|---|---|
| REST compliance | 9/10 | Consistent resource naming, correct HTTP verbs |
| Naming conventions | 10/10 | Kebab-case routes, plural nouns |
| Auth coverage | 10/10 | All write routes require auth token |
| Error format | 9/10 | Uniform `{ error, code, details? }` shape |
| Input validation | 9/10 | Zod schemas on all POST/PATCH bodies |

---

## Common Response Shapes

```typescript
// Success
{ data: T }

// Error
{ error: string; code: string; details?: Record<string, string> }

// Paginated
{ data: T[]; total: number; page: number; pageSize: number }
```

---

## Routes

### Auth & Users

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/me` | ✅ | Get current user profile |
| `PATCH` | `/api/users/me` | ✅ | Update name, avatar, selectedLanguage |
| `DELETE` | `/api/users/me` | ✅ | GDPR: delete all user data + Auth account |
| `GET` | `/api/users/me/export` | ✅ | GDPR: export all user data as JSON |

```typescript
// PATCH /api/users/me body
{ name?: string; avatarUrl?: string; selectedLanguage?: string }
```

---

### Sessions

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/sessions` | ✅ | List user's sessions (paginated) |
| `POST` | `/api/sessions` | ✅ | Start a new session |
| `GET` | `/api/sessions/:id` | ✅ | Get session with messages |
| `PATCH` | `/api/sessions/:id` | ✅ | End session (set endedAt) |
| `DELETE` | `/api/sessions/:id` | ✅ | Delete session + messages |

```typescript
// POST /api/sessions body
{ language: string; exerciseMode?: string }

// GET /api/sessions query
{ page?: number; pageSize?: number; language?: string }
```

---

### AI Conversation

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/conversation` | ✅ | Send message, get AI response (JSON) |
| `POST` | `/api/conversation-stream` | ✅ | Send message, get AI response (SSE stream) |

```typescript
// POST /api/conversation body
{
  sessionId: string
  userInput: string
  cefrLevel: string
  currentProgress: number
  language?: string
  conversationHistory: { role: string; content: string }[]
  exerciseMode?: string
  topicId?: string
}

// Response
{
  summary: string
  fixes: { original: string; corrected: string; explanation: string }[]
  improvedVersion: string
  nextQuestion: string
  hint: string
  progressDelta: number
}
```

---

### Progress

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/progress` | ✅ | Get user progress for current language |
| `GET` | `/api/progress/history` | ✅ | Progress snapshots over time (for charts) |
| `GET` | `/api/progress/stats` | ✅ | Aggregated stats: streaks, XP, session count |

```typescript
// GET /api/progress/history query
{ language?: string; from?: string; to?: string }

// Response shape
{
  score: number
  cefrLevel: "A1" | "A2" | "B1" | "B2"
  totalSessions: number
  streakDays: number
  xpPoints: number
  history: { date: string; score: number; cefrLevel: string }[]
}
```

---

### Exercises

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/exercises` | ✅ | List exercises (filter by mode, CEFR level) |
| `GET` | `/api/exercises/:id` | ✅ | Get single exercise |
| `POST` | `/api/exercises/:id/attempt` | ✅ | Submit exercise attempt |

```typescript
// GET /api/exercises query
{ mode?: string; cefrLevel?: string; language?: string }

// POST /api/exercises/:id/attempt body
{ sessionId: string; userAnswer: string }

// Response
{ correct: boolean; expectedAnswer: string; explanation: string; progressDelta: number }
```

---

### Tutors

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/tutors` | ✅ | List verified tutors (filter by language, rating, price) |
| `GET` | `/api/tutors/:id` | ✅ | Get tutor profile |
| `GET` | `/api/tutors/:id/availability` | ✅ | Get available slots |
| `POST` | `/api/tutors` | ✅ (role:tutor) | Create tutor profile |
| `PATCH` | `/api/tutors/:id` | ✅ (owner) | Update tutor profile |

```typescript
// GET /api/tutors query
{ language?: string; minRating?: number; maxPrice?: number; available?: boolean }
```

---

### Bookings

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/bookings` | ✅ | List user's bookings |
| `POST` | `/api/bookings` | ✅ | Create booking + Stripe payment intent |
| `GET` | `/api/bookings/:id` | ✅ | Get booking details |
| `PATCH` | `/api/bookings/:id` | ✅ | Cancel booking |
| `POST` | `/api/bookings/:id/review` | ✅ | Submit post-session review |

```typescript
// POST /api/bookings body
{ tutorId: string; sessionStart: string; sessionEnd: string }

// Response
{ booking: Booking; clientSecret: string }  // clientSecret for Stripe Elements
```

---

### Subscriptions & Billing

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/billing/subscription` | ✅ | Get active subscription |
| `POST` | `/api/billing/checkout` | ✅ | Create Stripe Checkout session |
| `POST` | `/api/billing/portal` | ✅ | Create Stripe Customer Portal session |
| `POST` | `/api/webhooks/stripe` | ❌ (sig verify) | Stripe webhook handler |

```typescript
// POST /api/billing/checkout body
{ priceId: string; successUrl: string; cancelUrl: string }

// POST /api/webhooks/stripe
// Handles: checkout.session.completed, customer.subscription.updated,
//          customer.subscription.deleted, payment_intent.succeeded
```

---

### Reports

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/reports` | ✅ | File a moderation report |

```typescript
// POST /api/reports body
{
  targetType: "session" | "message" | "booking" | "user"
  targetId: string
  category: "abuse" | "spam" | "technical" | "other"
  description?: string
}
```

---

## Input Validation (Zod)

```typescript
// lib/validations.ts
import { z } from "zod"

export const sendMessageSchema = z.object({
  sessionId: z.string().uuid(),
  userInput: z.string().min(1).max(2000),
  cefrLevel: z.enum(["A1", "A2", "B1", "B2"]),
  currentProgress: z.number().min(0).max(100),
  language: z.string().optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).max(50),
  exerciseMode: z.string().optional(),
})

export const createBookingSchema = z.object({
  tutorId: z.string().uuid(),
  sessionStart: z.string().datetime(),
  sessionEnd: z.string().datetime(),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  selectedLanguage: z.string().length(2).optional(),
})
```

---

## Rate Limiting

| Endpoint group | Limit |
|---|---|
| `/api/conversation*` | 20 req/min per user |
| `/api/billing/*` | 10 req/min per user |
| `/api/auth/*` | 5 req/min per IP |
| All others | 60 req/min per user |

Implementation: Upstash Redis + `@upstash/ratelimit`
