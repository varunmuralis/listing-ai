/**
 * Typed result object used across the domain instead of throwing for expected
 * failures. Uncaught errors are reserved for genuinely exceptional conditions.
 */
export type Ok<T> = { ok: true; data: T };
export type Err<E = AppError> = { ok: false; error: E };
export type Result<T, E = AppError> = Ok<T> | Err<E>;

export type AppErrorCode =
  | "validation_error"
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "provider_error"
  | "unavailable"
  | "internal_error";

export interface AppError {
  code: AppErrorCode;
  message: string;
  /** Optional field-level validation details for form rendering. */
  fields?: Record<string, string[]>;
}

export function ok<T>(data: T): Ok<T> {
  return { ok: true, data };
}

export function err(code: AppErrorCode, message: string, fields?: Record<string, string[]>): Err {
  return { ok: false, error: { code, message, fields } };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}
