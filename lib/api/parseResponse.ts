import { z } from "zod";
import { AppError, ErrorType } from "@/lib/error-handling";
import { createLogger } from "@/lib/logger";

const log = createLogger("ParseResponse");

/**
 * Validates a successful JSON body against a Zod schema.
 * Throws AppError(API, INVALID_RESPONSE_SHAPE) on mismatch so callers stay consistent.
 */
export function parseResponseBody<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
  context: string
): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    log.warn(`${context}: response validation failed`, result.error.flatten());
    throw new AppError(
      ErrorType.API,
      "Unexpected response shape from server",
      "INVALID_RESPONSE_SHAPE",
      false,
      result.error
    );
  }
  return result.data;
}
