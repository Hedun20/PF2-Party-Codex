import {
  APPLICATION_ERROR_CODES,
  type ApplicationError,
  type ApplicationErrorCode
} from "./errors.js";
import {
  expectBoolean,
  expectEnum,
  expectExactKeys,
  expectInteger,
  expectJsonObject,
  expectRecord,
  expectString,
  fail,
  hasOwn,
  type JsonObject
} from "./validation.js";

export interface ApiSuccess<T> {
  readonly ok: true;
  readonly data: T;
  readonly meta?: JsonObject;
}

export interface ApiFailure {
  readonly ok: false;
  readonly error: ApplicationError;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export interface LegacyApiErrorEnvelope {
  readonly error: string;
  readonly code?: string;
  readonly requestId?: string;
}

export interface CompatibilityResponseContext {
  readonly httpStatus?: number;
}

export function successEnvelope<T>(data: T, meta?: JsonObject): ApiSuccess<T> {
  return meta === undefined ? { ok: true, data } : { ok: true, data, meta };
}

export function failureEnvelope(error: ApplicationError): ApiFailure {
  return { ok: false, error };
}

const LEGACY_ERROR_CODE_MAPPING: Readonly<Record<string, ApplicationErrorCode>> = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  EMAIL_UNVERIFIED: "EMAIL_UNVERIFIED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  API_ROUTE_NOT_FOUND: "API_ROUTE_NOT_FOUND",
  CONFLICT: "CONFLICT",
  ENTITLEMENT_LIMIT: "ENTITLEMENT_LIMIT",
  RATE_LIMITED: "RATE_LIMITED",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  STORAGE_UNAVAILABLE: "STORAGE_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR"
};

function applicationErrorCodeFromStatus(value: number | undefined, path: string): ApplicationErrorCode {
  if (value === undefined) return "INTERNAL_ERROR";
  const status = expectInteger(value, `${path}.httpStatus`);
  if (status < 100 || status > 599) return fail(`${path}.httpStatus`, "expected a valid HTTP status");
  if (status === 401) return "AUTH_REQUIRED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  if (status === 503) return "STORAGE_UNAVAILABLE";
  if (status === 400 || status === 413 || status === 422) return "VALIDATION_FAILED";
  return "INTERNAL_ERROR";
}

export function normalizeLegacyApplicationError(
  value: unknown,
  path = "response",
  context: CompatibilityResponseContext = {}
): ApplicationError {
  const item = expectRecord(value, path);
  expectExactKeys(item, ["ok", "error", "code", "requestId"], path);
  if (hasOwn(item, "ok") && item["ok"] !== false) {
    expectBoolean(item["ok"], `${path}.ok`);
    return fail(`${path}.ok`, "legacy error responses must use false");
  }
  const message = expectString(item["error"], `${path}.error`);
  const legacyCode = hasOwn(item, "code") ? expectString(item["code"], `${path}.code`) : "";
  const requestId = hasOwn(item, "requestId")
    ? expectString(item["requestId"], `${path}.requestId`)
    : undefined;
  return {
    code:
      legacyCode === ""
        ? applicationErrorCodeFromStatus(context.httpStatus, path)
        : (LEGACY_ERROR_CODE_MAPPING[legacyCode] ?? "INTERNAL_ERROR"),
    message,
    ...(requestId === undefined ? {} : { requestId })
  };
}

export function parseApplicationError(value: unknown, path = "error"): ApplicationError {
  const item = expectRecord(value, path);
  expectExactKeys(item, ["code", "message", "field", "requestId"], path);
  const code: ApplicationErrorCode = expectEnum(item["code"], APPLICATION_ERROR_CODES, `${path}.code`);
  const message = expectString(item["message"], `${path}.message`);
  const field = hasOwn(item, "field") ? expectString(item["field"], `${path}.field`) : undefined;
  const requestId = hasOwn(item, "requestId") ? expectString(item["requestId"], `${path}.requestId`) : undefined;
  return {
    code,
    message,
    ...(field === undefined ? {} : { field }),
    ...(requestId === undefined ? {} : { requestId })
  };
}

export function parseApiEnvelope<T>(
  value: unknown,
  parseData: (data: unknown, path: string) => T,
  path = "response"
): ApiEnvelope<T> {
  const item = expectRecord(value, path);
  const ok = expectBoolean(item["ok"], `${path}.ok`);
  if (ok) {
    expectExactKeys(item, ["ok", "data", "meta"], path);
    const data = parseData(item["data"], `${path}.data`);
    if (!hasOwn(item, "meta")) return { ok: true, data };
    return { ok: true, data, meta: expectJsonObject(item["meta"], `${path}.meta`) };
  }
  expectExactKeys(item, ["ok", "error"], path);
  return { ok: false, error: parseApplicationError(item["error"], `${path}.error`) };
}

export function parseCompatibilityResponse<T>(
  value: unknown,
  parseData: (data: unknown, path: string) => T,
  parseLegacySuccess: (data: unknown, path: string) => T,
  path = "response",
  context: CompatibilityResponseContext = {}
): ApiEnvelope<T> {
  const item = expectRecord(value, path);
  if (item["ok"] === true) {
    if (hasOwn(item, "data")) return parseApiEnvelope(item, parseData, path);
    return successEnvelope(parseLegacySuccess(item, path));
  }
  if (item["ok"] === false && typeof item["error"] === "object" && item["error"] !== null) {
    return parseApiEnvelope(item, parseData, path);
  }
  if (hasOwn(item, "error")) {
    return failureEnvelope(normalizeLegacyApplicationError(item, path, context));
  }
  if (hasOwn(item, "ok")) {
    return parseApiEnvelope(item, parseData, path);
  }
  return successEnvelope(parseLegacySuccess(item, path));
}
