import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb, mongoStatus } from "../db/mongo.js";
import { normalizeSessionSourceRanges } from "../services/sessionLifecycleService.js";
import { collections } from "./collections.js";

const MAX_PROCESSING_SOURCE_SNAPSHOTS = 64;
const SAFE_STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;

function sessions() {
  return getDb().collection(collections.sessions);
}

function snapshotError(message, status = 409, code = "SESSION_SOURCE_SNAPSHOT_CONFLICT") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function requireMongo() {
  if (mongoStatus().connected) return;
  throw snapshotError(
    "MongoDB is required for session processing source snapshots.",
    503,
    "SESSION_STORAGE_UNAVAILABLE"
  );
}

function requiredObjectId(value, label) {
  if (ObjectId.isValid(String(value))) return new ObjectId(String(value));
  throw snapshotError(`${label} is invalid.`, 400, "SESSION_SOURCE_SNAPSHOT_INVALID");
}

function stableId(value, label) {
  const result = String(value || "").trim();
  if (!SAFE_STABLE_ID.test(result)) {
    throw snapshotError(`${label} is invalid.`, 400, "SESSION_SOURCE_SNAPSHOT_INVALID");
  }
  return result;
}

function positiveInteger(value, label) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 1) {
    throw snapshotError(`${label} must be a positive integer.`, 400, "SESSION_SOURCE_SNAPSHOT_INVALID");
  }
  return result;
}

function canonicalInstant(value, label) {
  const instant = String(value || "").trim();
  const parsed = Date.parse(instant);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== instant) {
    throw snapshotError(`${label} must be a canonical UTC timestamp.`, 400, "SESSION_SOURCE_SNAPSHOT_INVALID");
  }
  return instant;
}

function assertScope(session, { workspaceId, campaignId }) {
  const lifecycle = session?.lifecycle;
  if (!lifecycle) {
    throw snapshotError(
      "Session lifecycle must be initialized before processing sources can be frozen.",
      409,
      "SESSION_LIFECYCLE_REQUIRED"
    );
  }
  if (String(lifecycle.workspaceId || "") !== String(workspaceId || "")
    || String(lifecycle.campaignId || "") !== String(campaignId || "")) {
    throw snapshotError(
      "Session processing source snapshot tenant scope does not match the active campaign.",
      409,
      "SESSION_LIFECYCLE_SCOPE_MISMATCH"
    );
  }
}

function sourceKey(source) {
  return `${source.provider}:${source.connectionId || "manual"}:${source.stream}`;
}

function canonicalSources(value) {
  return normalizeSessionSourceRanges(value)
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
    }))
    .sort((left, right) => sourceKey(left).localeCompare(sourceKey(right)));
}

function canonicalSnapshot(snapshot) {
  return JSON.stringify({
    schemaVersion: snapshot.schemaVersion,
    workspaceId: snapshot.workspaceId,
    campaignId: snapshot.campaignId,
    sessionId: snapshot.sessionId,
    processingVersion: snapshot.processingVersion,
    capturedAt: snapshot.capturedAt,
    sources: canonicalSources(snapshot.sources)
  });
}

function snapshotHash(snapshot) {
  return createHash("sha256").update(canonicalSnapshot(snapshot), "utf8").digest("hex");
}

function recordForVersion(session, processingVersion) {
  return (Array.isArray(session?.processingSourceSnapshots) ? session.processingSourceSnapshots : [])
    .find((item) => Number(item?.processingVersion || 0) === processingVersion) || null;
}

function sameSources(left, right) {
  return JSON.stringify(canonicalSources(left)) === JSON.stringify(canonicalSources(right));
}

function publicRecord(record) {
  return {
    processingVersion: Number(record.processingVersion),
    ref: String(record.ref),
    hash: String(record.hash),
    snapshot: record.snapshot,
    createdAt: String(record.createdAt)
  };
}

async function findScopedSession({ campaignId, sessionId }) {
  requireMongo();
  const campaignObjectId = requiredObjectId(campaignId, "Campaign id");
  const sessionObjectId = requiredObjectId(sessionId, "Session id");
  const session = await sessions().findOne({ _id: sessionObjectId, campaignId: campaignObjectId });
  if (!session) {
    throw snapshotError("Campaign session was not found.", 404, "SESSION_NOT_FOUND");
  }
  return { session, campaignObjectId, sessionObjectId };
}

export async function freezeQueuedSessionProcessingSourceSnapshot({ workspaceId, campaignId, sessionId } = {}) {
  const scope = { workspaceId: stableId(workspaceId, "Workspace id"), campaignId: stableId(campaignId, "Campaign id") };
  const target = await findScopedSession({ campaignId: scope.campaignId, sessionId });
  let { session } = target;
  assertScope(session, scope);
  if (session.lifecycle.status !== "queued") {
    throw snapshotError(
      "Processing sources can only be frozen while the session is queued.",
      409,
      "SESSION_SOURCE_SNAPSHOT_NOT_ALLOWED"
    );
  }

  const processingVersion = positiveInteger(session.lifecycle.processing?.processingVersion, "Processing version");
  const sources = canonicalSources(session.lifecycle.sourceRanges || []);
  if (!sources.length) {
    throw snapshotError(
      "Queued processing requires at least one session evidence source.",
      409,
      "SESSION_SOURCE_SNAPSHOT_REQUIRED"
    );
  }

  const existing = recordForVersion(session, processingVersion);
  if (existing) {
    if (!sameSources(existing.snapshot?.sources || [], sources)) {
      throw snapshotError(
        "The immutable processing source snapshot conflicts with the current session source ranges.",
        409,
        "SESSION_SOURCE_SNAPSHOT_CONFLICT"
      );
    }
    return { sourceSnapshot: publicRecord(existing), idempotent: true };
  }

  const records = Array.isArray(session.processingSourceSnapshots) ? session.processingSourceSnapshots : [];
  if (records.length >= MAX_PROCESSING_SOURCE_SNAPSHOTS) {
    throw snapshotError(
      "Session processing source snapshot history reached its bounded limit.",
      409,
      "SESSION_SOURCE_SNAPSHOT_LIMIT"
    );
  }

  const capturedAt = canonicalInstant(session.lifecycle.processing?.queuedAt, "Processing queued time");
  const normalizedSessionId = stableId(sessionId, "Session id");
  const snapshot = {
    schemaVersion: "hed27-session-source-snapshot-v1",
    workspaceId: scope.workspaceId,
    campaignId: scope.campaignId,
    sessionId: normalizedSessionId,
    processingVersion,
    capturedAt,
    sources
  };
  const record = {
    processingVersion,
    ref: `session-source-snapshot:${normalizedSessionId}:v${processingVersion}`,
    hash: snapshotHash(snapshot),
    snapshot,
    createdAt: capturedAt
  };

  const update = await sessions().updateOne(
    {
      _id: target.sessionObjectId,
      campaignId: target.campaignObjectId,
      "lifecycle.status": "queued",
      "lifecycle.lifecycleRevision": Number(session.lifecycle.lifecycleRevision || 0),
      "lifecycle.processing.processingVersion": processingVersion,
      "processingSourceSnapshots.processingVersion": { $ne: processingVersion }
    },
    { $push: { processingSourceSnapshots: record } }
  );

  if (!update.modifiedCount) {
    session = await sessions().findOne({ _id: target.sessionObjectId, campaignId: target.campaignObjectId });
    if (!session) throw snapshotError("Campaign session was not found.", 404, "SESSION_NOT_FOUND");
    assertScope(session, scope);
    const concurrent = recordForVersion(session, processingVersion);
    if (concurrent && concurrent.ref === record.ref && concurrent.hash === record.hash) {
      return { sourceSnapshot: publicRecord(concurrent), idempotent: true };
    }
    throw snapshotError(
      "Session processing source snapshot changed concurrently.",
      409,
      "SESSION_SOURCE_SNAPSHOT_CONFLICT"
    );
  }

  return { sourceSnapshot: publicRecord(record), idempotent: false };
}

export async function buildQueuedSessionProcessingRequest({
  workspaceId,
  campaignId,
  sessionId,
  policyVersion
} = {}) {
  const scope = { workspaceId: stableId(workspaceId, "Workspace id"), campaignId: stableId(campaignId, "Campaign id") };
  const { session } = await findScopedSession({ campaignId: scope.campaignId, sessionId });
  assertScope(session, scope);
  if (session.lifecycle.status !== "queued") {
    throw snapshotError(
      "A session processing request can only be created while queued.",
      409,
      "SESSION_PROCESSING_REQUEST_NOT_ALLOWED"
    );
  }
  const processingVersion = positiveInteger(session.lifecycle.processing?.processingVersion, "Processing version");
  const record = recordForVersion(session, processingVersion);
  if (!record) {
    throw snapshotError(
      "The queued session has no frozen processing source snapshot.",
      409,
      "SESSION_SOURCE_SNAPSHOT_REQUIRED"
    );
  }
  return {
    schemaVersion: "hed27-session-processing-request-v1",
    workspaceId: scope.workspaceId,
    campaignId: scope.campaignId,
    sessionId: stableId(sessionId, "Session id"),
    processingVersion,
    sourceSnapshotRef: stableId(record.ref, "Source snapshot ref"),
    sourceSnapshotHash: String(record.hash),
    policyVersion: stableId(policyVersion, "Policy version"),
    requestedAt: canonicalInstant(session.lifecycle.processing?.queuedAt, "Processing queued time")
  };
}

export async function readSessionProcessingSourceSnapshot({
  workspaceId,
  campaignId,
  sessionId,
  processingVersion,
  sourceSnapshotRef,
  sourceSnapshotHash
} = {}) {
  const scope = { workspaceId: stableId(workspaceId, "Workspace id"), campaignId: stableId(campaignId, "Campaign id") };
  const { session } = await findScopedSession({ campaignId: scope.campaignId, sessionId });
  assertScope(session, scope);
  const version = positiveInteger(processingVersion, "Processing version");
  const record = recordForVersion(session, version);
  if (!record) {
    throw snapshotError("Processing source snapshot was not found.", 404, "SESSION_SOURCE_SNAPSHOT_NOT_FOUND");
  }
  if (String(record.ref) !== stableId(sourceSnapshotRef, "Source snapshot ref")
    || String(record.hash) !== String(sourceSnapshotHash || "")) {
    throw snapshotError(
      "Processing source snapshot reference or hash does not match the stored snapshot.",
      409,
      "SESSION_SOURCE_SNAPSHOT_MISMATCH"
    );
  }
  return record.snapshot;
}
