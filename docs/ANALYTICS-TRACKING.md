# Analytics & Tracking Plan
**Skill applied:** `analytics-tracking`  
**Platform:** GA4 + custom Firestore analytics  
**Date:** 2026-04-08

---

## Event Taxonomy

### Auth Events

| Event | Trigger | Parameters |
|---|---|---|
| `sign_up` | New user registers | `{ method: "email" \| "google" }` |
| `login` | User signs in | `{ method: "email" \| "google" }` |
| `logout` | User signs out | — |

### Session Events

| Event | Trigger | Parameters |
|---|---|---|
| `session_start` | New AI session created | `{ language, exercise_mode, cefr_level }` |
| `session_message_sent` | User sends message | `{ session_id, message_length, exercise_mode }` |
| `session_end` | Session ended | `{ session_id, message_count, duration_seconds, progress_delta }` |
| `session_resumed` | User resumes past session | `{ session_id }` |

### Progress Events

| Event | Trigger | Parameters |
|---|---|---|
| `cefr_level_up` | User crosses level threshold | `{ from_level, to_level, language }` |
| `streak_milestone` | User hits 7/30/100 day streak | `{ streak_days }` |
| `xp_earned` | XP awarded post-session | `{ amount, total_xp }` |
| `badge_earned` | Badge unlocked | `{ badge_id, badge_name }` |

### Exercise Events

| Event | Trigger | Parameters |
|---|---|---|
| `exercise_started` | Exercise mode selected | `{ mode, cefr_level }` |
| `exercise_completed` | Exercise attempt submitted | `{ mode, correct, cefr_level }` |
| `exercise_accuracy` | Calculated per session | `{ mode, accuracy_pct }` |

### Tutor & Booking Events

| Event | Trigger | Parameters |
|---|---|---|
| `tutor_list_viewed` | User opens tutor marketplace | `{ filter_language, filter_price }` |
| `tutor_profile_viewed` | User clicks tutor card | `{ tutor_id }` |
| `booking_initiated` | User clicks "Book" | `{ tutor_id, slot_datetime }` |
| `booking_completed` | Payment successful | `{ tutor_id, amount, booking_id }` |
| `booking_cancelled` | User cancels | `{ booking_id, reason }` |
| `review_submitted` | Post-session review | `{ booking_id, rating }` |

### Subscription Events

| Event | Trigger | Parameters |
|---|---|---|
| `subscription_started` | Checkout completed | `{ plan: "pro" \| "premium", trial: boolean }` |
| `subscription_cancelled` | User cancels via portal | `{ plan, days_active }` |
| `subscription_upgraded` | Free → Pro → Premium | `{ from_plan, to_plan }` |
| `paywall_hit` | User hits free tier limit | `{ feature, cefr_level }` |

---

## GA4 Implementation

```typescript
// lib/analytics.ts
declare const gtag: Function

export const trackEvent = (name: string, params: Record<string, string | number | boolean>) => {
  if (typeof gtag !== "undefined") {
    gtag("event", name, params)
  }
}

// Usage in components:
// trackEvent("session_start", { language: "no", exercise_mode: "free_conversation", cefr_level: "A2" })
```

---

## Progress Dashboard Data Endpoints

```typescript
// GET /api/progress/history → time-series for line chart
// Returns: [{ date: "2026-01-01", score: 312, cefrLevel: "A2" }, ...]

// GET /api/progress/stats → aggregate stats
// Returns: {
//   totalSessions: 42,
//   streakDays: 7,
//   grammarAccuracy: 78,    // % correct grammar exercises
//   vocabAccuracy: 85,      // % correct vocab exercises
//   avgProgressPerSession: 8.3,
//   weeklySessionCount: [3, 5, 2, 6, 4, 7, 5],  // last 7 days
// }
```

---

## Gamification Metrics

| Metric | Formula | Display |
|---|---|---|
| XP | `progressDelta * 10` per session | Total XP on profile |
| Streak | Consecutive days with ≥ 1 session | Fire icon + count |
| Grammar score | `(correct_grammar / total_grammar) * 100` | % in analytics |
| Vocab score | `(correct_vocab / total_vocab) * 100` | % in analytics |
| Fluency score | AI-assigned per session (P2, requires voice) | % in analytics |

---

## Badges

| Badge ID | Name | Trigger |
|---|---|---|
| `first_session` | First Step | Complete first AI session |
| `streak_7` | Week Warrior | 7-day streak |
| `streak_30` | Monthly Master | 30-day streak |
| `level_a2` | A2 Achiever | Reach A2 level |
| `level_b1` | B1 Breakthrough | Reach B1 level |
| `level_b2` | B2 Boss | Reach B2 level |
| `sessions_10` | Getting Started | Complete 10 sessions |
| `sessions_100` | Century Club | Complete 100 sessions |
| `first_booking` | Human Touch | Complete first live tutor session |

---

## Tracking Checklist

- [ ] GA4 property created and `NEXT_PUBLIC_GA4_ID` set in env
- [ ] `trackEvent` wrapper imported in all relevant components
- [ ] `session_start` / `session_end` fired in chat route handlers
- [ ] `cefr_level_up` fired in `updateProgress` function
- [ ] `paywall_hit` fired when free user hits 10-session limit
- [ ] Subscription events fired in Stripe webhook handler
- [ ] Progress dashboard endpoints return data matching chart component props
