import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { rateLimit } from "@/lib/rate-limiting";
import { createLogger } from "@/lib/logger";

const log = createLogger("AzureSpeechAPI");

const DEFAULT_TTL_SECONDS = 600; // Azure tokens are ~10 minutes

function getIdentifier(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]?.trim() || "anonymous";
    return req.headers.get("x-real-ip") || "anonymous";
}

export async function GET(request: NextRequest) {
    const identifier = getIdentifier(request);
    const rl = await rateLimit(identifier);
    if (!rl.success) {
        return NextResponse.json(
            { error: "Too many requests. Please slow down.", retryAfter: rl.retryAfter },
            { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 1) } }
        );
    }

    const { key, region, tokenUrl } = config.azureSpeech;
    if (!key || !region) {
        return NextResponse.json(
            { error: "Azure Speech key/region not configured." },
            { status: 500 }
        );
    }

    const url = tokenUrl || `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;

    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: {
                "Ocp-Apim-Subscription-Key": key,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        if (!resp.ok) {
            const text = await resp.text();
            return NextResponse.json(
                { error: "Failed to mint Azure Speech token", detail: text.slice(0, 500) },
                { status: resp.status }
            );
        }

        const token = await resp.text();
        return NextResponse.json({
            token,
            region,
            expires_in: DEFAULT_TTL_SECONDS,
            rate_limit: { remaining: rl.remaining },
        });
    } catch (error) {
        log.error("Token minting failed", error);
        return NextResponse.json({ error: "Unexpected error minting Azure Speech token" }, { status: 500 });
    }
}


