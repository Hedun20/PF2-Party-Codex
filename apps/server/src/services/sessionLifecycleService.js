const SESSION_LIFECYCLE_STATES = new Set([
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
]);

const SOURCE_PROVIDERS = new Set(["foundry", "discord", "manual"]);
const SOURCE_STATES = new Set(["ready", "partial", "unavailable"]);
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_CURSOR = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;
const SAFE_CODE = /^[A-Z][A-Z0-9_]{1,127}$/;
const MAX_SOURCE_RANGES = 32;
const MAX_TRANSITIONS = 128;

const ALLOWED_TRANSITIONS = {
  draft: new Set(["connected", "canceled"]),
  connected: new Set(["collecting", "ended", "canceled"]),
  collecting: new Set(["paused", "ended", "failed", "canceled"]),
  paused: new Set(["collecting", "ended", "failed", "canceled"]),
  ended: new Set(["queued", "canceled"]),
  queued: new Set(["processing", "canceled"]),
  processing: new Set(["reviewReady", "failed", "canceled"]),
  reviewReady: new Set(["published", "queued", "canceled"]),
  published: new Set(),
  failed: new Set(["queued", "canceled"]),
  canceled: new Set()
};

const ENDED_OR_LATER = new Set(["ended", "queued", "processing", "reviewReady", "published", "failed"]);

function lifecycleError(message, status = 409, code = "SESSION_LIFECYCLE_CONFLICT") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function cleanId(value, label) {
  const id = String(value || "").trim();
  if (!SAFE_ID.test(id)) throw lifecycleError(`${label} is invalid.`, 400, "SESSION_LIFECYCLE_INVALID");
  return id;
}

function cleanCode(value, label) {
  const code = String(value || "").trim().toUpperCase();
  if (!SAFE_CODE.test(code)) throw lifecycleError(`${label} is invalid.`, 400, "SESSION_LIFECYCLE_INVALID");
  return code;
}

function cleanCursor(value, label) {
  if (value === null || value === undefined || value === "") return null;
  const cursor = String(value).trim();
  if (!SAFE_CURSOR.test(cursor)) throw lifecycleError(`${label} is invalid.`, 400, "SESSION_LIFECYCLE_INVALID");
  return cursor;
}

function canonicalInstant(value, label) {
  const instant = String(value || "").trim();
  const parsed = Date.parse(instant);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== instant) {
    throw lifecycleError(`${label} must be a canonical UTC timestamp.`, 400, "SESSION_LIFECYCLE_INVALID");
  }
  return instant;
}

function publicConnectionId(value) {
  return value === null || value === undefined || value === "" ? null : cleanId(value, "Source connection id");
}

export function normalizeSessionSourceRanges(value = []) {
  if (!Array.isArray(value) || value.length > MAX_SOURCE_RANGES) {
    throw lifecycleError(`Source ranges must be an array with at most ${MAX_SOURCE_RANGES} items.`, 400, "SESSION_SOURCE_INVALID");
  }
  const seen = new Set();
  return value.map((item, index) => {
    const provider = String(item?.provider || "").trim().toLowerCase();
    if (!SOURCE_PROVIDERS.has(provider)) {
      throw lifecycleError(`Source range ${index + 1} has an unsupported provider.`, 400, "SESSION_SOURCE_INVALID");
    }
    const connectionId = publicConnectionId(item?.connectionId);
    if (provider === "manual" && connectionId) {
      throw lifecycleError("Manual session evidence cannot claim an integration connection.", 400, "SESSION_SOURCE_INVALID");
    }
    if (provider !== "manual" && !connectionId) {
      throw lifecycleError(`${provider} session evidence requires a configured connection.`, 400, "SESSION_SOURCE_INVALID");
    }

    const stream = cleanId(item?.stream, `Source range ${index + 1} stream`);
    const state = String(item?.state || "ready").trim();
    if (!SOURCE_STATES.has(state)) {
      throw lifecycleError(`Source range ${index + 1} has an invalid state.`, 400, "SESSION_SOURCE_INVALID");
    }
    const warningCode = item?.warningCode ? cleanCode(item.warningCode, `Source range ${index + 1} warning code`) : null;
    if (state === "ready" && warningCode) {
      throw lifecycleError("Ready source ranges cannot carry a warning code.", 400, "SESSION_SOURCE_INVALID");
    }
    if (state !== "ready" && !warningCode) {
      throw lifecycleError(`${state} source ranges require a safe warning code.`, 400, "SESSION_SOURCE_INVALID");
    }

    const normalized = {
      provider,
      connectionId,
      stream,
      state,
      fromCursor: cleanCursor(item?.fromCursor, `Source range ${index + 1} from cursor`),
      toCursor: cleanCursor(item?.toCursor, `Source range ${index + 1} to cursor`),
      schemaVersion: cleanId(item?.schemaVersion, `Source range ${index + 1} schema version`),
      adapterVersion: cleanId(item?.adapterVersion, `Source range ${index + 1} adapter version`),
      warningCode
    };
    const key = `${provider}:${connectionId || "manual"}:${stream}`;
    if (seen.has(key)) {
      throw lifecycleError(`Duplicate session source range: ${key}.`, 409, "SESSION_SOURCE_DUPLICATE");
    }
    seen.add(key);
    return normalized;
  });
}

export function createSessionLifecycle({ workspaceId, campaignId, userId, occurredAt = new Date().toISOString() } = {}) {
  const stamp = canonicalInstant(occurredAt, "Lifecycle creation time");
  return {
    schemaVersion: "hed27-session-lifecycle-v1",
    workspaceId: cleanId(workspaceId, "Workspace id"),
    campaignId: cleanId(campaignId, "Campaign id"),
    status: "draft",
    sourceRanges: [],
    processing: {
      processingVersion: 0,
      jobId: null,
      attempt: 0,
      progressPercent: 0,
      costMicros: 0,
      latencyMs: 0,
      queuedAt: null,
      startedAt: null,
      completedAt: null,
      leaseExpiresAt: null,
      safeErrorCode: null
    },
    reviewSets: [],
    lifecycleRevision: 0,
    transitions: [],
    createdBy: cleanId(userId, "User id"),
    updatedBy: cleanId(userId, "User id"),
    createdAt: stamp,
    updatedAt: stamp
  };
}

export function canTransitionSessionLifecycle(from, to) {
  return SESSION_LIFECYCLE_STATES.has(from)
    && SESSION_LIFECYCLE_STATES.has(to)
    && Boolean(ALLOWED_TRANSITIONS[from]?.has(to));
}

function transitionProcessing(current, from, to, input, stamp) {
  const processing = { ...(current.processing || {}) };
  if (to === "queued") {
    const newVersion = from === "ended" || from === "reviewReady";
    const processingVersion = newVersion
      ? Math.max(0, Number(processing.processingVersion || 0)) + 1
      : Math.max(1, Number(processing.processingVersion || 0));
    return {
      processingVersion,
      jobId: null,
      attempt: newVersion ? 0 : Math.max(0, Number(processing.attempt || 0)),
      progressPercent: newVersion ? 0 : Math.max(0, Number(processing.progressPercent || 0)),
      costMicros: newVersion ? 0 : Math.max(0, Number(processing.costMicros || 0)),
      latencyMs: newVersion ? 0 : Math.max(0, Number(processing.latencyMs || 0)),
      queuedAt: stamp,
      startedAt: null,
      completedAt: null,
      leaseExpiresAt: null,
      safeErrorCode: null
    };
  }

  if (to === "processing") {
    const jobId = cleanId(input.jobId, "Processing job id");
    const leaseExpiresAt = canonicalInstant(input.leaseExpiresAt, "Processing lease expiry");
    if (Date.parse(leaseExpiresAt) <= Date.parse(stamp)) {
      throw lifecycleError("Processing lease expiry must be after processing starts.", 400, "SESSION_PROCESSING_INVALID");
    }
    return {
      ...processing,
      processingVersion: Math.max(1, Number(processing.processingVersion || 0)),
      jobId,
      attempt: Math.max(0, Number(processing.attempt || 0)) + 1,
      progressPercent: 0,
      startedAt: stamp,
      completedAt: null,
      leaseExpiresAt,
      safeErrorCode: null
    };
  }

  if (to === "reviewReady") {
    return {
      ...processing,
      progressPercent: 100,
      completedAt: stamp,
      leaseExpiresAt: null,
      safeErrorCode: null,
      costMicros: Math.max(0, Number(input.costMicros ?? processing.costMicros ?? 0)),
      latencyMs: Math.max(0, Number(input.latencyMs ?? processing.latencyMs ?? 0))
    };
  }

  if (to === "failed") {
    return {
      ...processing,
      completedAt: stamp,
      leaseExpiresAt: null,
      safeErrorCode: cleanCode(input.safeErrorCode || "PROCESSING_FAILED", "Processing error code"),
      costMicros: Math.max(0, Number(input.costMicros ?? processing.costMicros ?? 0)),
      latencyMs: Math.max(0, Number(input.latencyMs ?? processing.latencyMs ?? 0))
    };
  }

  if (to === "canceled") {
    return { ...processing, leaseExpiresAt: null };
  }

  return processing;
}

function transitionReviewSets(current, from, to, input, stamp, processing) {
  const reviewSets = Array.isArray(current.reviewSets) ? current.reviewSets.map((item) => ({ ...item })) : [];
  if (to === "reviewReady") {
    const version = Math.max(1, Number(processing.processingVersion || 0));
    const reviewSetId = cleanId(input.reviewSetId, "Review set id");
    const existing = reviewSets.find((item) => Number(item.processingVersion) === version);
    if (existing && existing.reviewSetId !== reviewSetId) {
      throw lifecycleError(`Processing version ${version} already has a different review set.`, 409, "SESSION_REVIEW_SET_CONFLICT");
    }
    if (!existing) {
      reviewSets.push({ processingVersion: version, reviewSetId, createdAt: stamp, publishedAt: null });
    }
  }
  if (to === "published") {
    const version = Math.max(1, Number(processing.processingVersion || 0));
    const currentReview = reviewSets.find((item) => Number(item.processingVersion) === version);
    if (!currentReview) {
      throw lifecycleError("The current processing version has no review set to publish.", 409, "SESSION_REVIEW_SET_REQUIRED");
    }
    currentReview.publishedAt = currentReview.publishedAt || stamp;
  }
  return reviewSets;
}

export function applySessionLifecycleTransition(current, input = {}) {
  const from = String(current?.status || "").trim();
  const to = String(input.to || "").trim();
  if (!SESSION_LIFECYCLE_STATES.has(from) || !SESSION_LIFECYCLE_STATES.has(to)) {
    throw lifecycleError("Session lifecycle state is invalid.", 400, "SESSION_LIFECYCLE_INVALID");
  }
  if (from === to) return { lifecycle: current, idempotent: true };
  if (!canTransitionSessionLifecycle(from, to)) {
    throw lifecycleError(`Session lifecycle transition ${from} -> ${to} is not allowed.`, 409, "SESSION_TRANSITION_NOT_ALLOWED");
  }

  const actorUserId = cleanId(input.actorUserId, "Transition actor user id");
  const stamp = canonicalInstant(input.occurredAt || new Date().toISOString(), "Transition time");
  const reasonCode = cleanCode(input.reasonCode || "GM_ACTION", "Transition reason code");
  const transitions = Array.isArray(current.transitions) ? current.transitions.map((item) => ({ ...item })) : [];
  if (transitions.length >= MAX_TRANSITIONS) {
    throw lifecycleError("Session lifecycle transition history reached its bounded limit.", 409, "SESSION_HISTORY_LIMIT");
  }
  if (transitions.length && Date.parse(stamp) < Date.parse(transitions.at(-1)?.occurredAt || "")) {
    throw lifecycleError("Session lifecycle transitions cannot move backward in time.", 409, "SESSION_TRANSITION_TIME_CONFLICT");
  }

  let sourceRanges = Array.isArray(current.sourceRanges) ? current.sourceRanges.map((item) => ({ ...item })) : [];
  if (to === "connected") {
    sourceRanges = normalizeSessionSourceRanges(input.sourceRanges || []);
    if (!sourceRanges.length) {
      throw lifecycleError("Connect at least one Foundry, Discord or manual evidence source before collecting.", 409, "SESSION_SOURCE_REQUIRED");
    }
  } else if (to === "ended" && input.sourceRanges !== undefined) {
    sourceRanges = normalizeSessionSourceRanges(input.sourceRanges);
  }

  const processing = transitionProcessing(current, from, to, input, stamp);
  const reviewSets = transitionReviewSets(current, from, to, input, stamp, processing);
  transitions.push({
    sequence: transitions.length + 1,
    from,
    to,
    actorUserId,
    reasonCode,
    occurredAt: stamp
  });

  return {
    lifecycle: {
      ...current,
      status: to,
      sourceRanges,
      processing,
      reviewSets,
      lifecycleRevision: transitions.length,
      transitions,
      updatedBy: actorUserId,
      updatedAt: stamp
    },
    idempotent: false
  };
}

export function startSessionLifecycle(current, input = {}) {
  if (current?.status === "collecting") return { lifecycle: current, idempotent: true };
  if (!["connected", "paused"].includes(current?.status)) {
    throw lifecycleError("A session must be connected or paused before collection can start.", 409, "SESSION_START_NOT_ALLOWED");
  }
  return applySessionLifecycleTransition(current, { ...input, to: "collecting", reasonCode: input.reasonCode || (current.status === "paused" ? "GM_RESUME" : "GM_START") });
}

export function endSessionLifecycle(current, input = {}) {
  if (ENDED_OR_LATER.has(current?.status)) return { lifecycle: current, idempotent: true };
  if (!["connected", "collecting", "paused"].includes(current?.status)) {
    throw lifecycleError("Only a connected, collecting or paused session can end.", 409, "SESSION_END_NOT_ALLOWED");
  }
  return applySessionLifecycleTransition(current, { ...input, to: "ended", reasonCode: input.reasonCode || "GM_END" });
}

export function recoverStaleSessionLifecycle(current, input = {}) {
  if (current?.status !== "processing") {
    throw lifecycleError("Only a processing session can be recovered from a stale worker lease.", 409, "SESSION_RECOVERY_NOT_ALLOWED");
  }
  const now = canonicalInstant(input.occurredAt || new Date().toISOString(), "Recovery time");
  const leaseExpiresAt = current?.processing?.leaseExpiresAt;
  if (!leaseExpiresAt || Date.parse(leaseExpiresAt) > Date.parse(now)) {
    throw lifecycleError("The processing lease is still active; stale recovery is not allowed yet.", 409, "SESSION_LEASE_ACTIVE");
  }

  const failed = applySessionLifecycleTransition(current, {
    ...input,
    to: "failed",
    occurredAt: now,
    reasonCode: "STALE_PROCESSING_LEASE",
    safeErrorCode: "STALE_PROCESSING_LEASE"
  });
  return applySessionLifecycleTransition(failed.lifecycle, {
    ...input,
    to: "queued",
    occurredAt: now,
    reasonCode: input.reasonCode || "STALE_PROCESSING_RECOVERY"
  });
}

export function sessionPartialSourceWarnings(lifecycle) {
  return (lifecycle?.sourceRanges || [])
    .filter((source) => source.state !== "ready")
    .map((source) => ({ provider: source.provider, stream: source.stream, state: source.state, warningCode: source.warningCode }));
}
