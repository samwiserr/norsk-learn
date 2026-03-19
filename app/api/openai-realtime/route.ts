import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { rateLimit } from "@/lib/rate-limiting";
import { createLogger } from "@/lib/logger";

const log = createLogger("OpenAIRealtimeAPI");

const OPENAI_REALTIME_URL = "https://api.openai.com/v1/realtime/sessions";
const OPENAI_BETA_HEADER = "realtime=v1";

function getIdentifier(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0]?.trim() || "anonymous";
    }
    return req.headers.get("x-real-ip") || "anonymous";
}

export async function POST(request: NextRequest) {
    const identifier = getIdentifier(request);
    const rl = await rateLimit(identifier);
    if (!rl.success) {
        return NextResponse.json(
            { error: "Too many requests. Please slow down.", retryAfter: rl.retryAfter },
            { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 1) } }
        );
    }

    const apiKey = config.openai.apiKey;
    if (!apiKey) {
        return NextResponse.json({ error: "OpenAI Realtime API key is not configured." }, { status: 500 });
    }

    const fallbackModel = config.openai.realtimeModel;

    try {
        const body = await request.json().catch(() => ({}));
        const model = body.model || fallbackModel;
        const modalities = body.modalities || ["text", "audio"];

        const response = await fetch(OPENAI_REALTIME_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "OpenAI-Beta": OPENAI_BETA_HEADER,
            },
            body: JSON.stringify({
                model,
                modalities,
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            return NextResponse.json(
                { error: "Failed to create OpenAI Realtime session", detail: text.slice(0, 500) },
                { status: response.status }
            );
        }

        const payload = await response.json();
        const clientSecret = payload?.client_secret;
        if (!clientSecret) {
            return NextResponse.json(
                { error: "OpenAI response missing client_secret", detail: payload },
                { status: 502 }
            );
        }

        return NextResponse.json({
            client_secret: clientSecret,
            session_id: payload.id,
            expires_at: payload.expires_at,
            model,
            rate_limit: { remaining: rl.remaining },
        });
    } catch (error) {
        log.error("Realtime session creation failed", error);
        return NextResponse.json({ error: "Unexpected error creating realtime session" }, { status: 500 });
    }
}
