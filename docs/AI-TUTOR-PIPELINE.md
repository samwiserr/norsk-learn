# AI Tutor Pipeline Design
**Skill applied:** `rag-architect` + `senior-backend`  
**LLM:** Google Gemini 2.5 Flash Lite  
**Date:** 2026-04-08

---

## Pipeline Overview

```
User input
    │
    ▼
[Input Sanitization]          lib/sanitize.ts
    │
    ▼
[Conversation History]        Last 10 messages from DB
    │
    ▼
[Prompt Builder]              lib/conversation-prompts.ts
    │  ├─ CEFR level + progress
    │  ├─ Language selection
    │  ├─ Exercise mode instructions
    │  └─ Writing mode instructions
    ▼
[Gemini API Call]             gemini-2.5-flash-lite
    │  ├─ Streaming: /api/conversation-stream (SSE)
    │  └─ Non-streaming: /api/conversation
    ▼
[JSON Response Parser]        Parse + validate AI JSON
    │
    ▼
[Progress Delta Application]  lib/cefr-progress.ts
    │
    ▼
[Persist to DB]               messages + progress tables
    │
    ▼
[Return to Client]
```

---

## Prompt Schema

The AI must always return valid JSON matching this schema:

```typescript
// lib/types.ts
export type AIResponse = {
  summary: string              // Explanation in user's UI language
  fixes: Fix[]                 // Array of corrections
  improvedVersion: string      // Full corrected version of user's text
  nextQuestion: string         // Next prompt for the user (in target language)
  hint: string                 // Helpful tip for user's CEFR level
  progressDelta: number        // Points to add/subtract (-10 to +20)
}

export type Fix = {
  original: string
  corrected: string
  explanation: string
}
```

---

## CEFR Scoring Logic (`lib/cefr-progress.ts`)

```typescript
// Existing file — extend with these thresholds

export const CEFR_THRESHOLDS = {
  A1: { min: 0,   max: 249 },
  A2: { min: 250, max: 499 },
  B1: { min: 500, max: 749 },
  B2: { min: 750, max: 1000 },
}

export function getCurrentCEFRLevel(score: number): "A1" | "A2" | "B1" | "B2" {
  if (score >= 750) return "B2"
  if (score >= 500) return "B1"
  if (score >= 250) return "A2"
  return "A1"
}

// Progress delta boundaries
export const DELTA_BOUNDS = { min: -10, max: 20 }
export const clampDelta = (d: number) => Math.max(DELTA_BOUNDS.min, Math.min(DELTA_BOUNDS.max, d))
```

---

## Streaming Implementation (SSE)

```typescript
// app/api/conversation-stream/route.ts — existing file
// Key pattern: ReadableStream with TransformStream

const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder()
    const geminiStream = await model.generateContentStream(prompt)

    let fullText = ""
    for await (const chunk of geminiStream.stream) {
      const text = chunk.text()
      fullText += text
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`))
    }

    // Parse final JSON and persist
    const parsed = parseAIResponse(fullText)
    await persistMessage(sessionId, userId, parsed)
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, ...parsed })}\n\n`))
    controller.close()
  }
})

return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  }
})
```

---

## Voice Integration (P2)

When voice input is enabled:
1. Client records audio → sends as `multipart/form-data` to `/api/voice/transcribe`
2. Server sends to **Whisper API** (OpenAI) or **Google Speech-to-Text**
3. Returns transcript text → client injects into chat input
4. Normal conversation pipeline runs from there

When voice output is enabled:
1. AI response `nextQuestion` field sent to `/api/voice/synthesize`
2. Server calls **Google Cloud TTS** or **ElevenLabs**
3. Returns audio buffer → client plays inline

```typescript
// app/api/voice/transcribe/route.ts
export async function POST(req: Request) {
  const formData = await req.formData()
  const audio = formData.get("audio") as File
  
  // OpenAI Whisper
  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: "whisper-1",
    language: "no",  // target language code
  })
  
  return NextResponse.json({ transcript: transcription.text })
}
```

---

## Exercise Mode Prompts

Each exercise mode appends specific instructions to the base prompt:

| Mode | AI Behavior |
|---|---|
| `free_conversation` | Open-ended chat, welcoming opener |
| `translation` | Provides source sentence, evaluates target translation |
| `grammar_drill` | Focuses strictly on identified grammar pattern |
| `vocabulary` | Introduces 3–5 new words contextually, tests recall |
| `sentence_building` | Gives scrambled words, evaluates recomposition |
| `passive_voice` | Only passive voice constructions in exercises |

---

## Error Handling

```typescript
// Fallback if AI returns invalid JSON
function parseAIResponse(raw: string): AIResponse {
  try {
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim())
    return aiResponseSchema.parse(json)  // Zod validation
  } catch {
    return {
      summary: "I couldn't process that response. Please try again.",
      fixes: [],
      improvedVersion: "",
      nextQuestion: "Can you try again?",
      hint: "",
      progressDelta: 0,
    }
  }
}
```

---

## Rate Limiting Strategy

```typescript
// 20 AI requests per minute per user
// Implemented in middleware before route handler
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 m"),
})
```
