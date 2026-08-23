import crypto from "node:crypto";

const SENSITIVE_KEY = /(?:authorization|cookie|password|secret|token|signature|nonce|raw|prompt|private|gm(?:content|notes|secrets?)|email|mongo(?:uri)?)/i;
const DEFAULT_FORBIDDEN_KEYS = [
  "authorization",
  "cookie",
  "password",
  "accessToken",
  "refreshToken",
  "sessionToken",
  "connectorSecret",
  "serviceSecret",
  "gmContent",
  "gmNotes",
  "gmSecrets",
  "privateNotes"
];
const PLAYER_SAFE_VISIBILITIES = new Set(["public", "revealed", "party", "specificplayers"]);

function normalizeSecurityKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function redactSecurityEvidence(value, _options = {}, seen = new WeakSet()) {
  if (value === null || value === undefined || typeof value !== "object") return "<redacted>";
  if (seen.has(value)) return "<circular>";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => redactSecurityEvidence(item, {}, seen));
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY.test(key)
      ? "<redacted>"
      : redactSecurityEvidence(item, {}, seen);
  }
  return output;
}

export class SecurityAssertionError extends Error {
  constructor(scenarioId, reason, evidence = {}, options = {}) {
    const redacted = redactSecurityEvidence(evidence, options);
    super(`[SECURITY_GATE:${scenarioId}] ${reason}; evidence=${JSON.stringify(redacted)}`);
    this.name = "SecurityAssertionError";
    this.code = "SECURITY_GATE_FAILED";
    this.scenarioId = scenarioId;
  }
}

function reject(scenario, reason, evidence) {
  throw new SecurityAssertionError(scenario.id, reason, evidence, {
    forbiddenValues: scenario.forbiddenValues || []
  });
}

function json(value) {
  try {
    const serialized = JSON.stringify(value);
    return typeof serialized === "string" ? serialized : "<unserializable>";
  } catch {
    return "<unserializable>";
  }
}

function allKeys(value, found = new Set(), seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return found;
  seen.add(value);
  for (const [key, item] of Object.entries(value)) {
    found.add(key);
    allKeys(item, found, seen);
  }
  return found;
}

export function assertNoSecretLeak(scenario, value, extraForbiddenKeys = []) {
  const serialized = json(value);
  for (const marker of scenario.forbiddenValues || []) {
    if (marker && serialized.includes(marker)) reject(scenario, "forbidden evidence reached the observable payload", value);
  }
  const keys = allKeys(value);
  const forbiddenKeys = new Map(
    [...DEFAULT_FORBIDDEN_KEYS, ...extraForbiddenKeys]
      .map((key) => [normalizeSecurityKey(key), key])
  );
  for (const observedKey of keys) {
    const forbiddenKey = forbiddenKeys.get(normalizeSecurityKey(observedKey));
    if (forbiddenKey) {
      reject(scenario, `forbidden field ${forbiddenKey} reached the observable payload`, value);
    }
  }
}

export function assertDeniedBoundary(scenario, candidate) {
  if (candidate?.allowed !== false) reject(scenario, "adversarial request was not denied", candidate);
  if (candidate?.code !== scenario.expectedCode) reject(scenario, "denial used an unstable or unexpected code", candidate);
  assertNoSecretLeak(scenario, candidate);
}

export function assertScopedRecords(scenario, candidate) {
  const expected = scenario.expected || {};
  if (candidate?.workspaceId !== expected.workspaceId || candidate?.campaignId !== expected.campaignId) {
    reject(scenario, "response tenant context does not match the exact request", candidate);
  }
  for (const record of candidate?.records || []) {
    if (record.workspaceId !== expected.workspaceId || record.campaignId !== expected.campaignId) {
      reject(scenario, "cross-tenant record reached the response", record);
    }
    if (expected.userId && !(record.allowedUserIds || []).includes(expected.userId)) {
      reject(scenario, "record is not authorized for the exact player", record);
    }
    const visibility = String(record.visibility || "").trim().toLowerCase();
    if (!PLAYER_SAFE_VISIBILITIES.has(visibility)) {
      reject(scenario, "record without an explicitly player-safe visibility reached the response", record);
    }
  }
  assertNoSecretLeak(scenario, candidate);
}

export function assertHiddenEnvelope(scenario, candidate) {
  if (candidate?.visibility !== scenario.expected?.visibility) reject(scenario, "visibility changed across the boundary", candidate);
  assertNoSecretLeak(scenario, candidate, scenario.forbiddenKeys || []);
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]))
}

function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function signSecurityBatch(batch, secret) {
  return crypto.createHmac("sha256", secret).update(canonicalJson(batch)).digest("hex");
}

export function createHmacSha256Bucket(input, secret) {
  return `hmac-sha256:${crypto.createHmac("sha256", secret).update(String(input)).digest("hex")}`;
}

export function assertSignedBatch(scenario, candidate) {
  const expected = signSecurityBatch(candidate?.batch, scenario.signingSecret);
  const expectedBytes = Buffer.from(expected, "hex");
  const receivedBytes = Buffer.from(String(candidate?.signature || ""), "hex");
  if (expectedBytes.length !== receivedBytes.length || !crypto.timingSafeEqual(expectedBytes, receivedBytes)) {
    reject(scenario, "signed connector batch failed integrity verification", {
      batchId: candidate?.batch?.batchId,
      campaignId: candidate?.batch?.campaignId,
      signature: candidate?.signature
    });
  }
  if (candidate?.batch?.campaignId !== scenario.expected?.campaignId || candidate?.batch?.connectionId !== scenario.expected?.connectionId) {
    reject(scenario, "signed batch is not bound to the expected connection and campaign", candidate?.batch);
  }
}

export function assertIdempotentJob(scenario, candidate) {
  const attempts = candidate?.attempts || [];
  const effects = candidate?.sideEffects || [];
  if (attempts.length < 2) reject(scenario, "retry fixture did not exercise a duplicate attempt", candidate);
  if (new Set(effects.map((item) => item.idempotencyKey)).size !== 1 || effects.length !== 1) {
    reject(scenario, "job retry produced duplicate side effects", candidate);
  }
  if (new Set(attempts.map((item) => item.jobId)).size !== 1) reject(scenario, "retry changed the logical job identity", candidate);
  assertNoSecretLeak(scenario, candidate);
}

export function securityCacheKey(context = {}) {
  return [
    context.workspaceId,
    context.campaignId,
    context.principalKind,
    context.principalId,
    context.policyVersion
  ].map((value) => encodeURIComponent(String(value || ""))).join("|");
}

export function assertTenantCacheKey(scenario, candidate) {
  const expected = securityCacheKey(scenario.expected);
  if (candidate?.key !== expected) reject(scenario, "cache key omits or changes tenant/principal policy context", candidate);
}

export function assertCampaignDeepLink(scenario, candidate) {
  const value = String(candidate?.url || "");
  const prefix = `/campaigns/${encodeURIComponent(scenario.expected.campaignId)}`;
  const rawPath = value.split(/[?#]/, 1)[0];
  if (rawPath.startsWith("//") || rawPath.includes("\\") || rawPath.includes("\0") || /%2f|%5c/i.test(rawPath)) {
    reject(scenario, "notification deep link escapes the exact campaign route", candidate);
  }
  let parsed;
  try {
    parsed = new URL(value, "https://party-codex.invalid");
  } catch {
    reject(scenario, "notification deep link is malformed", candidate);
  }
  if (parsed.origin !== "https://party-codex.invalid") reject(scenario, "notification deep link is not local", candidate);
  if (!parsed.pathname.startsWith(`${prefix}/`)) {
    reject(scenario, "normalized notification path escapes the exact campaign route", candidate);
  }
}

export function assertPromptIsolation(scenario, candidate) {
  if (candidate?.trustedInstructionsOnly !== true || candidate?.untrustedInstructionsExecuted !== false) {
    reject(scenario, "untrusted campaign evidence influenced instruction authority", candidate);
  }
  if (candidate?.writeAuthorized !== false) reject(scenario, "retrieval evidence authorized a write", candidate);
  assertNoSecretLeak(scenario, candidate?.output || {});
}

function metadataValueMatchesRule(value, rule) {
  switch (rule?.kind) {
    case "enum":
      return typeof value === "string"
        && Array.isArray(rule.values)
        && rule.values.includes(value);
    case "hmacSha256":
      if (typeof value !== "string" || typeof rule.input !== "string" || typeof rule.fixtureKey !== "string") {
        return false;
      }
      {
        const expected = createHmacSha256Bucket(rule.input, rule.fixtureKey);
        const valueBytes = Buffer.from(value);
        const expectedBytes = Buffer.from(expected);
        return valueBytes.length === expectedBytes.length
          && crypto.timingSafeEqual(valueBytes, expectedBytes);
      }
    case "boundedInteger":
      return Number.isSafeInteger(value)
        && value >= Number(rule.min)
        && value <= Number(rule.max);
    case "boolean":
      return typeof value === "boolean";
    default:
      return false;
  }
}

export function assertSafeMetadata(scenario, candidate) {
  assertNoSecretLeak(scenario, candidate, scenario.forbiddenKeys || []);
  if (!candidate || Array.isArray(candidate) || typeof candidate !== "object") {
    reject(scenario, "analytics metadata is not an object", candidate);
  }
  const fieldRules = scenario.metadataFieldRules || {};
  const allowedKeys = new Set(Object.keys(fieldRules));
  if (allowedKeys.size === 0) reject(scenario, "analytics metadata field schema is missing", {});
  const unexpectedKeyCount = Object.keys(candidate).filter((key) => !allowedKeys.has(key)).length;
  if (unexpectedKeyCount > 0) {
    reject(scenario, "analytics metadata contains fields outside the explicit allowlist", { unexpectedKeyCount });
  }
  const missingKeyCount = Object.entries(fieldRules)
    .filter(([key, rule]) => rule.required !== false && !Object.hasOwn(candidate, key))
    .length;
  if (missingKeyCount > 0) {
    reject(scenario, "analytics metadata omits required allowlisted fields", { missingKeyCount });
  }
  const invalidValueCount = Object.entries(candidate)
    .filter(([key, value]) => !metadataValueMatchesRule(value, fieldRules[key]))
    .length;
  if (invalidValueCount > 0) {
    reject(scenario, "analytics metadata contains a value outside its field constraint", { invalidValueCount });
  }
  if (json(candidate).length > Number(scenario.maxSerializedLength || 2_000)) {
    reject(scenario, "analytics metadata exceeds the bounded allowlisted shape", { length: json(candidate).length });
  }
}

export function validateSecurityFixture(scenario, candidate) {
  switch (scenario.assertion) {
    case "deniedBoundary": return assertDeniedBoundary(scenario, candidate);
    case "scopedRecords": return assertScopedRecords(scenario, candidate);
    case "hiddenEnvelope": return assertHiddenEnvelope(scenario, candidate);
    case "signedBatch": return assertSignedBatch(scenario, candidate);
    case "idempotentJob": return assertIdempotentJob(scenario, candidate);
    case "tenantCacheKey": return assertTenantCacheKey(scenario, candidate);
    case "campaignDeepLink": return assertCampaignDeepLink(scenario, candidate);
    case "promptIsolation": return assertPromptIsolation(scenario, candidate);
    case "safeMetadata": return assertSafeMetadata(scenario, candidate);
    default: throw new Error(`Unknown security assertion: ${scenario.assertion}`);
  }
}
