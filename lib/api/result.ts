/**
 * Standard API result envelope for use across route handlers and (eventually) the client.
 * Phase 1 introduces types; route handlers adopt the same shape in a later phase.
 */

export type ApiErrorPayload = {
  message: string;
  code?: string;
  type?: string;
  retryable?: boolean;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiFailure = {
  ok: false;
  error: ApiErrorPayload;
  meta?: Record<string, unknown>;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export function apiSuccess<T>(data: T, meta?: Record<string, unknown>): ApiSuccess<T> {
  return meta ? { ok: true, data, meta } : { ok: true, data };
}

export function apiFailure(
  message: string,
  options?: { code?: string; type?: string; retryable?: boolean; meta?: Record<string, unknown> }
): ApiFailure {
  const { code, type, retryable, meta } = options ?? {};
  return {
    ok: false,
    error: { message, code, type, retryable },
    ...(meta ? { meta } : {}),
  };
}

export function isApiSuccess<T>(r: ApiResult<T>): r is ApiSuccess<T> {
  return r.ok === true;
}

export function isApiFailure<T>(r: ApiResult<T>): r is ApiFailure {
  return r.ok === false;
}
