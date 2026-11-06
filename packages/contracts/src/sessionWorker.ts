import {
  parseCampaignId,
  parseIntegrationConnectionId,
  parseSessionId,
  parseWorkspaceId,
  type CampaignId,
  type IntegrationConnectionId,
  type SessionId,
  type WorkspaceId
} from "./ids.js";
import {
  expectEnum,
  expectExactKeys,
  expectInteger,
  expectRecord,
  expectString,
  fail
} from "./validation.js";

export const SESSION_PROCESSING_REPORT_OUTCOMES = ["progress", "reviewReady", "failed"] as const;
export const SESSION_PROCESSING_SOURCE_PROVIDERS = ["foundry", "discord", "manual"] as const;
export const SESSION_PROCESSING_SOURCE_STATES = ["ready", "partial", "unavailable"] as const;

export type SessionProcessingReportOutcome = (typeof SESSION_PROCESSING_REPORT_OUTCOMES)[number];
export type SessionProcessingSourceProvider = (typeof SESSION_PROCESSING_SOURCE_PROVIDERS)[number];
export type SessionProcessingSourceState = (typeof SESSION_PROCESSING_SOURCE_STATES)[number];

export interface SessionProcessingSourceRangeContract {
  readonly provider: SessionProcessingSourceProvider;
  readonly connectionId: IntegrationConnectionId | null;
  readonly stream: string;
  readonly state: SessionProcessingSourceState;
  readonly fromCursor: string | null;
  readonly toCursor: string | null;
  readonly schemaVersion: string;
  readonly adapterVersion: string;
  readonly warningCode: string | null;
}

export interface SessionProcessingSourceSnapshotContract {
  readonly schemaVersion: "hed27-session-source-snapshot-v1";
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly sessionId: SessionId;
  readonly processingVersion: number;
  readonly capturedAt: string;
  readonly sources: readonly SessionProcessingSourceRangeContract[];
}

export interface SessionProcessingRequestContract {
  readonly schemaVersion: "hed27-session-processing-request-v1";
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly sessionId: SessionId;
  readonly processingVersion: number;
  readonly sourceSnapshotRef: string;
  readonly sourceSnapshotHash: string;
  readonly policyVersion: string;
  readonly requestedAt: string;
}

export interface SessionProcessingReportContract {
  readonly schemaVersion: "hed27-session-processing-report-v1";
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly sessionId: SessionId;
  readonly processingVersion: number;
  readonly jobId: string;
  readonly attempt: number;
  readonly outcome: SessionProcessingReportOutcome;
  readonly progressPercent: number;
  readonly leaseExpiresAt: string | null;
  readonly reviewSetId: string | null;
  readonly costMicros: number;
  readonly latencyMs: number;
  readonly safeErrorCode: string | null;
  readonly occurredAt: string;
}

export interface SessionProcessingSourceSnapshotVerificationContext {
  readonly request: unknown;
  readonly sha256: (canonicalUtf8: string) => string;
}

const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;
const SAFE_CODE = /^[A-Z][A-Z0-9_]{1,127}$/;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/;
const OPAQUE_CURSOR = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;
const CANONICAL_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_SOURCE_RANGES = 32;

function parseCanonicalInstant(value: unknown, path: string): string {
  const instant = expectString(value, path);
  const parsed = Date.parse(instant);
  if (!CANONICAL_INSTANT.test(instant)
    || !Number.isFinite(parsed)
    || new Date(parsed).toISOString() !== instant) {
    return fail(path, "expected a canonical UTC instant");
  }
  return instant;
}

function parseNullableInstant(value: unknown, path: string): string | null {
  return value === null ? null : parseCanonicalInstant(value, path);
}

function parseStableId(value: unknown, path: string): string {
  const id = expectString(value, path);
  return STABLE_ID.test(id) ? id : fail(path, "expected a bounded stable identifier");
}

function parseNullableStableId(value: unknown, path: string): string | null {
  return value === null ? null : parseStableId(value, path);
}

function parseNullableCursor(value: unknown, path: string): string | null {
  if (value === null) return null;
  const cursor = expectString(value, path);
  return OPAQUE_CURSOR.test(cursor)
    ? cursor
    : fail(path, "expected a bounded opaque source cursor");
}

function parseSafeCode(value: unknown, path: string): string {
  const code = expectString(value, path);
  return SAFE_CODE.test(code) ? code : fail(path, "expected a stable safe code");
}

function parseNullableSafeCode(value: unknown, path: string): string | null {
  return value === null ? null : parseSafeCode(value, path);
}

function parsePositiveInteger(value: unknown, path: string): number {
  const parsed = expectInteger(value, path);
  return parsed >= 1 ? parsed : fail(path, "must be at least 1");
}

function parseNonNegativeInteger(value: unknown, path: string): number {
  const parsed = expectInteger(value, path);
  return parsed >= 0 ? parsed : fail(path, "must be non-negative");
}

function parsePercent(value: unknown, path: string): number {
  const parsed = parseNonNegativeInteger(value, path);
  return parsed <= 100 ? parsed : fail(path, "must be between 0 and 100");
}

function parseSourceRange(value: unknown, path: string): SessionProcessingSourceRangeContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "provider",
    "connectionId",
    "stream",
    "state",
    "fromCursor",
    "toCursor",
    "schemaVersion",
    "adapterVersion",
    "warningCode"
  ], path);

  const provider = expectEnum(record["provider"], SESSION_PROCESSING_SOURCE_PROVIDERS, `${path}.provider`);
  const connectionId = record["connectionId"] === null
    ? null
    : parseIntegrationConnectionId(record["connectionId"], `${path}.connectionId`);
  if (provider === "manual" && connectionId !== null) {
    fail(`${path}.connectionId`, "manual source snapshots cannot claim an integration connection");
  }
  if (provider !== "manual" && connectionId === null) {
    fail(`${path}.connectionId`, `${provider} source snapshots require an integration connection`);
  }

  const state = expectEnum(record["state"], SESSION_PROCESSING_SOURCE_STATES, `${path}.state`);
  const warningCode = parseNullableSafeCode(record["warningCode"], `${path}.warningCode`);
  if (state === "ready" && warningCode !== null) {
    fail(`${path}.warningCode`, "ready source snapshots cannot carry a warning code");
  }
  if (state !== "ready" && warningCode === null) {
    fail(`${path}.warningCode`, `${state} source snapshots require a safe warning code`);
  }

  return {
    provider,
    connectionId,
    stream: parseStableId(record["stream"], `${path}.stream`),
    state,
    fromCursor: parseNullableCursor(record["fromCursor"], `${path}.fromCursor`),
    toCursor: parseNullableCursor(record["toCursor"], `${path}.toCursor`),
    schemaVersion: parseStableId(record["schemaVersion"], `${path}.schemaVersion`),
    adapterVersion: parseStableId(record["adapterVersion"], `${path}.adapterVersion`),
    warningCode
  };
}

export function parseSessionProcessingSourceSnapshotContract(
  value: unknown,
  path = "sessionProcessingSourceSnapshot"
): SessionProcessingSourceSnapshotContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "workspaceId",
    "campaignId",
    "sessionId",
    "processingVersion",
    "capturedAt",
    "sources"
  ], path);

  if (!Array.isArray(record["sources"]) || record["sources"].length < 1 || record["sources"].length > MAX_SOURCE_RANGES) {
    fail(`${path}.sources`, `expected between 1 and ${MAX_SOURCE_RANGES} source ranges`);
  }
  const sources = record["sources"].map((item, index) => parseSourceRange(item, `${path}.sources[${index}]`));
  const sourceKeys = new Set<string>();
  for (const source of sources) {
    const key = `${source.provider}:${source.connectionId ?? "manual"}:${source.stream}`;
    if (sourceKeys.has(key)) fail(`${path}.sources`, `duplicate source range ${key}`);
    sourceKeys.add(key);
  }

  return {
    schemaVersion: expectEnum(record["schemaVersion"], ["hed27-session-source-snapshot-v1"] as const, `${path}.schemaVersion`),
    workspaceId: parseWorkspaceId(record["workspaceId"], `${path}.workspaceId`),
    campaignId: parseCampaignId(record["campaignId"], `${path}.campaignId`),
    sessionId: parseSessionId(record["sessionId"], `${path}.sessionId`),
    processingVersion: parsePositiveInteger(record["processingVersion"], `${path}.processingVersion`),
    capturedAt: parseCanonicalInstant(record["capturedAt"], `${path}.capturedAt`),
    sources
  };
}

function sourceSortKey(source: SessionProcessingSourceRangeContract): string {
  return `${source.provider}:${source.connectionId ?? "manual"}:${source.stream}`;
}

export function canonicalSessionProcessingSourceSnapshot(value: unknown): string {
  const snapshot = parseSessionProcessingSourceSnapshotContract(value);
  const sources = [...snapshot.sources]
    .sort((left, right) => sourceSortKey(left).localeCompare(sourceSortKey(right)))
    .map((source) => ({
      provider: source.provider,
      connectionId: source.connectionId,
      stream: source.stream,
      state: source.state,
      fromCursor: source.fromCursor,
      toCursor: source.toCursor,
      schemaVersion: source.schemaVersion,
      adapterVersion: source.adapterVersion,
      warningCode: source.warningCode
    }));
  return JSON.stringify({
    schemaVersion: snapshot.schemaVersion,
    workspaceId: snapshot.workspaceId,
    campaignId: snapshot.campaignId,
    sessionId: snapshot.sessionId,
    processingVersion: snapshot.processingVersion,
    capturedAt: snapshot.capturedAt,
    sources
  });
}

export function parseSessionProcessingRequestContract(
  value: unknown,
  path = "sessionProcessingRequest"
): SessionProcessingRequestContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "workspaceId",
    "campaignId",
    "sessionId",
    "processingVersion",
    "sourceSnapshotRef",
    "sourceSnapshotHash",
    "policyVersion",
    "requestedAt"
  ], path);

  const hash = expectString(record["sourceSnapshotHash"], `${path}.sourceSnapshotHash`);
  if (!LOWERCASE_SHA256.test(hash)) {
    fail(`${path}.sourceSnapshotHash`, "expected lowercase SHA-256");
  }

  return {
    schemaVersion: expectEnum(record["schemaVersion"], ["hed27-session-processing-request-v1"] as const, `${path}.schemaVersion`),
    workspaceId: parseWorkspaceId(record["workspaceId"], `${path}.workspaceId`),
    campaignId: parseCampaignId(record["campaignId"], `${path}.campaignId`),
    sessionId: parseSessionId(record["sessionId"], `${path}.sessionId`),
    processingVersion: parsePositiveInteger(record["processingVersion"], `${path}.processingVersion`),
    sourceSnapshotRef: parseStableId(record["sourceSnapshotRef"], `${path}.sourceSnapshotRef`),
    sourceSnapshotHash: hash,
    policyVersion: parseStableId(record["policyVersion"], `${path}.policyVersion`),
    requestedAt: parseCanonicalInstant(record["requestedAt"], `${path}.requestedAt`)
  };
}

export function verifySessionProcessingSourceSnapshot(
  value: unknown,
  context: SessionProcessingSourceSnapshotVerificationContext,
  path = "sessionProcessingSourceSnapshot"
): SessionProcessingSourceSnapshotContract {
  const request = parseSessionProcessingRequestContract(context.request, `${path}.request`);
  const snapshot = parseSessionProcessingSourceSnapshotContract(value, path);
  if (snapshot.workspaceId !== request.workspaceId
    || snapshot.campaignId !== request.campaignId
    || snapshot.sessionId !== request.sessionId
    || snapshot.processingVersion !== request.processingVersion) {
    fail(path, "source snapshot scope or processing version does not match the processing request");
  }
  if (Date.parse(snapshot.capturedAt) > Date.parse(request.requestedAt)) {
    fail(`${path}.capturedAt`, "source snapshot cannot be captured after the processing request");
  }
  const computedHash = context.sha256(canonicalSessionProcessingSourceSnapshot(snapshot));
  if (!LOWERCASE_SHA256.test(computedHash)) {
    fail(`${path}.hash`, "trusted SHA-256 port returned a non-canonical digest");
  }
  if (computedHash !== request.sourceSnapshotHash) {
    fail(`${path}.hash`, "source snapshot hash does not match the processing request");
  }
  return snapshot;
}

export function parseSessionProcessingReportContract(
  value: unknown,
  path = "sessionProcessingReport"
): SessionProcessingReportContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "workspaceId",
    "campaignId",
    "sessionId",
    "processingVersion",
    "jobId",
    "attempt",
    "outcome",
    "progressPercent",
    "leaseExpiresAt",
    "reviewSetId",
    "costMicros",
    "latencyMs",
    "safeErrorCode",
    "occurredAt"
  ], path);

  const outcome = expectEnum(record["outcome"], SESSION_PROCESSING_REPORT_OUTCOMES, `${path}.outcome`);
  const progressPercent = parsePercent(record["progressPercent"], `${path}.progressPercent`);
  const leaseExpiresAt = parseNullableInstant(record["leaseExpiresAt"], `${path}.leaseExpiresAt`);
  const reviewSetId = parseNullableStableId(record["reviewSetId"], `${path}.reviewSetId`);
  const safeErrorCode = parseNullableSafeCode(record["safeErrorCode"], `${path}.safeErrorCode`);
  const occurredAt = parseCanonicalInstant(record["occurredAt"], `${path}.occurredAt`);

  if (outcome === "progress") {
    if (progressPercent >= 100) fail(`${path}.progressPercent`, "progress reports must remain below 100 until reviewReady");
    if (!leaseExpiresAt) fail(`${path}.leaseExpiresAt`, "progress reports require a live worker lease");
    if (Date.parse(leaseExpiresAt) <= Date.parse(occurredAt)) {
      fail(`${path}.leaseExpiresAt`, "progress lease must expire after the report time");
    }
    if (reviewSetId !== null) fail(`${path}.reviewSetId`, "progress reports cannot create a review set");
    if (safeErrorCode !== null) fail(`${path}.safeErrorCode`, "progress reports cannot carry a failure code");
  }

  if (outcome === "reviewReady") {
    if (progressPercent !== 100) fail(`${path}.progressPercent`, "reviewReady reports require 100 percent progress");
    if (leaseExpiresAt !== null) fail(`${path}.leaseExpiresAt`, "reviewReady reports close the worker lease");
    if (!reviewSetId) fail(`${path}.reviewSetId`, "reviewReady reports require a review set id");
    if (safeErrorCode !== null) fail(`${path}.safeErrorCode`, "reviewReady reports cannot carry a failure code");
  }

  if (outcome === "failed") {
    if (leaseExpiresAt !== null) fail(`${path}.leaseExpiresAt`, "failed reports close the worker lease");
    if (reviewSetId !== null) fail(`${path}.reviewSetId`, "failed reports cannot create a review set");
    if (!safeErrorCode) fail(`${path}.safeErrorCode`, "failed reports require a safe failure code");
  }

  return {
    schemaVersion: expectEnum(record["schemaVersion"], ["hed27-session-processing-report-v1"] as const, `${path}.schemaVersion`),
    workspaceId: parseWorkspaceId(record["workspaceId"], `${path}.workspaceId`),
    campaignId: parseCampaignId(record["campaignId"], `${path}.campaignId`),
    sessionId: parseSessionId(record["sessionId"], `${path}.sessionId`),
    processingVersion: parsePositiveInteger(record["processingVersion"], `${path}.processingVersion`),
    jobId: parseStableId(record["jobId"], `${path}.jobId`),
    attempt: parsePositiveInteger(record["attempt"], `${path}.attempt`),
    outcome,
    progressPercent,
    leaseExpiresAt,
    reviewSetId,
    costMicros: parseNonNegativeInteger(record["costMicros"], `${path}.costMicros`),
    latencyMs: parseNonNegativeInteger(record["latencyMs"], `${path}.latencyMs`),
    safeErrorCode,
    occurredAt
  };
}
