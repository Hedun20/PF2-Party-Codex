import {
  parseCampaignId,
  parseUserId,
  parseWorkspaceId,
  type CampaignId,
  type UserId,
  type WorkspaceId
} from "./ids.js";
import {
  expectBoolean,
  expectEnum,
  expectExactKeys,
  expectInteger,
  expectRecord,
  expectString,
  fail
} from "./validation.js";

export const JOB_TYPES = [
  "email.deliver",
  "import.commit",
  "evidence.normalize",
  "evidence.retention",
  "canon.propose",
  "ai.author",
  "achievement.evaluate",
  "notification.deliver",
  "export.build",
  "projection.rebuild"
] as const;
export const JOB_PRODUCERS = [
  "web",
  "legacyApi",
  "worker",
  "discordApi",
  "foundryApi"
] as const;
export const JOB_OUTCOMES = [
  "succeeded",
  "idempotentReplay",
  "retryScheduled",
  "terminalFailure",
  "cancelled"
] as const;

export type JobType = (typeof JOB_TYPES)[number];
export type JobProducer = (typeof JOB_PRODUCERS)[number];
export type JobOutcome = (typeof JOB_OUTCOMES)[number];

export interface AccountJobScopeContract {
  readonly kind: "account";
  readonly userId: UserId;
}

export interface CampaignJobScopeContract {
  readonly kind: "campaign";
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
}

export type JobScopeContract = AccountJobScopeContract | CampaignJobScopeContract;

export interface JobCommandHashInputContract {
  readonly schemaVersion: "hed18-job-v1";
  readonly jobId: string;
  readonly jobType: JobType;
  readonly producer: JobProducer;
  readonly scope: JobScopeContract;
  readonly payloadRef: string;
  readonly payloadHash: string;
  readonly idempotencyKey: string;
  readonly policyVersion: string;
  readonly retryPolicyVersion: string;
  readonly enqueuedAt: string;
  readonly notBefore: string;
  readonly traceId: string;
  readonly causationId: string | null;
}

export interface JobCommandRequestContract extends JobCommandHashInputContract {
  readonly requestHash: string;
}

export interface JobExecutionReportContract {
  readonly schemaVersion: "hed18-job-report-v1";
  readonly jobId: string;
  readonly jobType: JobType;
  readonly scope: JobScopeContract;
  readonly payloadHash: string;
  readonly workerId: string;
  readonly leaseVersion: number;
  readonly leaseTokenHash: string;
  readonly attempt: number;
  readonly outcome: JobOutcome;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly outputRef: string | null;
  readonly outputHash: string | null;
  readonly safeErrorCode: string | null;
  readonly retryAt: string | null;
  readonly idempotentReplay: boolean;
}

export interface ActiveJobLeaseContract {
  readonly schemaVersion: "hed18-job-lease-v1";
  readonly jobId: string;
  readonly workerId: string;
  readonly leaseVersion: number;
  readonly leaseTokenHash: string;
  readonly attempt: number;
  readonly claimedAt: string;
  readonly expiresAt: string;
}

export interface JobCommandVerificationContext {
  readonly producer: JobProducer;
  readonly evaluatedAt: string;
  readonly sha256: (canonicalUtf8: string) => string;
}

export interface JobExecutionVerificationContext {
  readonly command: unknown;
  readonly producer: JobProducer;
  readonly activeLease: unknown;
  readonly evaluatedAt: string;
  readonly sha256: (canonicalUtf8: string) => string;
}

const SHA256_HEX = /^[a-f0-9]{64}$/;
const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const INTERNAL_REF = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,511}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;
const SAFE_ERROR_CODE = /^[A-Z][A-Z0-9_]{1,127}$/;
const CANONICAL_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CAMPAIGN_ONLY_JOB_TYPES: ReadonlySet<JobType> = new Set([
  "import.commit",
  "evidence.normalize",
  "evidence.retention",
  "canon.propose",
  "ai.author",
  "achievement.evaluate",
  "notification.deliver",
  "export.build",
  "projection.rebuild"
]);

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

function parseSha256(value: unknown, path: string): string {
  const hash = expectString(value, path);
  return SHA256_HEX.test(hash) ? hash : fail(path, "expected a lowercase SHA-256 hex digest");
}

function parseStableId(value: unknown, path: string): string {
  const id = expectString(value, path);
  return STABLE_ID.test(id) ? id : fail(path, "expected a stable bounded identifier");
}

function parseInternalRef(value: unknown, path: string): string {
  const ref = expectString(value, path);
  const segments = ref.split("/");
  if (!INTERNAL_REF.test(ref)
    || segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return fail(path, "expected a normalized opaque internal reference without URI/query/fragment syntax");
  }
  return ref;
}

function parseIdempotencyKey(value: unknown, path: string): string {
  const key = expectString(value, path);
  return IDEMPOTENCY_KEY.test(key)
    ? key
    : fail(path, "expected a stable bounded idempotency key");
}

function parseSafeErrorCode(value: unknown, path: string): string {
  const code = expectString(value, path);
  return SAFE_ERROR_CODE.test(code) ? code : fail(path, "expected a stable safe error code");
}

function parseJobScope(value: unknown, path: string): JobScopeContract {
  const record = expectRecord(value, path);
  const kind = expectEnum(record["kind"], ["account", "campaign"] as const, `${path}.kind`);
  if (kind === "account") {
    expectExactKeys(record, ["kind", "userId"], path);
    return { kind, userId: parseUserId(record["userId"], `${path}.userId`) };
  }
  expectExactKeys(record, ["kind", "workspaceId", "campaignId"], path);
  return {
    kind,
    workspaceId: parseWorkspaceId(record["workspaceId"], `${path}.workspaceId`),
    campaignId: parseCampaignId(record["campaignId"], `${path}.campaignId`)
  };
}

function validateJobScope(jobType: JobType, scope: JobScopeContract, path: string): void {
  if (CAMPAIGN_ONLY_JOB_TYPES.has(jobType) && scope.kind !== "campaign") {
    fail(path, `${jobType} requires exact workspace and campaign scope`);
  }
}

function sameJobScope(left: JobScopeContract, right: JobScopeContract): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "account" && right.kind === "account") return left.userId === right.userId;
  return left.kind === "campaign"
    && right.kind === "campaign"
    && left.workspaceId === right.workspaceId
    && left.campaignId === right.campaignId;
}

function parseJobCommandHashInput(value: unknown, path: string): JobCommandHashInputContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "jobId",
    "jobType",
    "producer",
    "scope",
    "payloadRef",
    "payloadHash",
    "idempotencyKey",
    "policyVersion",
    "retryPolicyVersion",
    "enqueuedAt",
    "notBefore",
    "traceId",
    "causationId"
  ], path);
  const jobType = expectEnum(record["jobType"], JOB_TYPES, `${path}.jobType`);
  const producer = expectEnum(record["producer"], JOB_PRODUCERS, `${path}.producer`);
  const scope = parseJobScope(record["scope"], `${path}.scope`);
  validateJobScope(jobType, scope, `${path}.scope`);
  const enqueuedAt = parseCanonicalInstant(record["enqueuedAt"], `${path}.enqueuedAt`);
  const notBefore = parseCanonicalInstant(record["notBefore"], `${path}.notBefore`);
  if (Date.parse(notBefore) < Date.parse(enqueuedAt)) {
    fail(`${path}.notBefore`, "cannot precede enqueuedAt");
  }
  return {
    schemaVersion: expectEnum(record["schemaVersion"], ["hed18-job-v1"] as const, `${path}.schemaVersion`),
    jobId: parseStableId(record["jobId"], `${path}.jobId`),
    jobType,
    producer,
    scope,
    payloadRef: parseInternalRef(record["payloadRef"], `${path}.payloadRef`),
    payloadHash: parseSha256(record["payloadHash"], `${path}.payloadHash`),
    idempotencyKey: parseIdempotencyKey(record["idempotencyKey"], `${path}.idempotencyKey`),
    policyVersion: parseStableId(record["policyVersion"], `${path}.policyVersion`),
    retryPolicyVersion: parseStableId(record["retryPolicyVersion"], `${path}.retryPolicyVersion`),
    enqueuedAt,
    notBefore,
    traceId: parseStableId(record["traceId"], `${path}.traceId`),
    causationId: record["causationId"] === null
      ? null
      : parseStableId(record["causationId"], `${path}.causationId`)
  };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("jobRequest", "canonical numbers must be safe integers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = expectRecord(value, "jobRequest");
  return `{${Object.keys(record).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  )).join(",")}}`;
}

function canonicalJobRequestValue(input: JobCommandHashInputContract): unknown {
  return {
    schemaVersion: input.schemaVersion,
    jobType: input.jobType,
    producer: input.producer,
    scope: input.scope,
    payloadRef: input.payloadRef,
    payloadHash: input.payloadHash,
    idempotencyKey: input.idempotencyKey,
    policyVersion: input.policyVersion,
    retryPolicyVersion: input.retryPolicyVersion,
    notBefore: input.notBefore,
    causationId: input.causationId
  };
}

export function canonicalizeJobRequest(value: unknown): string {
  return canonicalJson(canonicalJobRequestValue(parseJobCommandHashInput(value, "jobRequest")));
}

export function computeJobRequestHash(
  value: unknown,
  sha256: (canonicalUtf8: string) => string
): string {
  if (typeof sha256 !== "function") fail("jobRequest.sha256", "trusted SHA-256 function is required");
  return parseSha256(sha256(canonicalizeJobRequest(value)), "jobRequest.hash");
}

export function parseJobCommandRequest(
  value: unknown,
  verification: JobCommandVerificationContext,
  path = "jobCommand"
): JobCommandRequestContract {
  const verificationRecord = expectRecord(verification, `${path}.verification`);
  expectExactKeys(verificationRecord, ["producer", "evaluatedAt", "sha256"], `${path}.verification`);
  const trustedProducer = expectEnum(
    verificationRecord["producer"],
    JOB_PRODUCERS,
    `${path}.verification.producer`
  );
  const evaluatedAt = parseCanonicalInstant(
    verificationRecord["evaluatedAt"],
    `${path}.verification.evaluatedAt`
  );
  const sha256Candidate = verificationRecord["sha256"];
  if (typeof sha256Candidate !== "function") {
    fail(`${path}.verification.sha256`, "trusted SHA-256 function is required");
  }
  const sha256 = sha256Candidate as (canonicalUtf8: string) => string;
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "jobId",
    "jobType",
    "producer",
    "scope",
    "payloadRef",
    "payloadHash",
    "requestHash",
    "idempotencyKey",
    "policyVersion",
    "retryPolicyVersion",
    "enqueuedAt",
    "notBefore",
    "traceId",
    "causationId"
  ], path);

  const hashInput = parseJobCommandHashInput({
    schemaVersion: record["schemaVersion"],
    jobId: record["jobId"],
    jobType: record["jobType"],
    producer: record["producer"],
    scope: record["scope"],
    payloadRef: record["payloadRef"],
    payloadHash: record["payloadHash"],
    idempotencyKey: record["idempotencyKey"],
    policyVersion: record["policyVersion"],
    retryPolicyVersion: record["retryPolicyVersion"],
    enqueuedAt: record["enqueuedAt"],
    notBefore: record["notBefore"],
    traceId: record["traceId"],
    causationId: record["causationId"]
  }, path);
  if (hashInput.producer !== trustedProducer) {
    fail(`${path}.producer`, "must match the authenticated platform adapter");
  }
  if (Date.parse(hashInput.enqueuedAt) > Date.parse(evaluatedAt)) {
    fail(`${path}.enqueuedAt`, "cannot be later than trusted enqueue evaluation time");
  }
  const requestHash = parseSha256(record["requestHash"], `${path}.requestHash`);
  if (requestHash !== computeJobRequestHash(hashInput, sha256)) {
    fail(`${path}.requestHash`, "must match the canonical replay-relevant request fields");
  }

  return {
    ...hashInput,
    requestHash
  };
}

export function parseActiveJobLease(
  value: unknown,
  path = "activeJobLease"
): ActiveJobLeaseContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "jobId",
    "workerId",
    "leaseVersion",
    "leaseTokenHash",
    "attempt",
    "claimedAt",
    "expiresAt"
  ], path);
  const leaseVersion = expectInteger(record["leaseVersion"], `${path}.leaseVersion`);
  if (leaseVersion <= 0) fail(`${path}.leaseVersion`, "must be greater than zero");
  const attempt = expectInteger(record["attempt"], `${path}.attempt`);
  if (attempt <= 0) fail(`${path}.attempt`, "must be greater than zero");
  const claimedAt = parseCanonicalInstant(record["claimedAt"], `${path}.claimedAt`);
  const expiresAt = parseCanonicalInstant(record["expiresAt"], `${path}.expiresAt`);
  if (Date.parse(expiresAt) <= Date.parse(claimedAt)) {
    fail(`${path}.expiresAt`, "must be later than claimedAt");
  }
  return {
    schemaVersion: expectEnum(
      record["schemaVersion"],
      ["hed18-job-lease-v1"] as const,
      `${path}.schemaVersion`
    ),
    jobId: parseStableId(record["jobId"], `${path}.jobId`),
    workerId: parseStableId(record["workerId"], `${path}.workerId`),
    leaseVersion,
    leaseTokenHash: parseSha256(record["leaseTokenHash"], `${path}.leaseTokenHash`),
    attempt,
    claimedAt,
    expiresAt
  };
}

export function parseJobExecutionReport(
  value: unknown,
  verification: JobExecutionVerificationContext,
  path = "jobReport"
): JobExecutionReportContract {
  const verificationRecord = expectRecord(verification, `${path}.verification`);
  expectExactKeys(
    verificationRecord,
    ["command", "producer", "activeLease", "evaluatedAt", "sha256"],
    `${path}.verification`
  );
  const evaluatedAt = parseCanonicalInstant(
    verificationRecord["evaluatedAt"],
    `${path}.verification.evaluatedAt`
  );
  const command = parseJobCommandRequest(
    verificationRecord["command"],
    {
      producer: expectEnum(
        verificationRecord["producer"],
        JOB_PRODUCERS,
        `${path}.verification.producer`
      ),
      evaluatedAt,
      sha256: verificationRecord["sha256"] as (canonicalUtf8: string) => string
    },
    `${path}.verification.command`
  );
  const activeLease = parseActiveJobLease(
    verificationRecord["activeLease"],
    `${path}.verification.activeLease`
  );
  if (activeLease.jobId !== command.jobId) {
    fail(`${path}.verification.activeLease.jobId`, "must match the verified command job ID");
  }
  if (Date.parse(activeLease.claimedAt) < Date.parse(command.notBefore)) {
    fail(`${path}.verification.activeLease.claimedAt`, "cannot precede the verified job notBefore time");
  }
  if (Date.parse(activeLease.claimedAt) > Date.parse(evaluatedAt)) {
    fail(`${path}.verification.activeLease.claimedAt`, "cannot be later than trusted result evaluation time");
  }
  if (Date.parse(evaluatedAt) >= Date.parse(activeLease.expiresAt)) {
    fail(`${path}.verification.activeLease.expiresAt`, "lease must still be active at result evaluation time");
  }
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "jobId",
    "jobType",
    "scope",
    "payloadHash",
    "workerId",
    "leaseVersion",
    "leaseTokenHash",
    "attempt",
    "outcome",
    "startedAt",
    "completedAt",
    "outputRef",
    "outputHash",
    "safeErrorCode",
    "retryAt",
    "idempotentReplay"
  ], path);

  const jobType = expectEnum(record["jobType"], JOB_TYPES, `${path}.jobType`);
  const scope = parseJobScope(record["scope"], `${path}.scope`);
  validateJobScope(jobType, scope, `${path}.scope`);
  const attempt = expectInteger(record["attempt"], `${path}.attempt`);
  if (attempt <= 0) fail(`${path}.attempt`, "must be greater than zero");
  const workerId = parseStableId(record["workerId"], `${path}.workerId`);
  const leaseVersion = expectInteger(record["leaseVersion"], `${path}.leaseVersion`);
  if (leaseVersion <= 0) fail(`${path}.leaseVersion`, "must be greater than zero");
  const leaseTokenHash = parseSha256(record["leaseTokenHash"], `${path}.leaseTokenHash`);
  const outcome = expectEnum(record["outcome"], JOB_OUTCOMES, `${path}.outcome`);
  const startedAt = parseCanonicalInstant(record["startedAt"], `${path}.startedAt`);
  const completedAt = parseCanonicalInstant(record["completedAt"], `${path}.completedAt`);
  if (Date.parse(completedAt) < Date.parse(startedAt)) {
    fail(`${path}.completedAt`, "cannot precede startedAt");
  }
  if (Date.parse(startedAt) < Date.parse(command.notBefore)) {
    fail(`${path}.startedAt`, "cannot precede the verified job notBefore time");
  }
  if (Date.parse(startedAt) < Date.parse(activeLease.claimedAt)) {
    fail(`${path}.startedAt`, "cannot precede the active lease claim");
  }
  if (Date.parse(completedAt) > Date.parse(evaluatedAt)) {
    fail(`${path}.completedAt`, "cannot be later than trusted result evaluation time");
  }
  const outputRef = record["outputRef"] === null
    ? null
    : parseInternalRef(record["outputRef"], `${path}.outputRef`);
  const outputHash = record["outputHash"] === null
    ? null
    : parseSha256(record["outputHash"], `${path}.outputHash`);
  if ((outputRef === null) !== (outputHash === null)) {
    fail(path, "outputRef and outputHash must be present or absent together");
  }
  const safeErrorCode = record["safeErrorCode"] === null
    ? null
    : parseSafeErrorCode(record["safeErrorCode"], `${path}.safeErrorCode`);
  const retryAt = record["retryAt"] === null
    ? null
    : parseCanonicalInstant(record["retryAt"], `${path}.retryAt`);
  const idempotentReplay = expectBoolean(record["idempotentReplay"], `${path}.idempotentReplay`);

  if (outcome === "retryScheduled") {
    if (safeErrorCode === null || retryAt === null) {
      fail(path, "retryScheduled requires a safe error code and retryAt");
    }
    if (Date.parse(retryAt) <= Date.parse(completedAt)) {
      fail(`${path}.retryAt`, "must be later than completedAt");
    }
  } else if (retryAt !== null) {
    fail(`${path}.retryAt`, "is valid only for retryScheduled");
  }

  if (["terminalFailure", "cancelled"].includes(outcome) && safeErrorCode === null) {
    fail(`${path}.safeErrorCode`, `${outcome} requires a safe error code`);
  }
  if (["succeeded", "idempotentReplay"].includes(outcome) && safeErrorCode !== null) {
    fail(`${path}.safeErrorCode`, `${outcome} cannot carry an error`);
  }
  if (["retryScheduled", "terminalFailure", "cancelled"].includes(outcome) && outputRef !== null) {
    fail(`${path}.outputRef`, `${outcome} cannot claim an output`);
  }
  if (idempotentReplay !== (outcome === "idempotentReplay")) {
    fail(`${path}.idempotentReplay`, "must match the idempotentReplay outcome exactly");
  }
  const jobId = parseStableId(record["jobId"], `${path}.jobId`);
  const payloadHash = parseSha256(record["payloadHash"], `${path}.payloadHash`);
  if (jobId !== command.jobId
    || jobType !== command.jobType
    || payloadHash !== command.payloadHash
    || !sameJobScope(scope, command.scope)) {
    fail(path, "must match the verified job ID, type, scope and payload hash");
  }
  if (workerId !== activeLease.workerId
    || leaseVersion !== activeLease.leaseVersion
    || leaseTokenHash !== activeLease.leaseTokenHash
    || attempt !== activeLease.attempt) {
    fail(path, "must match the trusted active worker lease, version, token proof and attempt");
  }

  return {
    schemaVersion: expectEnum(
      record["schemaVersion"],
      ["hed18-job-report-v1"] as const,
      `${path}.schemaVersion`
    ),
    jobId,
    jobType,
    scope,
    payloadHash,
    workerId,
    leaseVersion,
    leaseTokenHash,
    attempt,
    outcome,
    startedAt,
    completedAt,
    outputRef,
    outputHash,
    safeErrorCode,
    retryAt,
    idempotentReplay
  };
}
