/**
 * Phase 3 — shared public API shell: rate limit, request id, JSON parse, stable error JSON.
 * Keeps the flat error shape expected by ApiService: { error, code?, type?, retryable? }.
 */
import "server-only";

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { z, ZodTypeAny } from "zod";
import { AppError, ErrorType, createAppError, reportErrorToSentry } from "@/lib/error-handling";
import { rateLimit } from "@/lib/rate-limiting";
import { config } from "@/lib/config";
import { LanguageCode } from "@/lib/languages";
import { createLogger } from "@/lib/logger";
import { setLanguageContext } from "@/sentry.server.config";

const log = createLogger("PublicRoute");

export const HEADER_REQUEST_ID = "x-request-id";

/** Anonymous device key for server-owned session snapshots (no PII; opaque id from client). */
export const HEADER_DEVICE_ID = "x-device-id";

/** First client IP for rate-limit key (aligned with azure / openai routes). */
export function getClientIpKey(request: NextRequest | Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "anonymous";
}

export function getOrCreateRequestId(request: NextRequest | Request): string {
  const existing = request.headers.get(HEADER_REQUEST_ID);
  if (existing?.trim()) return existing.trim();
  return randomUUID();
}

function getConfiguredMaxRequests(): number {
  try {
    return config.rateLimit.maxRequests;
  } catch {
    return 100;
  }
}

export type RateLimitCheckResult =
  | { ok: true; remaining?: number }
  | { ok: false; retryAfter?: number; remaining?: number };

export async function checkRateLimit(request: NextRequest | Request): Promise<RateLimitCheckResult> {
  const key = getClientIpKey(request);
  const result = await rateLimit(key);
  if (!result.success) {
    return { ok: false, retryAfter: result.retryAfter, remaining: result.remaining };
  }
  return { ok: true, remaining: result.remaining };
}

export function rateLimitExceededResponse(
  outcome: Extract<RateLimitCheckResult, { ok: false }>,
  requestId: string
): NextResponse {
  const maxRequests = getConfiguredMaxRequests();
  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
      type: ErrorType.VALIDATION,
      retryable: false,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(outcome.retryAfter ?? 60),
        "X-RateLimit-Limit": String(maxRequests),
        "X-RateLimit-Remaining": String(outcome.remaining ?? 0),
        [HEADER_REQUEST_ID]: requestId,
      },
    }
  );
}

export function invalidJsonBodyResponse(requestId: string): NextResponse {
  return NextResponse.json(
    {
      error: "Invalid request body",
      code: "INVALID_BODY",
      type: ErrorType.VALIDATION,
      retryable: false,
    },
    { status: 400, headers: { [HEADER_REQUEST_ID]: requestId } }
  );
}

export function validationErrorResponse(
  message: string,
  requestId: string,
  code = "VALIDATION_ERROR"
): NextResponse {
  return NextResponse.json(
    { error: message, code, type: ErrorType.VALIDATION, retryable: false },
    { status: 400, headers: { [HEADER_REQUEST_ID]: requestId } }
  );
}

/** 5xx-style operational / config errors (still flat JSON for the client). */
export function apiErrorResponse(
  message: string,
  requestId: string,
  options?: { code?: string; status?: number; retryable?: boolean; type?: ErrorType }
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: options?.code ?? "API_ERROR",
      type: options?.type ?? ErrorType.API,
      retryable: options?.retryable ?? false,
    },
    {
      status: options?.status ?? 500,
      headers: { [HEADER_REQUEST_ID]: requestId },
    }
  );
}

export function attachPublicHeaders(
  response: NextResponse,
  requestId: string,
  extra?: Record<string, string>
): NextResponse {
  response.headers.set(HEADER_REQUEST_ID, requestId);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      response.headers.set(k, v);
    }
  }
  return response;
}

export function jsonWithRequestId(data: unknown, requestId: string, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(data, init);
  res.headers.set(HEADER_REQUEST_ID, requestId);
  return res;
}

export async function readJsonBody(
  request: NextRequest | Request,
  requestId: string
): Promise<{ ok: true; value: unknown } | { ok: false; response: NextResponse }> {
  try {
    const value: unknown = await request.json();
    return { ok: true, value };
  } catch {
    return { ok: false, response: invalidJsonBodyResponse(requestId) };
  }
}

/**
 * For routes that treat invalid JSON as empty body (backward compatible).
 * Prefer readJsonBody when the body must be valid JSON.
 */
export async function readJsonBodyOrEmpty(request: NextRequest | Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export type PublicPreflightOk = {
  requestId: string;
  rateLimitRemaining?: number;
};

export type PublicPreflightResult =
  | { ok: true; ctx: PublicPreflightOk }
  | { ok: false; response: NextResponse };

/**
 * Rate limit + request id. Use rateLimitFailOpen (e.g. streaming) to match prior fail-open behavior.
 */
export async function publicRoutePreflight(
  request: NextRequest,
  options?: { skipRateLimit?: boolean; rateLimitFailOpen?: boolean }
): Promise<PublicPreflightResult> {
  const requestId = getOrCreateRequestId(request);
  if (options?.skipRateLimit) {
    return { ok: true, ctx: { requestId } };
  }
  try {
    const rl = await checkRateLimit(request);
    if (!rl.ok) {
      return { ok: false, response: rateLimitExceededResponse(rl, requestId) };
    }
    return { ok: true, ctx: { requestId, rateLimitRemaining: rl.remaining } };
  } catch (rlError) {
    log.error("Rate limit check failed", rlError);
    if (options?.rateLimitFailOpen) {
      return { ok: true, ctx: { requestId } };
    }
    throw rlError;
  }
}

export function parseBodyWithSchema<S extends ZodTypeAny>(
  requestId: string,
  body: unknown,
  schema: S
): { ok: true; data: z.infer<S> } | { ok: false; response: NextResponse } {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const msg = first
      ? `${first.path.length ? `${first.path.join(".")}: ` : ""}${first.message}`
      : "Invalid input";
    return { ok: false, response: validationErrorResponse(msg, requestId) };
  }
  return { ok: true, data: parsed.data };
}

function safeErrorSnapshot(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    const result: Record<string, unknown> = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
    const anyErr = err as { code?: unknown; status?: unknown };
    if (anyErr.code) result.code = anyErr.code;
    if (anyErr.status) result.status = anyErr.status;
    return result;
  }
  try {
    return JSON.parse(JSON.stringify(err)) as Record<string, unknown>;
  } catch {
    return { type: typeof err, value: String(err) };
  }
}

/**
 * Maps AppError / unknown errors to the same JSON the tutor routes already returned.
 */
export function handlePublicRouteError(request: NextRequest, error: unknown): NextResponse {
  const requestId = getOrCreateRequestId(request);
  const errorInfo = safeErrorSnapshot(error);
  log.error("Public route error", { requestId, error: errorInfo });

  if (error instanceof AppError) {
    log.error("AppError details", {
      type: error.type,
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      ...(error.originalError ? { originalError: safeErrorSnapshot(error.originalError) } : {}),
    });
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        type: error.type,
        retryable: error.retryable,
        ...(process.env.NODE_ENV === "development" && error.originalError instanceof Error
          ? { originalError: error.originalError.message }
          : {}),
      },
      {
        status: error.type === ErrorType.VALIDATION ? 400 : 500,
        headers: { [HEADER_REQUEST_ID]: requestId },
      }
    );
  }

  const language: LanguageCode = (request.headers.get("x-locale") as LanguageCode) || "en";
  if (language) {
    setLanguageContext(language);
  }

  const appError = createAppError(error, language);
  reportErrorToSentry(appError, language);

  log.error("Converted to AppError", {
    type: appError.type,
    code: appError.code,
    message: appError.message,
    retryable: appError.retryable,
  });

  return NextResponse.json(
    {
      error: appError.message,
      code: appError.code,
      type: appError.type,
      retryable: appError.retryable,
      ...(process.env.NODE_ENV === "development"
        ? { originalError: error instanceof Error ? error.message : String(error) }
        : {}),
    },
    { status: 500, headers: { [HEADER_REQUEST_ID]: requestId } }
  );
}

/**
 * Thin POST handler: preflight → JSON body → Zod → handler. Errors map via handlePublicRouteError.
 */
export async function runPublicPostJson<S extends ZodTypeAny>(
  request: NextRequest,
  schema: S,
  handler: (args: {
    requestId: string;
    rateLimitRemaining?: number;
    data: z.infer<S>;
  }) => Promise<NextResponse>,
  options?: { skipRateLimit?: boolean; rateLimitFailOpen?: boolean }
): Promise<NextResponse> {
  try {
    const pre = await publicRoutePreflight(request, options);
    if (!pre.ok) return pre.response;
    const requestId = pre.ctx.requestId;

    const raw = await readJsonBody(request, requestId);
    if (!raw.ok) return raw.response;

    const valid = parseBodyWithSchema(requestId, raw.value, schema);
    if (!valid.ok) return valid.response;

    return await handler({
      requestId,
      rateLimitRemaining: pre.ctx.rateLimitRemaining,
      data: valid.data,
    });
  } catch (error) {
    return handlePublicRouteError(request, error);
  }
}

/**
 * Thin GET handler: preflight → handler.
 */
export async function runPublicGet(
  request: NextRequest,
  handler: (args: { requestId: string; rateLimitRemaining?: number }) => Promise<NextResponse>,
  options?: { skipRateLimit?: boolean }
): Promise<NextResponse> {
  try {
    const pre = await publicRoutePreflight(request, options);
    if (!pre.ok) return pre.response;
    return await handler({
      requestId: pre.ctx.requestId,
      rateLimitRemaining: pre.ctx.rateLimitRemaining,
    });
  } catch (error) {
    return handlePublicRouteError(request, error);
  }
}

export function getDeviceIdOrNull(request: NextRequest | Request): string | null {
  const id = request.headers.get(HEADER_DEVICE_ID)?.trim();
  if (!id || id.length < 8 || id.length > 128) return null;
  return id;
}
