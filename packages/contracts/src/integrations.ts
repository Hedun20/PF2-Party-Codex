import {
  parseCampaignId,
  parseIntegrationConnectionId,
  parseIntegrationEventId,
  parseSessionId,
  parseWorkspaceId,
  parseWorldId,
  type CampaignId,
  type IntegrationConnectionId,
  type IntegrationEventId,
  type SessionId,
  type WorkspaceId,
  type WorldId
} from "./ids.js";
import { MACHINE_CREDENTIAL_STATES, type MachineCredentialState } from "./policy.js";
import {
  expectEnum,
  expectExactKeys,
  expectInteger,
  expectJsonObject,
  expectRecord,
  expectString,
  fail,
  isForbiddenKey,
  type JsonObject,
  type JsonValue,
  type UnknownRecord
} from "./validation.js";

export const INTEGRATION_PROVIDERS = ["foundry", "discord", "transcript", "manualImport"] as const;
export const INTEGRATION_CONNECTION_STATES = ["pending", "active", "paused", "revoked"] as const;
export const INTEGRATION_CAPABILITIES = ["events:ingest", "events:replay", "health:write"] as const;
export const INTEGRATION_ACTOR_KINDS = ["system", "user", "character", "unknown"] as const;
export const INTEGRATION_VISIBILITY_CLASSES = [
  "restricted",
  "managerOnly",
  "participantScoped"
] as const;
export const INTEGRATION_EVENT_TYPES = [
  "chat.message.created",
  "chat.message.updated",
  "chat.message.deleted",
  "roll.created",
  "combat.started",
  "combat.updated",
  "combat.ended",
  "scene.activated",
  "actor.observed",
  "session.note.created",
  "transcript.segment.created",
  "transcript.segment.updated",
  "transcript.segment.deleted",
  "source.deleted"
] as const;
export const INTEGRATION_RECEIPT_OUTCOMES = ["accepted", "quarantined"] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];
export type IntegrationConnectionState = (typeof INTEGRATION_CONNECTION_STATES)[number];
export type IntegrationCapability = (typeof INTEGRATION_CAPABILITIES)[number];
export type IntegrationActorKind = (typeof INTEGRATION_ACTOR_KINDS)[number];
export type IntegrationVisibilityClass = (typeof INTEGRATION_VISIBILITY_CLASSES)[number];
export type IntegrationEventType = (typeof INTEGRATION_EVENT_TYPES)[number];
export type IntegrationReceiptOutcome = (typeof INTEGRATION_RECEIPT_OUTCOMES)[number];

export const INTEGRATION_EVENT_TYPES_BY_PROVIDER: Readonly<
  Record<IntegrationProvider, readonly IntegrationEventType[]>
> = {
  foundry: [
    "chat.message.created",
    "chat.message.updated",
    "chat.message.deleted",
    "roll.created",
    "combat.started",
    "combat.updated",
    "combat.ended",
    "scene.activated",
    "actor.observed",
    "source.deleted"
  ],
  discord: [
    "chat.message.created",
    "chat.message.updated",
    "chat.message.deleted",
    "source.deleted"
  ],
  transcript: [
    "transcript.segment.created",
    "transcript.segment.updated",
    "transcript.segment.deleted",
    "source.deleted"
  ],
  manualImport: ["session.note.created", "source.deleted"]
};

export interface IntegrationConnectionContract {
  readonly schemaVersion: "hed56-connection-v1";
  readonly connectionId: IntegrationConnectionId;
  readonly provider: IntegrationProvider;
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly worldId: WorldId | null;
  readonly externalInstanceId: string;
  readonly state: IntegrationConnectionState;
  readonly credentialState: MachineCredentialState;
  readonly credentialVersion: string;
  readonly credentialExpiresAt: string | null;
  readonly capabilities: readonly IntegrationCapability[];
  readonly allowedStreams: readonly string[];
  readonly adapterVersion: string;
  readonly retentionPolicyVersion: string;
  readonly exportPolicyVersion: string;
  readonly deletionPolicyVersion: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly revokedAt: string | null;
}

export interface IntegrationActorContract {
  readonly kind: IntegrationActorKind;
  readonly sourceActorId: string | null;
  readonly displayName: string | null;
}

export interface IntegrationVisibilityContract {
  readonly classification: IntegrationVisibilityClass;
  readonly sourceActorIds: readonly string[];
}

export interface NormalizedIntegrationEventHashInputContract {
  readonly schemaVersion: "hed56-event-v1";
  readonly eventId: IntegrationEventId;
  readonly provider: IntegrationProvider;
  readonly connectionId: IntegrationConnectionId;
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly worldId: WorldId | null;
  readonly sessionId: SessionId | null;
  readonly stream: string;
  readonly sourceDocumentId: string | null;
  readonly sourceEventId: string;
  readonly sourceEventVersion: string;
  readonly sequence: string;
  readonly occurredAt: string;
  readonly receivedAt: string;
  readonly actor: IntegrationActorContract;
  readonly speaker: IntegrationActorContract | null;
  readonly type: IntegrationEventType;
  readonly visibility: IntegrationVisibilityContract;
  readonly payload: JsonObject;
  readonly adapterVersion: string;
  readonly traceId: string;
  readonly causationId: string | null;
}

export interface NormalizedIntegrationEventContract
  extends NormalizedIntegrationEventHashInputContract {
  readonly checksum: string;
}

export interface IntegrationEventVerificationContext {
  readonly connection: unknown;
  readonly eventId: IntegrationEventId;
  readonly sessionId: SessionId | null;
  readonly receivedAt: string;
  readonly evaluatedAt: string;
  readonly maxClockSkewMs: number;
  readonly sha256: (canonicalUtf8: string) => string;
}

export interface IntegrationIngestionCursorContract {
  readonly schemaVersion: "hed56-cursor-v1";
  readonly connectionId: IntegrationConnectionId;
  readonly stream: string;
  readonly lastSequence: string;
  readonly lastSourceEventId: string;
  readonly lastEventChecksum: string;
  readonly version: number;
  readonly updatedAt: string;
}

export interface IntegrationIngestionReceiptContract {
  readonly schemaVersion: "hed56-receipt-v1";
  readonly receiptId: string;
  readonly connectionId: IntegrationConnectionId;
  readonly idempotencyKey: string;
  readonly eventId: IntegrationEventId;
  readonly eventChecksum: string;
  readonly stream: string;
  readonly sequence: string;
  readonly outcome: IntegrationReceiptOutcome;
  readonly evidenceRef: string | null;
  readonly safeCode: string | null;
  readonly replayCount: number;
  readonly createdAt: string;
  readonly lastSeenAt: string;
  readonly purgeAt: string;
}

const SHA256_HEX = /^[a-f0-9]{64}$/;
const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const INTERNAL_REF = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,511}$/;
const SAFE_CODE = /^[A-Z][A-Z0-9_]{1,127}$/;
const CANONICAL_SEQUENCE = /^(?:0|[1-9][0-9]{0,39})$/;
const CANONICAL_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_PAYLOAD_BYTES = 65_536;
const MAX_LIST_ITEMS = 64;
const SECRET_PAYLOAD_KEYS: ReadonlySet<string> = new Set([
  "password",
  "token",
  "accessToken",
  "authToken",
  "refreshToken",
  "authorization",
  "cookie",
  "secret",
  "clientSecret",
  "webhookSecret",
  "credential",
  "apiKey",
  "privateKey",
  "passwordHash",
  "sessionSecret"
]);

function parseCanonicalInstant(value: unknown, path: string): string {
  const instant = expectString(value, path);
  const parsed = Date.parse(instant);
  if (
    !CANONICAL_INSTANT.test(instant) ||
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString() !== instant
  ) {
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

function parseStableConnectionId(value: unknown, path: string): IntegrationConnectionId {
  return parseIntegrationConnectionId(parseStableId(value, path), path);
}

function parseStableEventId(value: unknown, path: string): IntegrationEventId {
  return parseIntegrationEventId(parseStableId(value, path), path);
}

function parseStableWorkspaceId(value: unknown, path: string): WorkspaceId {
  return parseWorkspaceId(parseStableId(value, path), path);
}

function parseStableCampaignId(value: unknown, path: string): CampaignId {
  return parseCampaignId(parseStableId(value, path), path);
}

function parseSha256(value: unknown, path: string): string {
  const hash = expectString(value, path);
  return SHA256_HEX.test(hash) ? hash : fail(path, "expected a lowercase SHA-256 hex digest");
}

function parseSequence(value: unknown, path: string): string {
  const sequence = expectString(value, path);
  return CANONICAL_SEQUENCE.test(sequence)
    ? sequence
    : fail(path, "expected a canonical non-negative decimal sequence");
}

function parseInternalRef(value: unknown, path: string): string {
  const ref = expectString(value, path);
  const segments = ref.split("/");
  if (
    !INTERNAL_REF.test(ref) ||
    segments.some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    return fail(path, "expected a normalized opaque internal reference");
  }
  return ref;
}

function parseSafeCode(value: unknown, path: string): string {
  const code = expectString(value, path);
  return SAFE_CODE.test(code) ? code : fail(path, "expected a stable safe code");
}

function parseStableList(value: unknown, path: string, requireNonEmpty: boolean): string[] {
  if (!Array.isArray(value)) fail(path, "expected an array");
  if (value.length > MAX_LIST_ITEMS) fail(path, `must contain at most ${MAX_LIST_ITEMS} items`);
  if (requireNonEmpty && value.length === 0) fail(path, "must not be empty");
  const parsed = value.map((item, index) => parseStableId(item, `${path}[${index}]`));
  if (new Set(parsed).size !== parsed.length) fail(path, "must not contain duplicates");
  const sorted = [...parsed].sort();
  if (parsed.some((item, index) => item !== sorted[index])) {
    fail(path, "must be sorted lexicographically");
  }
  return parsed;
}

function parseCapabilityList(value: unknown, path: string): IntegrationCapability[] {
  if (!Array.isArray(value)) fail(path, "expected an array");
  if (value.length > INTEGRATION_CAPABILITIES.length) fail(path, "contains too many capabilities");
  const parsed = value.map((item, index) =>
    expectEnum(item, INTEGRATION_CAPABILITIES, `${path}[${index}]`)
  );
  if (new Set(parsed).size !== parsed.length) fail(path, "must not contain duplicates");
  const sorted = [...parsed].sort();
  if (parsed.some((item, index) => item !== sorted[index])) {
    fail(path, "must be sorted lexicographically");
  }
  return parsed;
}

function parseNullableWorldId(value: unknown, path: string): WorldId | null {
  return value === null ? null : parseWorldId(parseStableId(value, path), path);
}

function parseNullableSessionId(value: unknown, path: string): SessionId | null {
  return value === null ? null : parseSessionId(parseStableId(value, path), path);
}

function sameNullableId(left: string | null, right: string | null): boolean {
  return left === right;
}

function parseActor(value: unknown, path: string): IntegrationActorContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, ["kind", "sourceActorId", "displayName"], path);
  const displayName =
    record["displayName"] === null
      ? null
      : expectString(record["displayName"], `${path}.displayName`);
  if (displayName !== null && (displayName.length > 128 || /[\r\n\0]/.test(displayName))) {
    fail(`${path}.displayName`, "must be bounded single-line text");
  }
  return {
    kind: expectEnum(record["kind"], INTEGRATION_ACTOR_KINDS, `${path}.kind`),
    sourceActorId: parseNullableStableId(record["sourceActorId"], `${path}.sourceActorId`),
    displayName
  };
}

function parseNullableActor(value: unknown, path: string): IntegrationActorContract | null {
  return value === null ? null : parseActor(value, path);
}

function parseVisibility(value: unknown, path: string): IntegrationVisibilityContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, ["classification", "sourceActorIds"], path);
  const classification = expectEnum(
    record["classification"],
    INTEGRATION_VISIBILITY_CLASSES,
    `${path}.classification`
  );
  const sourceActorIds = parseStableList(
    record["sourceActorIds"],
    `${path}.sourceActorIds`,
    classification === "participantScoped"
  );
  if (classification !== "participantScoped" && sourceActorIds.length !== 0) {
    fail(`${path}.sourceActorIds`, "are allowed only for participantScoped evidence");
  }
  return { classification, sourceActorIds };
}

function rejectSecretPayloadKeys(value: unknown, path: string): void {
  const seen = new WeakSet<object>();
  function visit(item: unknown, itemPath: string): void {
    if (typeof item !== "object" || item === null || seen.has(item)) return;
    seen.add(item);
    if (Array.isArray(item)) {
      item.forEach((child, index) => {
        visit(child, `${itemPath}[${index}]`);
      });
      return;
    }
    for (const [key, child] of Object.entries(item as UnknownRecord)) {
      if (isForbiddenKey(key, SECRET_PAYLOAD_KEYS)) {
        fail(`${itemPath}.${key}`, "secret-shaped fields are forbidden in integration payloads");
      }
      visit(child, `${itemPath}.${key}`);
    }
  }
  visit(value, path);
}

function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("integrationEvent.payload", "numbers must be finite");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key] as JsonValue)}`)
    .join(",")}}`;
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

export function parseIntegrationConnection(
  value: unknown,
  path = "integrationConnection"
): IntegrationConnectionContract {
  const record = expectRecord(value, path);
  expectExactKeys(
    record,
    [
      "schemaVersion",
      "connectionId",
      "provider",
      "workspaceId",
      "campaignId",
      "worldId",
      "externalInstanceId",
      "state",
      "credentialState",
      "credentialVersion",
      "credentialExpiresAt",
      "capabilities",
      "allowedStreams",
      "adapterVersion",
      "retentionPolicyVersion",
      "exportPolicyVersion",
      "deletionPolicyVersion",
      "createdAt",
      "updatedAt",
      "revokedAt"
    ],
    path
  );
  const state = expectEnum(record["state"], INTEGRATION_CONNECTION_STATES, `${path}.state`);
  const credentialState = expectEnum(
    record["credentialState"],
    MACHINE_CREDENTIAL_STATES,
    `${path}.credentialState`
  );
  const capabilities = parseCapabilityList(record["capabilities"], `${path}.capabilities`);
  const createdAt = parseCanonicalInstant(record["createdAt"], `${path}.createdAt`);
  const updatedAt = parseCanonicalInstant(record["updatedAt"], `${path}.updatedAt`);
  const revokedAt = parseNullableInstant(record["revokedAt"], `${path}.revokedAt`);
  if (Date.parse(updatedAt) < Date.parse(createdAt)) {
    fail(`${path}.updatedAt`, "cannot precede createdAt");
  }
  if (state === "revoked") {
    if (revokedAt === null || credentialState !== "revoked") {
      fail(`${path}.revokedAt`, "revoked connections require revoked credential state and time");
    }
    if (
      Date.parse(revokedAt) < Date.parse(createdAt) ||
      Date.parse(revokedAt) > Date.parse(updatedAt)
    ) {
      fail(`${path}.revokedAt`, "must fall between createdAt and updatedAt");
    }
  } else if (revokedAt !== null) {
    fail(`${path}.revokedAt`, "is allowed only for revoked connections");
  }
  return {
    schemaVersion: expectEnum(
      record["schemaVersion"],
      ["hed56-connection-v1"] as const,
      `${path}.schemaVersion`
    ),
    connectionId: parseStableConnectionId(record["connectionId"], `${path}.connectionId`),
    provider: expectEnum(record["provider"], INTEGRATION_PROVIDERS, `${path}.provider`),
    workspaceId: parseStableWorkspaceId(record["workspaceId"], `${path}.workspaceId`),
    campaignId: parseStableCampaignId(record["campaignId"], `${path}.campaignId`),
    worldId: parseNullableWorldId(record["worldId"], `${path}.worldId`),
    externalInstanceId: parseStableId(record["externalInstanceId"], `${path}.externalInstanceId`),
    state,
    credentialState,
    credentialVersion: parseStableId(record["credentialVersion"], `${path}.credentialVersion`),
    credentialExpiresAt: parseNullableInstant(
      record["credentialExpiresAt"],
      `${path}.credentialExpiresAt`
    ),
    capabilities,
    allowedStreams: parseStableList(record["allowedStreams"], `${path}.allowedStreams`, true),
    adapterVersion: parseStableId(record["adapterVersion"], `${path}.adapterVersion`),
    retentionPolicyVersion: parseStableId(
      record["retentionPolicyVersion"],
      `${path}.retentionPolicyVersion`
    ),
    exportPolicyVersion: parseStableId(
      record["exportPolicyVersion"],
      `${path}.exportPolicyVersion`
    ),
    deletionPolicyVersion: parseStableId(
      record["deletionPolicyVersion"],
      `${path}.deletionPolicyVersion`
    ),
    createdAt,
    updatedAt,
    revokedAt
  };
}

function parseEventHashInput(
  value: unknown,
  path: string
): NormalizedIntegrationEventHashInputContract {
  const record = expectRecord(value, path);
  expectExactKeys(
    record,
    [
      "schemaVersion",
      "eventId",
      "provider",
      "connectionId",
      "workspaceId",
      "campaignId",
      "worldId",
      "sessionId",
      "stream",
      "sourceDocumentId",
      "sourceEventId",
      "sourceEventVersion",
      "sequence",
      "occurredAt",
      "receivedAt",
      "actor",
      "speaker",
      "type",
      "visibility",
      "payload",
      "adapterVersion",
      "traceId",
      "causationId"
    ],
    path
  );
  const payload = expectJsonObject(record["payload"], `${path}.payload`);
  rejectSecretPayloadKeys(payload, `${path}.payload`);
  if (utf8ByteLength(canonicalJson(payload)) > MAX_PAYLOAD_BYTES) {
    fail(`${path}.payload`, `canonical payload exceeds ${MAX_PAYLOAD_BYTES} UTF-8 bytes`);
  }
  return {
    schemaVersion: expectEnum(
      record["schemaVersion"],
      ["hed56-event-v1"] as const,
      `${path}.schemaVersion`
    ),
    eventId: parseStableEventId(record["eventId"], `${path}.eventId`),
    provider: expectEnum(record["provider"], INTEGRATION_PROVIDERS, `${path}.provider`),
    connectionId: parseStableConnectionId(record["connectionId"], `${path}.connectionId`),
    workspaceId: parseStableWorkspaceId(record["workspaceId"], `${path}.workspaceId`),
    campaignId: parseStableCampaignId(record["campaignId"], `${path}.campaignId`),
    worldId: parseNullableWorldId(record["worldId"], `${path}.worldId`),
    sessionId: parseNullableSessionId(record["sessionId"], `${path}.sessionId`),
    stream: parseStableId(record["stream"], `${path}.stream`),
    sourceDocumentId: parseNullableStableId(record["sourceDocumentId"], `${path}.sourceDocumentId`),
    sourceEventId: parseStableId(record["sourceEventId"], `${path}.sourceEventId`),
    sourceEventVersion: parseStableId(record["sourceEventVersion"], `${path}.sourceEventVersion`),
    sequence: parseSequence(record["sequence"], `${path}.sequence`),
    occurredAt: parseCanonicalInstant(record["occurredAt"], `${path}.occurredAt`),
    receivedAt: parseCanonicalInstant(record["receivedAt"], `${path}.receivedAt`),
    actor: parseActor(record["actor"], `${path}.actor`),
    speaker: parseNullableActor(record["speaker"], `${path}.speaker`),
    type: expectEnum(record["type"], INTEGRATION_EVENT_TYPES, `${path}.type`),
    visibility: parseVisibility(record["visibility"], `${path}.visibility`),
    payload,
    adapterVersion: parseStableId(record["adapterVersion"], `${path}.adapterVersion`),
    traceId: parseStableId(record["traceId"], `${path}.traceId`),
    causationId: parseNullableStableId(record["causationId"], `${path}.causationId`)
  };
}

function canonicalEventValue(input: NormalizedIntegrationEventHashInputContract): JsonObject {
  return {
    schemaVersion: input.schemaVersion,
    provider: input.provider,
    connectionId: input.connectionId,
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    worldId: input.worldId,
    sessionId: input.sessionId,
    stream: input.stream,
    sourceDocumentId: input.sourceDocumentId,
    sourceEventId: input.sourceEventId,
    sourceEventVersion: input.sourceEventVersion,
    sequence: input.sequence,
    occurredAt: input.occurredAt,
    actor: input.actor as unknown as JsonObject,
    speaker: input.speaker as unknown as JsonObject | null,
    type: input.type,
    visibility: input.visibility as unknown as JsonObject,
    payload: input.payload,
    adapterVersion: input.adapterVersion,
    causationId: input.causationId
  };
}

function canonicalIdentityValue(input: NormalizedIntegrationEventHashInputContract): JsonObject {
  return {
    provider: input.provider,
    connectionId: input.connectionId,
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    stream: input.stream,
    sourceDocumentId: input.sourceDocumentId,
    sourceEventId: input.sourceEventId,
    sourceEventVersion: input.sourceEventVersion
  };
}

export function canonicalizeIntegrationEvent(value: unknown): string {
  return canonicalJson(canonicalEventValue(parseEventHashInput(value, "integrationEvent")));
}

export function computeIntegrationEventChecksum(
  value: unknown,
  sha256: (canonicalUtf8: string) => string
): string {
  if (typeof sha256 !== "function")
    fail("integrationEvent.sha256", "trusted SHA-256 function is required");
  return parseSha256(sha256(canonicalizeIntegrationEvent(value)), "integrationEvent.checksum");
}

export function computeIntegrationEventIdempotencyKey(
  value: unknown,
  sha256: (canonicalUtf8: string) => string
): string {
  if (typeof sha256 !== "function")
    fail("integrationEvent.sha256", "trusted SHA-256 function is required");
  const input = parseEventHashInput(value, "integrationEvent");
  return parseSha256(
    sha256(canonicalJson(canonicalIdentityValue(input))),
    "integrationEvent.idempotencyKey"
  );
}

export function parseNormalizedIntegrationEvent(
  value: unknown,
  verification: IntegrationEventVerificationContext,
  path = "integrationEvent"
): NormalizedIntegrationEventContract {
  const verificationRecord = expectRecord(verification, `${path}.verification`);
  expectExactKeys(
    verificationRecord,
    ["connection", "eventId", "sessionId", "receivedAt", "evaluatedAt", "maxClockSkewMs", "sha256"],
    `${path}.verification`
  );
  const connection = parseIntegrationConnection(
    verificationRecord["connection"],
    `${path}.verification.connection`
  );
  const trustedEventId = parseStableEventId(
    verificationRecord["eventId"],
    `${path}.verification.eventId`
  );
  const trustedSessionId = parseNullableSessionId(
    verificationRecord["sessionId"],
    `${path}.verification.sessionId`
  );
  const trustedReceivedAt = parseCanonicalInstant(
    verificationRecord["receivedAt"],
    `${path}.verification.receivedAt`
  );
  const evaluatedAt = parseCanonicalInstant(
    verificationRecord["evaluatedAt"],
    `${path}.verification.evaluatedAt`
  );
  const maxClockSkewMs = expectInteger(
    verificationRecord["maxClockSkewMs"],
    `${path}.verification.maxClockSkewMs`
  );
  if (maxClockSkewMs < 0 || maxClockSkewMs > 300_000) {
    fail(`${path}.verification.maxClockSkewMs`, "must be between zero and 300000");
  }
  const sha256Candidate = verificationRecord["sha256"];
  if (typeof sha256Candidate !== "function") {
    fail(`${path}.verification.sha256`, "trusted SHA-256 function is required");
  }
  const sha256 = sha256Candidate as (canonicalUtf8: string) => string;
  if (Date.parse(trustedReceivedAt) > Date.parse(evaluatedAt)) {
    fail(`${path}.verification.receivedAt`, "cannot be later than evaluatedAt");
  }
  if (connection.state !== "active" || connection.credentialState !== "active") {
    fail(`${path}.connectionId`, "connection and credential must both be active");
  }
  if (
    connection.credentialExpiresAt !== null &&
    Date.parse(connection.credentialExpiresAt) <= Date.parse(evaluatedAt)
  ) {
    fail(`${path}.connectionId`, "connection credential has expired");
  }
  if (!connection.capabilities.includes("events:ingest")) {
    fail(`${path}.connectionId`, "connection lacks events:ingest capability");
  }

  const record = expectRecord(value, path);
  expectExactKeys(
    record,
    [
      "schemaVersion",
      "eventId",
      "provider",
      "connectionId",
      "workspaceId",
      "campaignId",
      "worldId",
      "sessionId",
      "stream",
      "sourceDocumentId",
      "sourceEventId",
      "sourceEventVersion",
      "sequence",
      "occurredAt",
      "receivedAt",
      "actor",
      "speaker",
      "type",
      "visibility",
      "payload",
      "adapterVersion",
      "traceId",
      "causationId",
      "checksum"
    ],
    path
  );
  const input = parseEventHashInput(
    {
      schemaVersion: record["schemaVersion"],
      eventId: record["eventId"],
      provider: record["provider"],
      connectionId: record["connectionId"],
      workspaceId: record["workspaceId"],
      campaignId: record["campaignId"],
      worldId: record["worldId"],
      sessionId: record["sessionId"],
      stream: record["stream"],
      sourceDocumentId: record["sourceDocumentId"],
      sourceEventId: record["sourceEventId"],
      sourceEventVersion: record["sourceEventVersion"],
      sequence: record["sequence"],
      occurredAt: record["occurredAt"],
      receivedAt: record["receivedAt"],
      actor: record["actor"],
      speaker: record["speaker"],
      type: record["type"],
      visibility: record["visibility"],
      payload: record["payload"],
      adapterVersion: record["adapterVersion"],
      traceId: record["traceId"],
      causationId: record["causationId"]
    },
    path
  );
  if (
    input.eventId !== trustedEventId ||
    input.provider !== connection.provider ||
    input.connectionId !== connection.connectionId ||
    input.workspaceId !== connection.workspaceId ||
    input.campaignId !== connection.campaignId ||
    !sameNullableId(input.worldId, connection.worldId) ||
    !sameNullableId(input.sessionId, trustedSessionId)
  ) {
    fail(`${path}.connectionId`, "event scope must match the authenticated connection exactly");
  }
  if (input.adapterVersion !== connection.adapterVersion) {
    fail(`${path}.adapterVersion`, "must match the active connection adapter version");
  }
  if (!connection.allowedStreams.includes(input.stream)) {
    fail(`${path}.stream`, "is not allowed by the authenticated connection");
  }
  if (!INTEGRATION_EVENT_TYPES_BY_PROVIDER[connection.provider].includes(input.type)) {
    fail(`${path}.type`, "is not allowed for the authenticated provider");
  }
  if (input.receivedAt !== trustedReceivedAt) {
    fail(`${path}.receivedAt`, "must match the trusted gateway receive time");
  }
  if (Date.parse(input.occurredAt) > Date.parse(evaluatedAt) + maxClockSkewMs) {
    fail(`${path}.occurredAt`, "is beyond the trusted clock-skew allowance");
  }
  const checksum = parseSha256(record["checksum"], `${path}.checksum`);
  if (checksum !== computeIntegrationEventChecksum(input, sha256)) {
    fail(`${path}.checksum`, "must match the canonical replay-relevant event fields");
  }
  return { ...input, checksum };
}

export function parseIntegrationIngestionCursor(
  value: unknown,
  path = "integrationCursor"
): IntegrationIngestionCursorContract {
  const record = expectRecord(value, path);
  expectExactKeys(
    record,
    [
      "schemaVersion",
      "connectionId",
      "stream",
      "lastSequence",
      "lastSourceEventId",
      "lastEventChecksum",
      "version",
      "updatedAt"
    ],
    path
  );
  const version = expectInteger(record["version"], `${path}.version`);
  if (version <= 0) fail(`${path}.version`, "must be greater than zero");
  return {
    schemaVersion: expectEnum(
      record["schemaVersion"],
      ["hed56-cursor-v1"] as const,
      `${path}.schemaVersion`
    ),
    connectionId: parseStableConnectionId(record["connectionId"], `${path}.connectionId`),
    stream: parseStableId(record["stream"], `${path}.stream`),
    lastSequence: parseSequence(record["lastSequence"], `${path}.lastSequence`),
    lastSourceEventId: parseStableId(record["lastSourceEventId"], `${path}.lastSourceEventId`),
    lastEventChecksum: parseSha256(record["lastEventChecksum"], `${path}.lastEventChecksum`),
    version,
    updatedAt: parseCanonicalInstant(record["updatedAt"], `${path}.updatedAt`)
  };
}

export function parseIntegrationIngestionReceipt(
  value: unknown,
  path = "integrationReceipt"
): IntegrationIngestionReceiptContract {
  const record = expectRecord(value, path);
  expectExactKeys(
    record,
    [
      "schemaVersion",
      "receiptId",
      "connectionId",
      "idempotencyKey",
      "eventId",
      "eventChecksum",
      "stream",
      "sequence",
      "outcome",
      "evidenceRef",
      "safeCode",
      "replayCount",
      "createdAt",
      "lastSeenAt",
      "purgeAt"
    ],
    path
  );
  const outcome = expectEnum(record["outcome"], INTEGRATION_RECEIPT_OUTCOMES, `${path}.outcome`);
  const evidenceRef =
    record["evidenceRef"] === null
      ? null
      : parseInternalRef(record["evidenceRef"], `${path}.evidenceRef`);
  const safeCode =
    record["safeCode"] === null ? null : parseSafeCode(record["safeCode"], `${path}.safeCode`);
  if (outcome === "accepted" && (evidenceRef === null || safeCode !== null)) {
    fail(`${path}.outcome`, "accepted receipts require evidenceRef and no safeCode");
  }
  if (outcome === "quarantined" && (evidenceRef !== null || safeCode === null)) {
    fail(`${path}.outcome`, "quarantined receipts require safeCode and no evidenceRef");
  }
  const replayCount = expectInteger(record["replayCount"], `${path}.replayCount`);
  if (replayCount < 0) fail(`${path}.replayCount`, "must not be negative");
  const createdAt = parseCanonicalInstant(record["createdAt"], `${path}.createdAt`);
  const lastSeenAt = parseCanonicalInstant(record["lastSeenAt"], `${path}.lastSeenAt`);
  const purgeAt = parseCanonicalInstant(record["purgeAt"], `${path}.purgeAt`);
  if (Date.parse(lastSeenAt) < Date.parse(createdAt)) {
    fail(`${path}.lastSeenAt`, "cannot precede createdAt");
  }
  if (Date.parse(purgeAt) <= Date.parse(lastSeenAt)) {
    fail(`${path}.purgeAt`, "must be later than lastSeenAt");
  }
  return {
    schemaVersion: expectEnum(
      record["schemaVersion"],
      ["hed56-receipt-v1"] as const,
      `${path}.schemaVersion`
    ),
    receiptId: parseStableId(record["receiptId"], `${path}.receiptId`),
    connectionId: parseStableConnectionId(record["connectionId"], `${path}.connectionId`),
    idempotencyKey: parseSha256(record["idempotencyKey"], `${path}.idempotencyKey`),
    eventId: parseStableEventId(record["eventId"], `${path}.eventId`),
    eventChecksum: parseSha256(record["eventChecksum"], `${path}.eventChecksum`),
    stream: parseStableId(record["stream"], `${path}.stream`),
    sequence: parseSequence(record["sequence"], `${path}.sequence`),
    outcome,
    evidenceRef,
    safeCode,
    replayCount,
    createdAt,
    lastSeenAt,
    purgeAt
  };
}
