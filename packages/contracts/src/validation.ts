import { ContractValidationError } from "./errors.js";

export type UnknownRecord = Record<string, unknown>;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export function fail(path: string, message: string): never {
  throw new ContractValidationError(path, message);
}

export function hasOwn(value: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function expectRecord(value: unknown, path: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(path, "expected an object");
  }
  return value as UnknownRecord;
}

export function expectExactKeys(value: UnknownRecord, allowedKeys: readonly string[], path: string): void {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${path}.${key}`, "unexpected field");
  }
}

export function expectString(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== "string") return fail(path, "expected a string");
  if (!allowEmpty && value.trim().length === 0) return fail(path, "must not be empty");
  return value;
}

export function expectBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") return fail(path, "expected a boolean");
  return value;
}

export function expectInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    return fail(path, "expected a safe integer");
  }
  return value;
}

export function expectStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) return fail(path, "expected an array");
  return value.map((item, index) => expectString(item, `${path}[${index}]`));
}

export function expectEnum<const T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  path: string
): T {
  if (typeof value !== "string" || !allowedValues.includes(value as T)) {
    return fail(path, `expected one of: ${allowedValues.join(", ")}`);
  }
  return value as T;
}

export function expectNullableString(value: unknown, path: string): string | null {
  if (value === null) return null;
  return expectString(value, path);
}

export function expectJsonValue(value: unknown, path: string): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return fail(path, "JSON numbers must be finite");
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => expectJsonValue(item, `${path}[${index}]`));
  }
  const record = expectRecord(value, path);
  const result: Record<string, JsonValue> = {};
  for (const [key, item] of Object.entries(record)) {
    result[key] = expectJsonValue(item, `${path}.${key}`);
  }
  return result;
}

export function expectJsonObject(value: unknown, path: string): JsonObject {
  const parsed = expectJsonValue(value, path);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return fail(path, "expected a JSON object");
  }
  return parsed;
}

function normalizeSecurityKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

export function isForbiddenKey(key: string, forbiddenKeys: ReadonlySet<string>): boolean {
  const normalizedKey = normalizeSecurityKey(key);
  for (const forbiddenKey of forbiddenKeys) {
    if (normalizeSecurityKey(forbiddenKey) === normalizedKey) return true;
  }
  return false;
}

export function rejectForbiddenKeysDeep(
  value: unknown,
  forbiddenKeys: ReadonlySet<string>,
  path: string
): void {
  const seen = new WeakSet<object>();

  function visit(item: unknown, itemPath: string): void {
    if (typeof item !== "object" || item === null) return;
    if (seen.has(item)) return;
    seen.add(item);
    if (Array.isArray(item)) {
      item.forEach((child, index) => visit(child, `${itemPath}[${index}]`));
      return;
    }
    for (const [key, child] of Object.entries(item as UnknownRecord)) {
      if (isForbiddenKey(key, forbiddenKeys)) {
        fail(`${itemPath}.${key}`, "private field is forbidden in a player DTO");
      }
      visit(child, `${itemPath}.${key}`);
    }
  }

  visit(value, path);
}
