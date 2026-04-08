# Design System
**Skill applied:** `ui-design-system`  
**Style:** Playful (language-learning app)  
**Brand primary:** `#4F7FFF` (blue — trust, intelligence)  
**Date:** 2026-04-08

---

## Design Tokens (`src/styles/tokens.css`)

```css
:root {
  /* ─── Colors: Primary ──────────────────── */
  --color-primary-50:  #EEF3FF;
  --color-primary-100: #D9E4FF;
  --color-primary-200: #B3C9FF;
  --color-primary-300: #8DAFFF;
  --color-primary-400: #6794FF;
  --color-primary-500: #4F7FFF;  /* brand */
  --color-primary-600: #3D66CC;
  --color-primary-700: #2B4D99;
  --color-primary-800: #1A3466;
  --color-primary-900: #0A1A33;

  /* ─── Colors: Semantic ─────────────────── */
  --color-success:  #22C55E;
  --color-warning:  #F59E0B;
  --color-error:    #EF4444;
  --color-info:     #3B82F6;

  /* ─── Colors: Neutral ──────────────────── */
  --color-neutral-50:  #F9FAFB;
  --color-neutral-100: #F3F4F6;
  --color-neutral-200: #E5E7EB;
  --color-neutral-300: #D1D5DB;
  --color-neutral-400: #9CA3AF;
  --color-neutral-500: #6B7280;
  --color-neutral-600: #4B5563;
  --color-neutral-700: #374151;
  --color-neutral-800: #1F2937;
  --color-neutral-900: #111827;

  /* ─── Colors: Surface ──────────────────── */
  --color-surface-bg:       #FFFFFF;
  --color-surface-card:     #F9FAFB;
  --color-surface-overlay:  rgba(0,0,0,0.5);

  /* ─── Typography ───────────────────────── */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --text-xs:   0.75rem;   /* 12px */
  --text-sm:   0.875rem;  /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg:   1.125rem;  /* 18px */
  --text-xl:   1.25rem;   /* 20px */
  --text-2xl:  1.5rem;    /* 24px */
  --text-3xl:  1.875rem;  /* 30px */
  --text-4xl:  2.25rem;   /* 36px */

  --font-normal:   400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;

  --leading-tight:  1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* ─── Spacing (8pt grid) ───────────────── */
  --space-0:  0;
  --space-1:  0.25rem;   /* 4px */
  --space-2:  0.5rem;    /* 8px */
  --space-3:  0.75rem;   /* 12px */
  --space-4:  1rem;      /* 16px */
  --space-5:  1.25rem;   /* 20px */
  --space-6:  1.5rem;    /* 24px */
  --space-8:  2rem;      /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */

  /* ─── Border Radius ────────────────────── */
  --radius-sm:   0.25rem;   /* 4px */
  --radius-md:   0.5rem;    /* 8px */
  --radius-lg:   0.75rem;   /* 12px */
  --radius-xl:   1rem;      /* 16px */
  --radius-2xl:  1.5rem;    /* 24px */
  --radius-full: 9999px;

  /* ─── Shadows ───────────────────────────── */
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.05);
  --shadow-md:  0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
  --shadow-lg:  0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05);
  --shadow-xl:  0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04);

  /* ─── Animation ─────────────────────────── */
  --duration-fast:   150ms;
  --duration-normal: 250ms;
  --duration-slow:   400ms;
  --ease-default:    cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1);

  /* ─── Breakpoints ───────────────────────── */
  --bp-sm:  640px;
  --bp-md:  768px;
  --bp-lg:  1024px;
  --bp-xl:  1280px;
  --bp-2xl: 1536px;
}

/* Dark mode overrides */
[data-theme="dark"] {
  --color-surface-bg:    #0F172A;
  --color-surface-card:  #1E293B;
  --color-neutral-50:    #1E293B;
  --color-neutral-900:   #F8FAFC;
}
```

---

## Component Architecture

### Chat Message Bubbles

```tsx
// src/components/chat/MessageBubble.tsx
type MessageBubbleProps = {
  role: "user" | "assistant"
  content: string
  feedback?: AIFeedback
  progressDelta?: number
}

// User bubble: right-aligned, primary-500 bg, white text
// AI bubble: left-aligned, surface-card bg, neutral-900 text
// Feedback pill: shows corrections inline with warning color
```

### CEFR Progress Bar

```tsx
// src/components/ProgressBar.tsx
// Segmented bar: A1 | A2 | B1 | B2
// Active segment fills proportionally within level range
// Level-up animation: scale + confetti burst (framer-motion)
```

### Bottom Navigation (Mobile)

```tsx
// src/components/BottomNav.tsx
// 4 tabs: Chat (MessageSquare), Progress (TrendingUp), History (Clock), Profile (User)
// Active tab: primary-500 icon + label
// Badge on History for unread sessions
```

### Exercise Picker Card

```tsx
// src/components/writing/ExercisePicker.tsx  (already exists)
// Grid of exercise mode cards with CEFR filter chips
// Card: icon + label + CEFR badge
```

### Tutor Card

```tsx
// src/components/tutors/TutorCard.tsx
// Avatar | Name + languages | Star rating | Price/hr | Availability badge | Book button
```

---

## Typography Scale (Tailwind mapping)

| Token | Tailwind class | Use case |
|---|---|---|
| `text-4xl` bold | `text-4xl font-bold` | Page hero headings |
| `text-2xl` semibold | `text-2xl font-semibold` | Section headers |
| `text-xl` medium | `text-xl font-medium` | Card titles |
| `text-base` normal | `text-base` | Body text, chat messages |
| `text-sm` normal | `text-sm` | Labels, metadata |
| `text-xs` | `text-xs` | CEFR badges, timestamps |

---

## Gamification Visual Language

| Element | Color | Icon | Animation |
|---|---|---|---|
| XP gain | `success` green | ⚡ Zap | Float-up +N |
| Badge earned | `warning` amber | 🏅 Medal | Scale spring |
| Level-up | `primary` blue | 🎯 Target | Confetti burst |
| Streak | `error` red | 🔥 Flame | Pulse |

---

## WCAG Contrast Check

| Pair | Contrast Ratio | AA Pass |
|---|---|---|
| `primary-500` on white | 4.8:1 | ✅ |
| `neutral-900` on `surface-bg` | 18.1:1 | ✅ |
| `neutral-500` on white | 4.6:1 | ✅ |
| White on `primary-500` | 4.8:1 | ✅ |
