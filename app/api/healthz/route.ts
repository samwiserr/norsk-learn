import { NextResponse } from "next/server";

/**
 * Lightweight readiness endpoint for CI/container smoke checks.
 * Keep this dependency-free so it reflects process readiness only.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    uptimeMs: Math.floor(process.uptime() * 1000),
    timestamp: new Date().toISOString(),
  });
}

