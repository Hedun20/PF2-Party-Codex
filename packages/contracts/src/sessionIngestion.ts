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

export const SESSION_INGESTION_SOURCE_KINDS = [
  "foundry",
  "discord",
  "manualNote",
  "pastedTranscript",
  "audioUpload"
] as const;
export const SESSION_INGESTION_SOURCE_STATES = [
  "configured",
  "active",
  "paused",
  "ended",
  "revoked",
  "deleted"
] as const;
export const SESSION_INGESTION_CONSENT_STATES = ["notRequired", "pending", "granted", "revoked"] as const;
export const SESSION_INGESTION_VISIBILITIES = ["restricted", "managerOnly", "participantScoped"] as const;
export const SESSION_INGESTION_RETENTION_CLASSES = [
  "rawEvidence30d",
  "transcriptEvidence30d",
  "rawAudioEphemeral"
] as const;
export const SESSION_AUDIO_MEDIA_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm"
] as const;
export const SESSION_INGESTION_DATA_CLASSES = [
  "rawEvidence",
  "transcriptEvidence",
  "rawAudio",
  "approvedCanon"
] as const;
export const SESSION_INGESTION_DESTINATIONS = [
  "managerReview",
  "playerProjection",
  "modelContext",
  "cache",
  "analytics",
  "export",
  "malwareScanner",
  "transcriptionProvider"
] as const;
export const SESSION_INGESTION_PROJECTIONS = ["raw", "policyFiltered", "approvedProjection", "metadataOnly"] as const;

export type SessionIngestionSourceKind = (typeof SESSION_INGESTION_SOURCE_KINDS)[number];
export type SessionIngestionSourceState = (typeof SESSION_INGESTION_SOURCE_STATES)[number];
export type SessionIngestionConsentState = (typeof SESSION_INGESTION_CONSENT_STATES)[number];
export type SessionIngestionVisibility = (typeof SESSION_INGESTION_VISIBILITIES)[number];
export type SessionIngestionRetentionClass = (typeof SESSION_INGESTION_RETENTION_CLASSES)[number];
export type SessionAudioMediaType = (typeof SESSION_AUDIO_MEDIA_TYPES)[number];
export type SessionIngestionDataClass = (typeof SESSION_INGESTION_DATA_CLASSES)[number];
export type SessionIngestionDestination = (typeof SESSION_INGESTION_DESTINATIONS)[number];
export type SessionIngestionProjection = (typeof SESSION_INGESTION_PROJECTIONS)[number];

export interface SessionIngestionSourceContract {
  readonly sourceId: string;
  readonly kind: SessionIngestionSourceKind;
  readonly connectionId: IntegrationConnectionId | null;
  readonly stream: string;
  readonly state: SessionIngestionSourceState;
  readonly consentState: SessionIngestionConsentState;
  readonly consentNoticeVersion: string | null;
  readonly consentedByUserId: UserId | null;
  readonly visibility: SessionIngestionVisibility;
  readonly retentionClass: SessionIngestionRetentionClass;
  readonly startedAt: string | null;
  readonly endedAt: string | null;
  readonly rawEvidenceExpiresAt: string | null;
  readonly revokedAt: string | null;
  readonly deletedAt: string | null;
}

export interface SessionIngestionPolicyContract {
  readonly schemaVersion: "hed26-session-ingestion-policy-v1";
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly sessionId: SessionId;
  readonly consentNoticeVersion: string;
  readonly rawEvidenceRetentionDays: 30;
  readonly rawAudioDeleteAfterTranscriptHours: 24;
  readonly rawAudioFailureDeleteAfterHours: 168;
  readonly approvedCanonPersistsAfterRawExpiry: true;
  readonly sources: readonly SessionIngestionSourceContract[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SessionAudioUploadContract {
  readonly schemaVersion: "hed26-session-audio-upload-v1";
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly sessionId: SessionId;
  readonly sourceId: string;
  readonly uploaderUserId: UserId;
  readonly consentNoticeVersion: string;
  readonly consentAcceptedAt: string;
  readonly filename: string;
  readonly mediaType: SessionAudioMediaType;
  readonly sizeBytes: number;
  readonly durationMs: number;
  readonly sha256: string;
  readonly malwareScanStatus: "clean";
  readonly malwareScannerVersion: string;
  readonly malwareScannedAt: string;
  readonly uploadedAt: string;
}

export interface SessionTranscriptSegmentContract {
  readonly segmentId: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
  readonly suggestedSpeakerId: string | null;
  readonly suggestedSpeakerLabel: string | null;
  readonly correctedSpeakerId: string | null;
  readonly correctedByUserId: UserId | null;
  readonly correctedAt: string | null;
}

export interface SessionTranscriptEvidenceContract {
  readonly schemaVersion: "hed26-session-transcript-evidence-v1";
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly sessionId: SessionId;
  readonly sourceId: string;
  readonly sourceAudioSha256: string | null;
  readonly transcriptionProviderVersion: string;
  readonly segments: readonly SessionTranscriptSegmentContract[];
  readonly transcribedAt: string;
  readonly rawAudioDeleteAt: string | null;
}

export interface SessionIngestionExposureRequestContract {
  readonly dataClass: SessionIngestionDataClass;
  readonly visibility: SessionIngestionVisibility | "public";
  readonly destination: SessionIngestionDestination;
  readonly projection: SessionIngestionProjection;
}

const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;
const SAFE_NOTICE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const CANONICAL_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SAFE_FILENAME = /^[^\r\n\0/\\]{1,255}$/;
const MAX_SOURCES = 64;
const MAX_AUDIO_BYTES = 500 * 1024 * 1024;
const MAX_AUDIO_DURATION_MS = 4 * 60 * 60 * 1000;
const MAX_TRANSCRIPT_SEGMENTS = 20_000;
const MAX_SEGMENT_TEXT = 8_192;

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

function parseNoticeVersion(value: unknown, path: string): string {
  const version = expectString(value, path);
  return SAFE_NOTICE.test(version) ? version : fail(path, "expected a stable consent notice version");
}

function parseNullableUserId(value: unknown, path: string): UserId | null {
  return value === null ? null : parseUserId(value, path);
}

function parseNonNegativeInteger(value: unknown, path: string): number {
  const parsed = expectInteger(value, path);
  return parsed >= 0 ? parsed : fail(path, "must be non-negative");
}

function parsePositiveInteger(value: unknown, path: string): number {
  const parsed = expectInteger(value, path);
  return parsed >= 1 ? parsed : fail(path, "must be at least 1");
}

function parseSha256(value: unknown, path: string): string {
  const digest = expectString(value, path);
  return SHA256.test(digest) ? digest : fail(path, "expected lowercase SHA-256");
}

function sourceRequiresExplicitConsent(kind: SessionIngestionSourceKind): boolean {
  return kind === "foundry" || kind === "discord" || kind === "pastedTranscript" || kind === "audioUpload";
}

function sourceRequiresConnection(kind: SessionIngestionSourceKind): boolean {
  return kind === "foundry" || kind === "discord" || kind === "pastedTranscript" || kind === "audioUpload";
}

function expectedRetention(kind: SessionIngestionSourceKind): SessionIngestionRetentionClass {
  if (kind === "audioUpload") return "rawAudioEphemeral";
  if (kind === "pastedTranscript") return "transcriptEvidence30d";
  return "rawEvidence30d";
}

function parseSource(value: unknown, path: string, policyNoticeVersion: string): SessionIngestionSourceContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "sourceId",
    "kind",
    "connectionId",
    "stream",
    "state",
    "consentState",
    "consentNoticeVersion",
    "consentedByUserId",
    "visibility",
    "retentionClass",
    "startedAt",
    "endedAt",
    "rawEvidenceExpiresAt",
    "revokedAt",
    "deletedAt"
  ], path);

  const kind = expectEnum(record["kind"], SESSION_INGESTION_SOURCE_KINDS, `${path}.kind`);
  const connectionId = record["connectionId"] === null
    ? null
    : parseIntegrationConnectionId(record["connectionId"], `${path}.connectionId`);
  if (sourceRequiresConnection(kind) && connectionId === null) {
    fail(`${path}.connectionId`, `${kind} requires a scoped integration connection`);
  }
  if (kind === "manualNote" && connectionId !== null) {
    fail(`${path}.connectionId`, "manual notes remain local evidence and cannot claim an integration connection");
  }

  const consentState = expectEnum(record["consentState"], SESSION_INGESTION_CONSENT_STATES, `${path}.consentState`);
  const consentNoticeVersion = record["consentNoticeVersion"] === null
    ? null
    : parseNoticeVersion(record["consentNoticeVersion"], `${path}.consentNoticeVersion`);
  const consentedByUserId = parseNullableUserId(record["consentedByUserId"], `${path}.consentedByUserId`);
  if (sourceRequiresExplicitConsent(kind)) {
    if (!consentNoticeVersion || consentNoticeVersion !== policyNoticeVersion) {
      fail(`${path}.consentNoticeVersion`, `${kind} requires the current consent notice version`);
    }
    if (consentState === "granted" && !consentedByUserId) {
      fail(`${path}.consentedByUserId`, "granted consent requires an accountable platform user");
    }
  } else if (consentState !== "notRequired") {
    fail(`${path}.consentState`, "manual notes use explicit author action and must be notRequired");
  }

  const state = expectEnum(record["state"], SESSION_INGESTION_SOURCE_STATES, `${path}.state`);
  if (["active", "ended"].includes(state) && !["granted", "notRequired"].includes(consentState)) {
    fail(`${path}.consentState`, `${state} sources require effective consent`);
  }
  if (consentState === "revoked" && !["revoked", "deleted"].includes(state)) {
    fail(`${path}.state`, "revoked consent cannot remain ingestible");
  }

  const retentionClass = expectEnum(record["retentionClass"], SESSION_INGESTION_RETENTION_CLASSES, `${path}.retentionClass`);
  if (retentionClass !== expectedRetention(kind)) {
    fail(`${path}.retentionClass`, `${kind} requires retention class ${expectedRetention(kind)}`);
  }

  const startedAt = parseNullableInstant(record["startedAt"], `${path}.startedAt`);
  const endedAt = parseNullableInstant(record["endedAt"], `${path}.endedAt`);
  const rawEvidenceExpiresAt = parseNullableInstant(record["rawEvidenceExpiresAt"], `${path}.rawEvidenceExpiresAt`);
  const revokedAt = parseNullableInstant(record["revokedAt"], `${path}.revokedAt`);
  const deletedAt = parseNullableInstant(record["deletedAt"], `${path}.deletedAt`);

  if (startedAt && endedAt && Date.parse(endedAt) < Date.parse(startedAt)) {
    fail(`${path}.endedAt`, "cannot precede startedAt");
  }
  if (endedAt && rawEvidenceExpiresAt) {
    const maximumExpiry = Date.parse(endedAt) + 30 * 24 * 60 * 60 * 1000;
    if (Date.parse(rawEvidenceExpiresAt) > maximumExpiry || Date.parse(rawEvidenceExpiresAt) < Date.parse(endedAt)) {
      fail(`${path}.rawEvidenceExpiresAt`, "must expire no later than 30 days after source end");
    }
  }
  if (state === "ended" && !endedAt) fail(`${path}.endedAt`, "ended sources require endedAt");
  if (state === "ended" && kind !== "audioUpload" && !rawEvidenceExpiresAt) {
    fail(`${path}.rawEvidenceExpiresAt`, "ended raw evidence requires an expiry deadline");
  }
  if (state === "revoked" && !revokedAt) fail(`${path}.revokedAt`, "revoked sources require revokedAt");
  if (state === "deleted" && !deletedAt) fail(`${path}.deletedAt`, "deleted sources require deletedAt");

  return {
    sourceId: parseStableId(record["sourceId"], `${path}.sourceId`),
    kind,
    connectionId,
    stream: parseStableId(record["stream"], `${path}.stream`),
    state,
    consentState,
    consentNoticeVersion,
    consentedByUserId,
    visibility: expectEnum(record["visibility"], SESSION_INGESTION_VISIBILITIES, `${path}.visibility`),
    retentionClass,
    startedAt,
    endedAt,
    rawEvidenceExpiresAt,
    revokedAt,
    deletedAt
  };
}

export function parseSessionIngestionPolicyContract(
  value: unknown,
  path = "sessionIngestionPolicy"
): SessionIngestionPolicyContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "workspaceId",
    "campaignId",
    "sessionId",
    "consentNoticeVersion",
    "rawEvidenceRetentionDays",
    "rawAudioDeleteAfterTranscriptHours",
    "rawAudioFailureDeleteAfterHours",
    "approvedCanonPersistsAfterRawExpiry",
    "sources",
    "createdAt",
    "updatedAt"
  ], path);

  if (!Array.isArray(record["sources"]) || record["sources"].length > MAX_SOURCES) {
    fail(`${path}.sources`, `expected an array with at most ${MAX_SOURCES} sources`);
  }
  const consentNoticeVersion = parseNoticeVersion(record["consentNoticeVersion"], `${path}.consentNoticeVersion`);
  const sources = record["sources"].map((item, index) => parseSource(item, `${path}.sources[${index}]`, consentNoticeVersion));
  const sourceIds = new Set<string>();
  const streamKeys = new Set<string>();
  for (const source of sources) {
    if (sourceIds.has(source.sourceId)) fail(`${path}.sources`, `duplicate source id ${source.sourceId}`);
    sourceIds.add(source.sourceId);
    const key = `${source.connectionId ?? "local"}:${source.stream}`;
    if (streamKeys.has(key)) fail(`${path}.sources`, `duplicate source stream ${key}`);
    streamKeys.add(key);
  }

  if (record["rawEvidenceRetentionDays"] !== 30) fail(`${path}.rawEvidenceRetentionDays`, "alpha policy is fixed at 30 days");
  if (record["rawAudioDeleteAfterTranscriptHours"] !== 24) fail(`${path}.rawAudioDeleteAfterTranscriptHours`, "alpha policy is fixed at 24 hours");
  if (record["rawAudioFailureDeleteAfterHours"] !== 168) fail(`${path}.rawAudioFailureDeleteAfterHours`, "alpha failure policy is fixed at 168 hours");
  if (record["approvedCanonPersistsAfterRawExpiry"] !== true) {
    fail(`${path}.approvedCanonPersistsAfterRawExpiry`, "approved canon must survive raw-evidence expiry");
  }

  const createdAt = parseCanonicalInstant(record["createdAt"], `${path}.createdAt`);
  const updatedAt = parseCanonicalInstant(record["updatedAt"], `${path}.updatedAt`);
  if (Date.parse(updatedAt) < Date.parse(createdAt)) fail(`${path}.updatedAt`, "cannot precede createdAt");

  return {
    schemaVersion: expectEnum(record["schemaVersion"], ["hed26-session-ingestion-policy-v1"] as const, `${path}.schemaVersion`),
    workspaceId: parseWorkspaceId(record["workspaceId"], `${path}.workspaceId`),
    campaignId: parseCampaignId(record["campaignId"], `${path}.campaignId`),
    sessionId: parseSessionId(record["sessionId"], `${path}.sessionId`),
    consentNoticeVersion,
    rawEvidenceRetentionDays: 30,
    rawAudioDeleteAfterTranscriptHours: 24,
    rawAudioFailureDeleteAfterHours: 168,
    approvedCanonPersistsAfterRawExpiry: true,
    sources,
    createdAt,
    updatedAt
  };
}

export function parseSessionAudioUploadContract(
  value: unknown,
  path = "sessionAudioUpload"
): SessionAudioUploadContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "workspaceId",
    "campaignId",
    "sessionId",
    "sourceId",
    "uploaderUserId",
    "consentNoticeVersion",
    "consentAcceptedAt",
    "filename",
    "mediaType",
    "sizeBytes",
    "durationMs",
    "sha256",
    "malwareScanStatus",
    "malwareScannerVersion",
    "malwareScannedAt",
    "uploadedAt"
  ], path);

  const filename = expectString(record["filename"], `${path}.filename`);
  if (!SAFE_FILENAME.test(filename)) fail(`${path}.filename`, "expected a safe basename without path separators");
  const sizeBytes = parsePositiveInteger(record["sizeBytes"], `${path}.sizeBytes`);
  if (sizeBytes > MAX_AUDIO_BYTES) fail(`${path}.sizeBytes`, `must not exceed ${MAX_AUDIO_BYTES} bytes`);
  const durationMs = parsePositiveInteger(record["durationMs"], `${path}.durationMs`);
  if (durationMs > MAX_AUDIO_DURATION_MS) fail(`${path}.durationMs`, `must not exceed ${MAX_AUDIO_DURATION_MS} ms`);
  const uploadedAt = parseCanonicalInstant(record["uploadedAt"], `${path}.uploadedAt`);
  const consentAcceptedAt = parseCanonicalInstant(record["consentAcceptedAt"], `${path}.consentAcceptedAt`);
  const malwareScannedAt = parseCanonicalInstant(record["malwareScannedAt"], `${path}.malwareScannedAt`);
  if (Date.parse(consentAcceptedAt) > Date.parse(uploadedAt)) fail(`${path}.consentAcceptedAt`, "cannot follow upload time");
  if (Date.parse(malwareScannedAt) < Date.parse(uploadedAt)) fail(`${path}.malwareScannedAt`, "cannot precede upload time");

  return {
    schemaVersion: expectEnum(record["schemaVersion"], ["hed26-session-audio-upload-v1"] as const, `${path}.schemaVersion`),
    workspaceId: parseWorkspaceId(record["workspaceId"], `${path}.workspaceId`),
    campaignId: parseCampaignId(record["campaignId"], `${path}.campaignId`),
    sessionId: parseSessionId(record["sessionId"], `${path}.sessionId`),
    sourceId: parseStableId(record["sourceId"], `${path}.sourceId`),
    uploaderUserId: parseUserId(record["uploaderUserId"], `${path}.uploaderUserId`),
    consentNoticeVersion: parseNoticeVersion(record["consentNoticeVersion"], `${path}.consentNoticeVersion`),
    consentAcceptedAt,
    filename,
    mediaType: expectEnum(record["mediaType"], SESSION_AUDIO_MEDIA_TYPES, `${path}.mediaType`),
    sizeBytes,
    durationMs,
    sha256: parseSha256(record["sha256"], `${path}.sha256`),
    malwareScanStatus: expectEnum(record["malwareScanStatus"], ["clean"] as const, `${path}.malwareScanStatus`),
    malwareScannerVersion: parseStableId(record["malwareScannerVersion"], `${path}.malwareScannerVersion`),
    malwareScannedAt,
    uploadedAt
  };
}

function parseTranscriptSegment(value: unknown, path: string): SessionTranscriptSegmentContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "segmentId",
    "startMs",
    "endMs",
    "text",
    "suggestedSpeakerId",
    "suggestedSpeakerLabel",
    "correctedSpeakerId",
    "correctedByUserId",
    "correctedAt"
  ], path);
  const startMs = parseNonNegativeInteger(record["startMs"], `${path}.startMs`);
  const endMs = parsePositiveInteger(record["endMs"], `${path}.endMs`);
  if (endMs <= startMs) fail(`${path}.endMs`, "must be after startMs");
  const text = expectString(record["text"], `${path}.text`);
  if (!text.trim() || Buffer.byteLength(text, "utf8") > MAX_SEGMENT_TEXT) {
    fail(`${path}.text`, "must contain bounded transcript text");
  }
  const correctedSpeakerId = record["correctedSpeakerId"] === null ? null : parseStableId(record["correctedSpeakerId"], `${path}.correctedSpeakerId`);
  const correctedByUserId = parseNullableUserId(record["correctedByUserId"], `${path}.correctedByUserId`);
  const correctedAt = parseNullableInstant(record["correctedAt"], `${path}.correctedAt`);
  if ((correctedSpeakerId === null) !== (correctedByUserId === null) || (correctedSpeakerId === null) !== (correctedAt === null)) {
    fail(path, "speaker correction fields must be all null or all present");
  }
  return {
    segmentId: parseStableId(record["segmentId"], `${path}.segmentId`),
    startMs,
    endMs,
    text,
    suggestedSpeakerId: record["suggestedSpeakerId"] === null ? null : parseStableId(record["suggestedSpeakerId"], `${path}.suggestedSpeakerId`),
    suggestedSpeakerLabel: record["suggestedSpeakerLabel"] === null ? null : expectString(record["suggestedSpeakerLabel"], `${path}.suggestedSpeakerLabel`),
    correctedSpeakerId,
    correctedByUserId,
    correctedAt
  };
}

export function parseSessionTranscriptEvidenceContract(
  value: unknown,
  path = "sessionTranscriptEvidence"
): SessionTranscriptEvidenceContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "workspaceId",
    "campaignId",
    "sessionId",
    "sourceId",
    "sourceAudioSha256",
    "transcriptionProviderVersion",
    "segments",
    "transcribedAt",
    "rawAudioDeleteAt"
  ], path);
  if (!Array.isArray(record["segments"]) || record["segments"].length < 1 || record["segments"].length > MAX_TRANSCRIPT_SEGMENTS) {
    fail(`${path}.segments`, `expected between 1 and ${MAX_TRANSCRIPT_SEGMENTS} segments`);
  }
  const segments = record["segments"].map((item, index) => parseTranscriptSegment(item, `${path}.segments[${index}]`));
  const ids = new Set<string>();
  let priorEnd = 0;
  for (const segment of segments) {
    if (ids.has(segment.segmentId)) fail(`${path}.segments`, `duplicate segment id ${segment.segmentId}`);
    ids.add(segment.segmentId);
    if (segment.startMs < priorEnd) fail(`${path}.segments`, "segments must be ordered and non-overlapping");
    priorEnd = segment.endMs;
  }
  const transcribedAt = parseCanonicalInstant(record["transcribedAt"], `${path}.transcribedAt`);
  const rawAudioDeleteAt = parseNullableInstant(record["rawAudioDeleteAt"], `${path}.rawAudioDeleteAt`);
  const sourceAudioSha256 = record["sourceAudioSha256"] === null ? null : parseSha256(record["sourceAudioSha256"], `${path}.sourceAudioSha256`);
  if (sourceAudioSha256 && !rawAudioDeleteAt) fail(`${path}.rawAudioDeleteAt`, "audio-backed transcripts require an automatic raw-audio deletion deadline");
  if (rawAudioDeleteAt) {
    const delta = Date.parse(rawAudioDeleteAt) - Date.parse(transcribedAt);
    if (delta < 0 || delta > 24 * 60 * 60 * 1000) {
      fail(`${path}.rawAudioDeleteAt`, "successful transcription must delete raw audio within 24 hours");
    }
  }
  return {
    schemaVersion: expectEnum(record["schemaVersion"], ["hed26-session-transcript-evidence-v1"] as const, `${path}.schemaVersion`),
    workspaceId: parseWorkspaceId(record["workspaceId"], `${path}.workspaceId`),
    campaignId: parseCampaignId(record["campaignId"], `${path}.campaignId`),
    sessionId: parseSessionId(record["sessionId"], `${path}.sessionId`),
    sourceId: parseStableId(record["sourceId"], `${path}.sourceId`),
    sourceAudioSha256,
    transcriptionProviderVersion: parseStableId(record["transcriptionProviderVersion"], `${path}.transcriptionProviderVersion`),
    segments,
    transcribedAt,
    rawAudioDeleteAt
  };
}

export function parseSessionIngestionExposureRequestContract(
  value: unknown,
  path = "sessionIngestionExposure"
): SessionIngestionExposureRequestContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, ["dataClass", "visibility", "destination", "projection"], path);
  return {
    dataClass: expectEnum(record["dataClass"], SESSION_INGESTION_DATA_CLASSES, `${path}.dataClass`),
    visibility: expectEnum(record["visibility"], [...SESSION_INGESTION_VISIBILITIES, "public"] as const, `${path}.visibility`),
    destination: expectEnum(record["destination"], SESSION_INGESTION_DESTINATIONS, `${path}.destination`),
    projection: expectEnum(record["projection"], SESSION_INGESTION_PROJECTIONS, `${path}.projection`)
  };
}
