# Product Requirements Document — Norwegian Language Learning App
**Skill applied:** `product-manager-toolkit`  
**Version:** 1.0 | **Date:** 2026-04-08 | **Status:** Approved

---

## Problem Statement

Language learners lack an affordable, always-available AI tutor that gives real-time CEFR-aligned feedback, live human tutor access, and measurable progress — all in one place.

---

## Success Metrics

| Metric | Target (90-day) |
|---|---|
| DAU / MAU ratio | ≥ 40% |
| Session completion rate | ≥ 70% |
| CEFR level-up rate | ≥ 1 level per 3 months of active use |
| Subscription conversion (free → paid) | ≥ 8% |
| Live tutor booking rate | ≥ 15% of paying users |

---

## RICE Prioritization

| Feature | Reach | Impact | Confidence | Effort | RICE Score | Priority |
|---|---|---|---|---|---|---|
| AI Chat Tutor (text) | 10000 | Massive | High | M | **2000** | P0 |
| Auth (email + Google) | 10000 | High | High | S | **2667** | P0 |
| CEFR Progress bar | 9000 | High | High | S | **2400** | P0 |
| Session history | 8000 | Medium | High | S | **1600** | P0 |
| Database schema & API | 10000 | Massive | High | L | **1000** | P0 |
| Stripe subscriptions | 7000 | Massive | High | M | **1400** | P1 |
| Writing exercises (grammar, vocab) | 7000 | High | High | M | **700** | P1 |
| Progress analytics (charts) | 6000 | Medium | High | M | **600** | P1 |
| Multilingual UI (DeepL) | 5000 | Medium | Medium | M | **375** | P1 |
| Gamification (badges, XP, streaks) | 6000 | Medium | Medium | L | **225** | P2 |
| Tutor marketplace UI | 4000 | High | Medium | L | **300** | P2 |
| Live tutor booking (Stripe Connect) | 3000 | Massive | Medium | XL | **90** | P2 |
| Voice input (STT) | 5000 | High | Medium | L | **375** | P2 |
| Audio output (TTS) | 5000 | Medium | Medium | M | **375** | P2 |
| Push notifications (Firebase) | 4000 | Low | High | S | **640** | P3 |
| Moderation & reporting | 3000 | Medium | High | M | **450** | P3 |
| GDPR (export/delete) | 2000 | Medium | High | S | **800** | P3 |
| Admin dashboard | 2000 | Low | Medium | L | **75** | P3 |
| CI/CD pipeline | 10000 | High | High | S | **2667** | P0 (infra) |

---

## Feature Specifications

### P0 — Must Have (MVP)

#### 1. Authentication & User Management
- Email/password sign-up and sign-in (Firebase Auth)
- Google OAuth sign-in
- Forgot password (email reset link)
- Roles: `learner`, `tutor`, `admin`
- Profile: avatar, display name, selected language, CEFR level
- **Out of scope:** Anonymous login, SAML SSO

#### 2. AI Conversational Tutor (Text)
- Chat interface: AI message bubbles, user input field, typing indicator, scrollable history
- AI powered by Google Gemini (`gemini-2.5-flash-lite`)
- Structured JSON response: `{ summary, fixes, improvedVersion, nextQuestion, hint, progressDelta }`
- CEFR-aligned feedback: grammar, vocabulary, coherence scoring per response
- Session saving: resume past sessions, session list in sidebar
- Exercise modes: free conversation, translation, grammar drills, vocabulary
- **Out of scope:** Voice input (P2), TTS output (P2)

#### 3. CEFR Progress Tracking
- Visual progress bar: A1 → A2 → B1 → B2
- Progress delta per AI response (±points)
- Progress persisted to Firestore per user per language
- Level-up notifications inline in chat

#### 4. Core Database & API
- All entities: users, sessions, messages, progress, exercises, tutors, bookings, subscriptions
- REST API routes for all features (see `API-SPEC.md`)
- Firebase Auth + Firestore as primary backend
- See `DATABASE-SCHEMA.md` for full schema

---

### P1 — Should Have (Launch)

#### 5. Stripe Subscriptions
- Free tier: 10 AI sessions/month
- Pro tier: unlimited AI sessions + exercise library
- Premium tier: Pro + live tutor credits
- Stripe Checkout + Customer Portal
- Webhook: `checkout.session.completed`, `customer.subscription.updated/deleted`

#### 6. Writing Exercises
- Grammar drills: passive voice, articles, verb conjugation, sentence structure
- Vocabulary building: word matching, fill-in-the-blank, context sentences
- Translation exercises: source sentence → target language
- Exercise picker UI with CEFR filter
- Phoneme breakdown component for pronunciation guidance

#### 7. Progress Analytics Page
- Line chart: CEFR score over time
- Bar chart: sessions per week
- Stats: grammar score %, vocabulary score %, fluency score %, total sessions, streak days
- CEFR comparison chart (user vs. typical level-up curve)
- Summary of improvements per session

#### 8. Multilingual UI (DeepL)
- Language selector in settings
- UI strings translated via DeepL API on selection
- Supported interface languages: EN, NO, DE, FR, ES, IT, PT, NL, SV, DA, FI, PL, UK
- Translated content cached in localStorage

---

### P2 — Nice to Have (Post-Launch)

#### 9. Gamification
- XP points per session (based on quality score)
- Badges: "7-day streak", "First B1", "100 sessions", etc.
- Progress milestones with celebratory UI moments
- Speaking fluency score (once voice is live)

#### 10. Live Tutor Marketplace
- Tutor list: avatar, name, languages, rating, hourly price, availability badge
- Tutor detail: bio, certifications, sample lesson, reviews
- Filter by language, price, rating, availability

#### 11. Live Tutor Booking & Payment
- Calendar date/time slot picker
- Stripe Connect one-time payment for session
- Tutor payout via Stripe Connect
- Booking confirmation email (Firebase Extension)
- Post-session rating form (1–5 stars + comment)

#### 12. Voice Input (Speech-to-Text)
- Mic button in chat input
- Record audio → send to Whisper / Google Speech API → text injected into input
- Visual waveform while recording
- Slightly more lenient CEFR grading for phonetic slips

#### 13. Audio Output (Text-to-Speech)
- AI response `nextQuestion` field read aloud via TTS API
- Play/pause button per message
- Speed control (0.75×, 1×, 1.25×)

---

### P3 — Deferred

#### 14. Push Notifications
- Firebase Cloud Messaging
- Triggers: tutor session reminder (−30 min), streak risk (no session in 23h), new AI feedback available

#### 15. Moderation & Reporting
- Report button in chat and live session screens
- Categories: abuse, spam, technical issue
- Confirmation dialog → stored in Firestore `reports` collection

#### 16. GDPR Compliance
- Data export: download all user data as JSON
- Data deletion: delete all Firestore docs + Auth account
- Consent tracking on signup

#### 17. Admin Dashboard (Web)
- User list with search/filter
- Tutor verification queue
- Report review queue
- Basic analytics: total users, sessions today, revenue MRR

---

## Out of Scope (This Version)

- iOS / macOS deployment (Android + Web only)
- Offline mode
- Group sessions
- Content created by users (user-generated lesson plans)

---

## Quarterly Roadmap (Capacity: 2 engineers × 10 weeks)

| Quarter | Focus | Deliverables |
|---|---|---|
| Q1 (Weeks 1–4) | MVP | Auth, AI chat, CEFR progress, DB, CI/CD |
| Q1 (Weeks 5–8) | Launch readiness | Stripe, exercises, analytics, multilingual UI |
| Q2 | Growth | Gamification, tutor marketplace, voice I/O |
| Q3 | Scale | Live tutoring, admin dashboard, GDPR, push notifications |
