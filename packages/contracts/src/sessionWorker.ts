import {
  parseCampaignId,
  parseSessionId,
  parseWorkspaceId,
  type CampaignId,
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
export type SessionProcessingReportOutcome = (typeof SESSION_PROCESSING_REPORT_OUTCOMES)[number];

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

const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;
const SAFE_CODE = /^[A-Z][A-Z0-9_]{1,127}$/;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/;
const CANONICAL_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

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
