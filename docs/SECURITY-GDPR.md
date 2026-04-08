# Security & GDPR Compliance
**Skill applied:** `senior-secops`  
**Date:** 2026-04-08

---

## Security Scan Summary

| Category | Status | Notes |
|---|---|---|
| Input sanitization | ✅ Done | `sanitizeUserMessage()` in `lib/sanitize.ts` |
| Auth on all write routes | ✅ Done | Firebase ID token verification middleware |
| SQL injection | ✅ N/A | Drizzle ORM parameterized queries |
| XSS | ✅ Done | `SafeHtml` component uses DOMPurify |
| CSRF | ✅ Done | SameSite=Strict cookies + CORS origin allowlist |
| Stripe webhook sig | ✅ Done | `stripe.webhooks.constructEvent` |
| Rate limiting | ⚠️ TODO | Add Upstash ratelimit middleware |
| Secrets in env | ✅ Done | All secrets via `.env` — not committed |
| Dependency CVEs | ⚠️ TODO | Run `npm audit` — address critical/high |
| RLS policies | ⚠️ TODO | Add Firestore security rules (see below) |
| GDPR data deletion | ⚠️ TODO | Implement `/api/users/me` DELETE handler |

---

## Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Sessions: user can only access their own
    match /sessions/{sessionId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.userId;
    }

    // Messages within sessions
    match /sessions/{sessionId}/messages/{messageId} {
      allow read, write: if request.auth != null
        && request.auth.uid == get(/databases/$(database)/documents/sessions/$(sessionId)).data.userId;
    }

    // Progress: user only
    match /progress/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Tutors: public read, own write
    match /tutors/{tutorId} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == resource.data.userId;
    }

    // Bookings: learner or tutor can read
    match /bookings/{bookingId} {
      allow read: if request.auth != null
        && (request.auth.uid == resource.data.learnerId
            || request.auth.uid == resource.data.tutorId);
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.learnerId;
    }

    // Reports: user can create, admin can read all
    match /reports/{reportId} {
      allow create: if request.auth != null;
      allow read: if request.auth.token.admin == true;
    }

    // Block all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## GDPR Compliance Checklist

### Data Collection
- [ ] Consent checkbox on signup with link to Privacy Policy
- [ ] `consentGivenAt` timestamp stored in user record
- [ ] Only collect: email, name, avatar, language preference, session data

### Data Export (`GET /api/users/me/export`)
```typescript
export async function GET(req: Request) {
  const user = await getAuthUser(req)
  const userData = {
    profile: await db.select().from(users).where(eq(users.id, user.id)),
    sessions: await db.select().from(sessions).where(eq(sessions.userId, user.id)),
    messages: await db.select().from(messages)
      .innerJoin(sessions, eq(messages.sessionId, sessions.id))
      .where(eq(sessions.userId, user.id)),
    progress: await db.select().from(progress).where(eq(progress.userId, user.id)),
  }
  return new Response(JSON.stringify(userData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="my-data-${Date.now()}.json"`,
    }
  })
}
```

### Data Deletion (`DELETE /api/users/me`)
```typescript
export async function DELETE(req: Request) {
  const user = await getAuthUser(req)

  // Delete in dependency order
  await db.delete(messages)
    .where(inArray(messages.sessionId,
      db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, user.id))
    ))
  await db.delete(exerciseAttempts)
    .where(inArray(exerciseAttempts.sessionId,
      db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, user.id))
    ))
  await db.delete(sessions).where(eq(sessions.userId, user.id))
  await db.delete(progress).where(eq(progress.userId, user.id))
  await db.delete(subscriptions).where(eq(subscriptions.userId, user.id))
  await db.delete(users).where(eq(users.id, user.id))

  // Delete Firebase Auth account
  await adminAuth.deleteUser(user.id)

  return NextResponse.json({ deleted: true })
}
```

### Data Retention
- Session messages: retained indefinitely (user can delete)
- Analytics events (GA4): 14-month retention (GA4 default)
- Stripe billing records: 7 years (legal requirement — not deletable)

---

## Remediation Priorities

| Priority | Item | Action |
|---|---|---|
| 🔴 High | Rate limiting on `/api/conversation` | Add Upstash middleware |
| 🔴 High | Firestore rules deployment | Deploy rules before launch |
| 🟡 Medium | Dependency audit | `npm audit --fix` weekly in CI |
| 🟡 Medium | GDPR delete handler | Implement before EU users onboard |
| 🟢 Low | Admin role enforcement | Add `role: admin` check to admin routes |
| 🟢 Low | Security headers | Add CSP, HSTS via `next.config.js` |

---

## Security Headers (`next.config.js`)

```javascript
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-eval' https://js.stripe.com; frame-src https://js.stripe.com" },
]
```
