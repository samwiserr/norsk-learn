import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("PronunciationAPI");

export async function POST(req: Request) {
    const targetUrl = process.env.PRONUNCIATION_SERVICE_URL;

    if (!targetUrl) {
        return NextResponse.json(
            { error: "PRONUNCIATION_SERVICE_URL is not configured" },
            { status: 503 }
        );
    }

    const formData = await req.formData();

    try {
        const res = await fetch(`${targetUrl}/assess`, {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            const errorText = await res.text();
            return NextResponse.json({ error: `Pronunciation service error: ${res.status} ${errorText}` }, { status: res.status });
        }

        const text = await res.text();
        return new NextResponse(text, {
            status: res.status,
            headers: { "content-type": res.headers.get("content-type") || "application/json" },
        });
    } catch (error) {
        log.error("Proxy error:", error);
        return NextResponse.json({ error: "Failed to connect to pronunciation service" }, { status: 502 });
    }
}
