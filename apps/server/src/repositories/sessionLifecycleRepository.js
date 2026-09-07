import { ObjectId } from "mongodb";
import { getDb, mongoStatus } from "../db/mongo.js";
import { collections } from "./collections.js";
import {
  applySessionLifecycleTransition,
  createSessionLifecycle,
  endSessionLifecycle,
  recoverStaleSessionLifecycle,
  sessionPartialSourceWarnings,
  startSessionLifecycle
} from "../services/sessionLifecycleService.js";

function sessions() {
  return getDb().collection(collections.sessions);
}

function requireMongo() {
  if (mongoStatus().connected) return;
  const error = new Error("MongoDB is required for unified session lifecycle management.");
  error.status = 503;
  error.code = "SESSION_STORAGE_UNAVAILABLE";
  throw error;
}

function objectIdFrom(value = "") {
  return ObjectId.isValid(String(value)) ? new ObjectId(String(value)) : null;
}

function requiredObjectId(value, label) {
  const id = objectIdFrom(value);
  if (id) return id;
  const error = new Error(`${label} is invalid.`);
  error.status = 400;
  error.code = "SESSION_LIFECYCLE_INVALID";
  throw error;
}

function idString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return idString(value._id);
  return String(value);
}

function conflict(message = "Session lifecycle changed concurrently. Refresh and retry.") {
  const error = new Error(message);
  error.status = 409;
  error.code = "SESSION_LIFECYCLE_CONCURRENT_CHANGE";
  return error;
}

function invalidProcessing(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = "SESSION_PROCESSING_INVALID";
  return error;
}

function notFound() {
  const error = new Error("Campaign session was not found.");
  error.status = 404;
  error.code = "SESSION_NOT_FOUND";
  return error;
}

function canonicalInstant(value, label) {
  const instant = String(value || "").trim();
  const parsed = Date.parse(instant);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== instant) {
    throw invalidProcessing(`${label} must be a canonical UTC timestamp.`);
  }
  return instant;
}

function positiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw invalidProcessing(`${label} must be a positive integer.`);
  }
  return parsed;
}

function nonNegativeInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw invalidProcessing(`${label} must be a non-negative integer.`);
  }
  return parsed;
}

function processingProgress(value) {
  const parsed = nonNegativeInteger(value, "Processing progress");
  if (parsed >= 100) {
    throw invalidProcessing("Progress reports must remain below 100 until review-ready completion.");
  }
  return parsed;
}

function assertLifecycleScope(lifecycle, { workspaceId, campaignId }) {
  if (!lifecycle) return;
  if (String(lifecycle.workspaceId || "") !== String(workspaceId || "")
    || String(lifecycle.campaignId || "") !== String(campaignId || "")) {
    const error = new Error("Session lifecycle tenant scope does not match the active campaign.");
    error.status = 409;
    error.code = "SESSION_LIFECYCLE_SCOPE_MISMATCH";
    throw error;
  }
}

function publicLifecycle(session) {
  if (!session?.lifecycle) return null;
  return {
    schemaVersion: session.lifecycle.schemaVersion || "hed27-session-lifecycle-v1",
    id: idString(session._id),
    workspaceId: String(session.lifecycle.workspaceId || ""),
    campaignId: idString(session.campaignId || session.lifecycle.campaignId),
    title: session.title || "Untitled session",
    scheduledAt: session.scheduledAt || null,
    status: session.lifecycle.status || "draft",
    sourceRanges: Array.isArray(session.lifecycle.sourceRanges) ? session.lifecycle.sourceRanges : [],
    processing: session.lifecycle.processing || {},
    reviewSets: Array.isArray(session.lifecycle.reviewSets) ? session.lifecycle.reviewSets : [],
    lifecycleRevision: Number(session.lifecycle.lifecycleRevision || 0),
    transitions: Array.isArray(session.lifecycle.transitions) ? session.lifecycle.transitions : [],
    createdBy: String(session.lifecycle.createdBy || ""),
    updatedBy: String(session.lifecycle.updatedBy || ""),
    createdAt: session.lifecycle.createdAt || session.createdAt || "",
    updatedAt: session.lifecycle.updatedAt || session.updatedAt || "",
    warnings: sessionPartialSourceWarnings(session.lifecycle),
    legacyStatus: session.status || ""
  };
}

async function findSessionDocument({ campaignId, sessionId }) {
  requireMongo();
  return sessions().findOne({
    _id: requiredObjectId(sessionId, "Session id"),
    campaignId: requiredObjectId(campaignId, "Campaign id")
  });
}

export async function readSessionLifecycle({ workspaceId, campaignId, sessionId }) {
  const session = await findSessionDocument({ campaignId, sessionId });
  if (!session) throw notFound();
  if (!session.lifecycle) {
    return {
      session: {
        id: idString(session._id),
        campaignId: idString(session.campaignId),
        title: session.title || "Untitled session",
        scheduledAt: session.scheduledAt || null,
        legacyStatus: session.status || "",
        lifecycle: null
      },
      initialized: false
    };
  }
  assertLifecycleScope(session.lifecycle, { workspaceId, campaignId });
  return { session: publicLifecycle(session), initialized: true };
}

export async function ensureSessionLifecycle({ workspaceId, campaignId, sessionId, userId, occurredAt }) {
  requireMongo();
  const campaignObjectId = requiredObjectId(campaignId, "Campaign id");
  const sessionObjectId = requiredObjectId(sessionId, "Session id");
  let session = await sessions().findOne({ _id: sessionObjectId, campaignId: campaignObjectId });
  if (!session) throw notFound();

  if (session.lifecycle) {
    assertLifecycleScope(session.lifecycle, { workspaceId, campaignId });
    return { session: publicLifecycle(session), initialized: false };
  }

  const lifecycle = createSessionLifecycle({ workspaceId, campaignId, userId, occurredAt });
  const result = await sessions().updateOne(
    { _id: sessionObjectId, campaignId: campaignObjectId, lifecycle: { $exists: false } },
    { $set: { lifecycle, updatedAt: lifecycle.updatedAt, updatedBy: objectIdFrom(userId) || userId } }
  );

  session = await sessions().findOne({ _id: sessionObjectId, campaignId: campaignObjectId });
  if (!session) throw notFound();
  assertLifecycleScope(session.lifecycle, { workspaceId, campaignId });
  return { session: publicLifecycle(session), initialized: Boolean(result.modifiedCount) };
}

async function runLifecycleMutation({
  workspaceId,
  campaignId,
  sessionId,
  userId,
  occurredAt,
  mutate
}) {
  const initialized = await ensureSessionLifecycle({ workspaceId, campaignId, sessionId, userId, occurredAt });
  const current = initialized.session;
  const result = mutate(current);
  if (result.idempotent) return { session: current, idempotent: true };

  const campaignObjectId = requiredObjectId(campaignId, "Campaign id");
  const sessionObjectId = requiredObjectId(sessionId, "Session id");
  const update = await sessions().updateOne(
    {
      _id: sessionObjectId,
      campaignId: campaignObjectId,
      "lifecycle.lifecycleRevision": current.lifecycleRevision,
      "lifecycle.status": current.status
    },
    {
      $set: {
        lifecycle: result.lifecycle,
        updatedAt: result.lifecycle.updatedAt,
        updatedBy: objectIdFrom(userId) || userId
      }
    }
  );

  if (!update.modifiedCount) {
    const latest = await sessions().findOne({ _id: sessionObjectId, campaignId: campaignObjectId });
    if (!latest) throw notFound();
    assertLifecycleScope(latest.lifecycle, { workspaceId, campaignId });
    if (latest.lifecycle?.status === result.lifecycle.status
      && Number(latest.lifecycle?.lifecycleRevision || 0) >= Number(result.lifecycle.lifecycleRevision || 0)) {
      return { session: publicLifecycle(latest), idempotent: true };
    }
    throw conflict();
  }

  const saved = await sessions().findOne({ _id: sessionObjectId, campaignId: campaignObjectId });
  if (!saved) throw notFound();
  return { session: publicLifecycle(saved), idempotent: false };
}

export async function transitionCampaignSessionLifecycle({
  workspaceId,
  campaignId,
  sessionId,
  userId,
  input = {}
}) {
  return runLifecycleMutation({
    workspaceId,
    campaignId,
    sessionId,
    userId,
    occurredAt: input.occurredAt,
    mutate(current) {
      return applySessionLifecycleTransition(current, {
        ...input,
        actorUserId: userId
      });
    }
  });
}

export async function startCampaignSessionLifecycle({
  workspaceId,
  campaignId,
  sessionId,
  userId,
  input = {}
}) {
  return runLifecycleMutation({
    workspaceId,
    campaignId,
    sessionId,
    userId,
    occurredAt: input.occurredAt,
    mutate(current) {
      return startSessionLifecycle(current, { ...input, actorUserId: userId });
    }
  });
}

export async function endCampaignSessionLifecycle({
  workspaceId,
  campaignId,
  sessionId,
  userId,
  input = {}
}) {
  return runLifecycleMutation({
    workspaceId,
    campaignId,
    sessionId,
    userId,
    occurredAt: input.occurredAt,
    mutate(current) {
      return endSessionLifecycle(current, { ...input, actorUserId: userId });
    }
  });
}

export async function recoverCampaignSessionLifecycle({
  workspaceId,
  campaignId,
  sessionId,
  userId,
  input = {}
}) {
  return runLifecycleMutation({
    workspaceId,
    campaignId,
    sessionId,
    userId,
    occurredAt: input.occurredAt,
    mutate(current) {
      return recoverStaleSessionLifecycle(current, { ...input, actorUserId: userId });
    }
  });
}

export async function reportSessionProcessingProgress({
  workspaceId,
  campaignId,
  sessionId,
  processingVersion,
  jobId,
  attempt,
  progressPercent,
  costMicros,
  latencyMs,
  leaseExpiresAt,
  occurredAt = new Date().toISOString()
}) {
  requireMongo();
  const campaignObjectId = requiredObjectId(campaignId, "Campaign id");
  const sessionObjectId = requiredObjectId(sessionId, "Session id");
  const expectedProcessingVersion = positiveInteger(processingVersion, "Processing version");
  const expectedAttempt = positiveInteger(attempt, "Processing attempt");
  const nextProgress = processingProgress(progressPercent);
  const nextCostMicros = nonNegativeInteger(costMicros, "Processing cost");
  const nextLatencyMs = nonNegativeInteger(latencyMs, "Processing latency");
  const stamp = canonicalInstant(occurredAt, "Processing report time");
  const nextLeaseExpiresAt = canonicalInstant(leaseExpiresAt, "Processing lease expiry");
  if (Date.parse(nextLeaseExpiresAt) <= Date.parse(stamp)) {
    throw invalidProcessing("Processing lease expiry must be after the progress report time.");
  }
  const expectedJobId = String(jobId || "").trim();
  if (!expectedJobId) throw invalidProcessing("Processing job id is required.");

  const session = await sessions().findOne({ _id: sessionObjectId, campaignId: campaignObjectId });
  if (!session?.lifecycle) throw notFound();
  assertLifecycleScope(session.lifecycle, { workspaceId, campaignId });
  if (session.lifecycle.status !== "processing") {
    const error = new Error("Processing progress can only update a session in processing state.");
    error.status = 409;
    error.code = "SESSION_PROGRESS_NOT_ALLOWED";
    throw error;
  }
  if (Number(session.lifecycle.processing?.processingVersion || 0) !== expectedProcessingVersion
    || String(session.lifecycle.processing?.jobId || "") !== expectedJobId
    || Number(session.lifecycle.processing?.attempt || 0) !== expectedAttempt) {
    throw conflict("Processing progress belongs to a stale processing version or job attempt.");
  }

  const currentProgress = Number(session.lifecycle.processing?.progressPercent || 0);
  if (nextProgress < currentProgress) {
    const error = new Error("Processing progress cannot move backward.");
    error.status = 409;
    error.code = "SESSION_PROGRESS_REGRESSION";
    throw error;
  }

  const nextProcessing = {
    ...session.lifecycle.processing,
    progressPercent: nextProgress,
    costMicros: nextCostMicros,
    latencyMs: nextLatencyMs,
    leaseExpiresAt: nextLeaseExpiresAt
  };

  const update = await sessions().updateOne(
    {
      _id: sessionObjectId,
      campaignId: campaignObjectId,
      "lifecycle.status": "processing",
      "lifecycle.lifecycleRevision": Number(session.lifecycle.lifecycleRevision || 0),
      "lifecycle.processing.processingVersion": expectedProcessingVersion,
      "lifecycle.processing.jobId": expectedJobId,
      "lifecycle.processing.attempt": expectedAttempt,
      "lifecycle.processing.progressPercent": currentProgress
    },
    {
      $set: {
        "lifecycle.processing": nextProcessing,
        "lifecycle.updatedAt": stamp,
        updatedAt: stamp
      }
    }
  );
  if (!update.modifiedCount) throw conflict("Processing progress changed concurrently.");

  const saved = await sessions().findOne({ _id: sessionObjectId, campaignId: campaignObjectId });
  return { session: publicLifecycle(saved), idempotent: nextProgress === currentProgress };
}
