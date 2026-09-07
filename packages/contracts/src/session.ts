import {
  parseCampaignId,
  parseIntegrationConnectionId,
  parseSessionId,
  parseUserId,
  parseWorkspaceId,
  type CampaignId,
  type IntegrationConnectionId,
  type SessionId,
  type UserId,
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

export const SESSION_LIFECYCLE_STATES = [
  "draft",
  "connected",
  "collecting",
  "paused",
  "ended",
  "queued",
  "processing",
  "reviewReady",
  "published",
  "failed",
  "canceled"
] as const;

export const SESSION_SOURCE_PROVIDERS = ["foundry", "discord", "manual"] as const;
export const SESSION_SOURCE_RANGE_STATES = ["ready", "partial", "unavailable"] as const;
export const SESSION_LIFECYCLE_ACTOR_KINDS = ["user", "worker", "system"] as const;

export type SessionLifecycleState = (typeof SESSION_LIFECYCLE_STATES)[number];
export type SessionSourceProvider = (typeof SESSION_SOURCE_PROVIDERS)[number];
export type SessionSourceRangeState = (typeof SESSION_SOURCE_RANGE_STATES)[number];
export type SessionLifecycleActorKind = (typeof SESSION_LIFECYCLE_ACTOR_KINDS)[number];

export interface SessionSourceRangeContract {
  readonly provider: SessionSourceProvider;
  readonly connectionId: IntegrationConnectionId | null;
  readonly stream: string;
  readonly state: SessionSourceRangeState;
  readonly fromCursor: string | null;
  readonly toCursor: string | null;
  readonly schemaVersion: string;
  readonly adapterVersion: string;
  readonly warningCode: string | null;
}

export interface SessionProcessingContract {
  readonly processingVersion: number;
  readonly jobId: string | null;
  readonly attempt: number;
  readonly progressPercent: number;
  readonly costMicros: number;
  readonly latencyMs: number;
  readonly queuedAt: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly leaseExpiresAt: string | null;
  readonly safeErrorCode: string | null;
}

export interface SessionReviewSetRefContract {
  readonly processingVersion: number;
  readonly reviewSetId: string;
  readonly createdAt: string;
  readonly publishedAt: string | null;
}

export interface SessionLifecycleTransitionRecordContract {
  readonly sequence: number;
  readonly from: SessionLifecycleState;
  readonly to: SessionLifecycleState;
  readonly actorKind: SessionLifecycleActorKind;
  readonly actorId: string;
  readonly reasonCode: string;
  readonly occurredAt: string;
}

export interface UnifiedSessionLifecycleContract {
  readonly schemaVersion: "hed27-session-lifecycle-v1";
  readonly id: SessionId;
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly title: string;
  readonly scheduledAt: string | null;
  readonly status: SessionLifecycleState;
  readonly sourceRanges: readonly SessionSourceRangeContract[];
  readonly processing: SessionProcessingContract;
  readonly reviewSets: readonly SessionReviewSetRefContract[];
  readonly lifecycleRevision: number;
  readonly transitions: readonly SessionLifecycleTransitionRecordContract[];
  readonly createdBy: UserId;
  readonly updatedBy: UserId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const OPAQUE_CURSOR = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;
const SAFE_CODE = /^[A-Z][A-Z0-9_]{1,127}$/;
const CANONICAL_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_SOURCE_RANGES = 32;
const MAX_TRANSITIONS = 128;
const MAX_REVIEW_SETS = 64;

const ALLOWED_TRANSITIONS: Readonly<Record<SessionLifecycleState, readonly SessionLifecycleState[]>> = {
  draft: ["connected", "canceled"],
  connected: ["collecting", "ended", "canceled"],
  collecting: ["paused", "ended", "failed", "canceled"],
  paused: ["collecting", "ended", "failed", "canceled"],
  ended: ["queued", "canceled"],
  queued: ["processing", "canceled"],
  processing: ["reviewReady", "failed", "canceled"],
  reviewReady: ["published", "queued", "canceled"],
  published: [],
  failed: ["queued", "canceled"],
  canceled: []
};

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
  return STABLE_ID.test(id) ? id : fail(path, "expected a stable bounded identifier");
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

function parseNonNegativeInteger(value: unknown, path: string): number {
  const parsed = expectInteger(value, path);
  return parsed >= 0 ? parsed : fail(path, "must be non-negative");
}

function parsePercent(value: unknown, path: string): number {
  const parsed = parseNonNegativeInteger(value, path);
  return parsed <= 100 ? parsed : fail(path, "must be between 0 and 100");
}

function parseSourceRange(value: unknown, path: string): SessionSourceRangeContract {
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

  const provider = expectEnum(record["provider"], SESSION_SOURCE_PROVIDERS, `${path}.provider`);
  const connectionId = record["connectionId"] === null
    ? null
    : parseIntegrationConnectionId(record["connectionId"], `${path}.connectionId`);
  if (provider !== "manual" && connectionId === null) {
    fail(`${path}.connectionId`, `${provider} source ranges require an integration connection`);
  }
  if (provider === "manual" && connectionId !== null) {
    fail(`${path}.connectionId`, "manual source ranges cannot claim an integration connection");
  }

  const state = expectEnum(record["state"], SESSION_SOURCE_RANGE_STATES, `${path}.state`);
  const warningCode = parseNullableSafeCode(record["warningCode"], `${path}.warningCode`);
  if (state === "ready" && warningCode !== null) {
    fail(`${path}.warningCode`, "ready source ranges cannot carry a warning code");
  }
  if (state !== "ready" && warningCode === null) {
    fail(`${path}.warningCode`, `${state} source ranges require a safe warning code`);
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

function parseProcessing(value: unknown, path: string): SessionProcessingContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "processingVersion",
    "jobId",
    "attempt",
    "progressPercent",
    "costMicros",
    "latencyMs",
    "queuedAt",
    "startedAt",
    "completedAt",
    "leaseExpiresAt",
    "safeErrorCode"
  ], path);

  const queuedAt = parseNullableInstant(record["queuedAt"], `${path}.queuedAt`);
  const startedAt = parseNullableInstant(record["startedAt"], `${path}.startedAt`);
  const completedAt = parseNullableInstant(record["completedAt"], `${path}.completedAt`);
  const leaseExpiresAt = parseNullableInstant(record["leaseExpiresAt"], `${path}.leaseExpiresAt`);

  if (queuedAt && startedAt && Date.parse(startedAt) < Date.parse(queuedAt)) {
    fail(`${path}.startedAt`, "cannot precede queuedAt");
  }
  if (startedAt && completedAt && Date.parse(completedAt) < Date.parse(startedAt)) {
    fail(`${path}.completedAt`, "cannot precede startedAt");
  }
  if (startedAt && leaseExpiresAt && Date.parse(leaseExpiresAt) <= Date.parse(startedAt)) {
    fail(`${path}.leaseExpiresAt`, "must be after startedAt");
  }

  return {
    processingVersion: parseNonNegativeInteger(record["processingVersion"], `${path}.processingVersion`),
    jobId: parseNullableStableId(record["jobId"], `${path}.jobId`),
    attempt: parseNonNegativeInteger(record["attempt"], `${path}.attempt`),
    progressPercent: parsePercent(record["progressPercent"], `${path}.progressPercent`),
    costMicros: parseNonNegativeInteger(record["costMicros"], `${path}.costMicros`),
    latencyMs: parseNonNegativeInteger(record["latencyMs"], `${path}.latencyMs`),
    queuedAt,
    startedAt,
    completedAt,
    leaseExpiresAt,
    safeErrorCode: parseNullableSafeCode(record["safeErrorCode"], `${path}.safeErrorCode`)
  };
}

function parseReviewSet(value: unknown, path: string): SessionReviewSetRefContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, ["processingVersion", "reviewSetId", "createdAt", "publishedAt"], path);
  const processingVersion = parseNonNegativeInteger(record["processingVersion"], `${path}.processingVersion`);
  if (processingVersion < 1) fail(`${path}.processingVersion`, "review sets require processing version 1 or greater");
  const createdAt = parseCanonicalInstant(record["createdAt"], `${path}.createdAt`);
  const publishedAt = parseNullableInstant(record["publishedAt"], `${path}.publishedAt`);
  if (publishedAt && Date.parse(publishedAt) < Date.parse(createdAt)) {
    fail(`${path}.publishedAt`, "cannot precede createdAt");
  }
  return {
    processingVersion,
    reviewSetId: parseStableId(record["reviewSetId"], `${path}.reviewSetId`),
    createdAt,
    publishedAt
  };
}

function parseTransition(value: unknown, path: string): SessionLifecycleTransitionRecordContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, ["sequence", "from", "to", "actorKind", "actorId", "reasonCode", "occurredAt"], path);
  const from = expectEnum(record["from"], SESSION_LIFECYCLE_STATES, `${path}.from`);
  const to = expectEnum(record["to"], SESSION_LIFECYCLE_STATES, `${path}.to`);
  const actorKind = expectEnum(record["actorKind"], SESSION_LIFECYCLE_ACTOR_KINDS, `${path}.actorKind`);
  const actorId = actorKind === "user"
    ? parseUserId(record["actorId"], `${path}.actorId`)
    : parseStableId(record["actorId"], `${path}.actorId`);
  assertSessionLifecycleTransition(from, to, path);
  return {
    sequence: parseNonNegativeInteger(record["sequence"], `${path}.sequence`),
    from,
    to,
    actorKind,
    actorId,
    reasonCode: parseSafeCode(record["reasonCode"], `${path}.reasonCode`),
    occurredAt: parseCanonicalInstant(record["occurredAt"], `${path}.occurredAt`)
  };
}

export function canTransitionSessionLifecycle(
  from: SessionLifecycleState,
  to: SessionLifecycleState
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertSessionLifecycleTransition(
  from: SessionLifecycleState,
  to: SessionLifecycleState,
  path = "session.status"
): void {
  if (!canTransitionSessionLifecycle(from, to)) {
    fail(path, `transition ${from} -> ${to} is not allowed`);
  }
}

export function parseUnifiedSessionLifecycleContract(
  value: unknown,
  path = "session"
): UnifiedSessionLifecycleContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "id",
    "workspaceId",
    "campaignId",
    "title",
    "scheduledAt",
    "status",
    "sourceRanges",
    "processing",
    "reviewSets",
    "lifecycleRevision",
    "transitions",
    "createdBy",
    "updatedBy",
    "createdAt",
    "updatedAt"
  ], path);

  if (!Array.isArray(record["sourceRanges"]) || record["sourceRanges"].length > MAX_SOURCE_RANGES) {
    fail(`${path}.sourceRanges`, `expected an array with at most ${MAX_SOURCE_RANGES} source ranges`);
  }
  if (!Array.isArray(record["reviewSets"]) || record["reviewSets"].length > MAX_REVIEW_SETS) {
    fail(`${path}.reviewSets`, `expected an array with at most ${MAX_REVIEW_SETS} review sets`);
  }
  if (!Array.isArray(record["transitions"]) || record["transitions"].length > MAX_TRANSITIONS) {
    fail(`${path}.transitions`, `expected an array with at most ${MAX_TRANSITIONS} transitions`);
  }

  const status = expectEnum(record["status"], SESSION_LIFECYCLE_STATES, `${path}.status`);
  const sourceRanges = record["sourceRanges"].map((item, index) => parseSourceRange(item, `${path}.sourceRanges[${index}]`));
  const processing = parseProcessing(record["processing"], `${path}.processing`);
  const reviewSets = record["reviewSets"].map((item, index) => parseReviewSet(item, `${path}.reviewSets[${index}]`));
  const lifecycleRevision = parseNonNegativeInteger(record["lifecycleRevision"], `${path}.lifecycleRevision`);
  const transitions = record["transitions"].map((item, index) => parseTransition(item, `${path}.transitions[${index}]`));

  const sourceKeys = new Set<string>();
  for (const source of sourceRanges) {
    const key = `${source.provider}:${source.connectionId ?? "manual"}:${source.stream}`;
    if (sourceKeys.has(key)) fail(`${path}.sourceRanges`, `duplicate source range ${key}`);
    sourceKeys.add(key);
  }

  const reviewVersions = new Set<number>();
  for (const reviewSet of reviewSets) {
    if (reviewVersions.has(reviewSet.processingVersion)) {
      fail(`${path}.reviewSets`, `processing version ${reviewSet.processingVersion} has more than one review set`);
    }
    reviewVersions.add(reviewSet.processingVersion);
    if (reviewSet.processingVersion > processing.processingVersion) {
      fail(`${path}.reviewSets`, "review set cannot reference a future processing version");
    }
  }

  if (["queued", "processing", "reviewReady", "published", "failed"].includes(status)
    && processing.processingVersion < 1) {
    fail(`${path}.processing.processingVersion`, `${status} sessions require processing version 1 or greater`);
  }
  if (["reviewReady", "published"].includes(status)
    && !reviewVersions.has(processing.processingVersion)) {
    fail(`${path}.reviewSets`, `${status} sessions require exactly one review set for the current processing version`);
  }
  if (status === "published") {
    const currentReview = reviewSets.find((item) => item.processingVersion === processing.processingVersion);
    if (!currentReview?.publishedAt) {
      fail(`${path}.reviewSets`, "published sessions require the current review set to be marked published");
    }
  }

  transitions.forEach((transition, index) => {
    if (transition.sequence !== index + 1) {
      fail(`${path}.transitions[${index}].sequence`, "transition sequence must be contiguous and start at 1");
    }
    if (index > 0 && transitions[index - 1]?.to !== transition.from) {
      fail(`${path}.transitions[${index}].from`, "transition history must form one contiguous state chain");
    }
    if (index > 0 && Date.parse(transition.occurredAt) < Date.parse(transitions[index - 1]!.occurredAt)) {
      fail(`${path}.transitions[${index}].occurredAt`, "transition history cannot move backward in time");
    }
  });
  if (lifecycleRevision !== transitions.length) {
    fail(`${path}.lifecycleRevision`, "must equal the number of recorded lifecycle transitions");
  }
  if (transitions.length > 0 && transitions.at(-1)?.to !== status) {
    fail(`${path}.status`, "must equal the final transition target");
  }
  if (transitions.length === 0 && status !== "draft") {
    fail(`${path}.status`, "a session without lifecycle transitions must still be draft");
  }

  const createdAt = parseCanonicalInstant(record["createdAt"], `${path}.createdAt`);
  const updatedAt = parseCanonicalInstant(record["updatedAt"], `${path}.updatedAt`);
  if (Date.parse(updatedAt) < Date.parse(createdAt)) {
    fail(`${path}.updatedAt`, "cannot precede createdAt");
  }
  if (transitions.length > 0 && Date.parse(transitions.at(-1)!.occurredAt) > Date.parse(updatedAt)) {
    fail(`${path}.updatedAt`, "cannot precede the latest lifecycle transition");
  }

  return {
    schemaVersion: expectEnum(record["schemaVersion"], ["hed27-session-lifecycle-v1"] as const, `${path}.schemaVersion`),
    id: parseSessionId(record["id"], `${path}.id`),
    workspaceId: parseWorkspaceId(record["workspaceId"], `${path}.workspaceId`),
    campaignId: parseCampaignId(record["campaignId"], `${path}.campaignId`),
    title: expectString(record["title"], `${path}.title`),
    scheduledAt: parseNullableInstant(record["scheduledAt"], `${path}.scheduledAt`),
    status,
    sourceRanges,
    processing,
    reviewSets,
    lifecycleRevision,
    transitions,
    createdBy: parseUserId(record["createdBy"], `${path}.createdBy`),
    updatedBy: parseUserId(record["updatedBy"], `${path}.updatedBy`),
    createdAt,
    updatedAt
  };
}
