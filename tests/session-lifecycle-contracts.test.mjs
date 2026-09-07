import assert from "node:assert/strict";
import test from "node:test";

import {
  applySessionLifecycleTransition,
  createSessionLifecycle,
  endSessionLifecycle,
  normalizeSessionSourceRanges,
  recoverStaleSessionLifecycle,
  sessionPartialSourceWarnings,
  startSessionLifecycle
} from "../apps/server/src/services/sessionLifecycleService.js";

const GM = "user-redacted-gm-001";

function baseLifecycle() {
  return createSessionLifecycle({
    workspaceId: "workspace-redacted-001",
    campaignId: "campaign-redacted-001",
    userId: GM,
    occurredAt: "2026-09-07T10:00:00.000Z"
  });
}

function sources() {
  return [
    {
      provider: "foundry",
      connectionId: "connection-foundry-001",
      stream: "world.events",
      state: "ready",
      fromCursor: "10",
      toCursor: null,
      schemaVersion: "hed56-event-v1",
      adapterVersion: "foundry-v14-adapter-v1",
      warningCode: null
    },
    {
      provider: "discord",
      connectionId: "connection-discord-001",
      stream: "campaign.chat",
      state: "partial",
      fromCursor: "41",
      toCursor: "48",
      schemaVersion: "hed70-discord-message-v1",
      adapterVersion: "discord-v10-adapter-v1",
      warningCode: "MESSAGE_CONTENT_PARTIAL"
    }
  ];
}

function connect(lifecycle) {
  return applySessionLifecycleTransition(lifecycle, {
    to: "connected",
    actorUserId: GM,
    reasonCode: "GM_CONNECT",
    occurredAt: "2026-09-07T10:01:00.000Z",
    sourceRanges: sources()
  }).lifecycle;
}

test("GM collection start, pause, resume and end are idempotent where repeated actions are expected", () => {
  let lifecycle = connect(baseLifecycle());

  let result = startSessionLifecycle(lifecycle, {
    actorUserId: GM,
    occurredAt: "2026-09-07T10:02:00.000Z"
  });
  lifecycle = result.lifecycle;
  assert.equal(lifecycle.status, "collecting");
  assert.equal(result.idempotent, false);

  result = startSessionLifecycle(lifecycle, {
    actorUserId: GM,
    occurredAt: "2026-09-07T10:02:01.000Z"
  });
  assert.equal(result.idempotent, true);
  assert.equal(result.lifecycle.lifecycleRevision, 2);

  lifecycle = applySessionLifecycleTransition(lifecycle, {
    to: "paused",
    actorUserId: GM,
    reasonCode: "GM_PAUSE",
    occurredAt: "2026-09-07T10:03:00.000Z"
  }).lifecycle;
  assert.equal(lifecycle.status, "paused");

  lifecycle = startSessionLifecycle(lifecycle, {
    actorUserId: GM,
    occurredAt: "2026-09-07T10:04:00.000Z"
  }).lifecycle;
  assert.equal(lifecycle.status, "collecting");

  result = endSessionLifecycle(lifecycle, {
    actorUserId: GM,
    occurredAt: "2026-09-07T11:00:00.000Z",
    sourceRanges: sources().map((source) => ({ ...source, toCursor: source.provider === "foundry" ? "90" : "77" }))
  });
  lifecycle = result.lifecycle;
  assert.equal(lifecycle.status, "ended");

  result = endSessionLifecycle(lifecycle, {
    actorUserId: GM,
    occurredAt: "2026-09-07T11:00:01.000Z"
  });
  assert.equal(result.idempotent, true);
  assert.equal(result.lifecycle.lifecycleRevision, 5);
});

test("processing versions, retries and review sets stay deterministic", () => {
  let lifecycle = endSessionLifecycle(
    startSessionLifecycle(connect(baseLifecycle()), {
      actorUserId: GM,
      occurredAt: "2026-09-07T10:02:00.000Z"
    }).lifecycle,
    {
      actorUserId: GM,
      occurredAt: "2026-09-07T11:00:00.000Z"
    }
  ).lifecycle;

  lifecycle = applySessionLifecycleTransition(lifecycle, {
    to: "queued",
    actorUserId: GM,
    reasonCode: "GM_QUEUE_PROCESSING",
    occurredAt: "2026-09-07T11:00:01.000Z"
  }).lifecycle;
  assert.equal(lifecycle.processing.processingVersion, 1);

  lifecycle = applySessionLifecycleTransition(lifecycle, {
    to: "processing",
    actorUserId: GM,
    reasonCode: "WORKER_CLAIM",
    occurredAt: "2026-09-07T11:00:02.000Z",
    jobId: "job-session-001",
    leaseExpiresAt: "2026-09-07T11:05:02.000Z"
  }).lifecycle;
  assert.equal(lifecycle.processing.attempt, 1);

  lifecycle = applySessionLifecycleTransition(lifecycle, {
    to: "failed",
    actorUserId: GM,
    reasonCode: "WORKER_FAILURE",
    occurredAt: "2026-09-07T11:01:00.000Z",
    safeErrorCode: "MODEL_TIMEOUT"
  }).lifecycle;
  assert.equal(lifecycle.processing.safeErrorCode, "MODEL_TIMEOUT");

  lifecycle = applySessionLifecycleTransition(lifecycle, {
    to: "queued",
    actorUserId: GM,
    reasonCode: "GM_RETRY",
    occurredAt: "2026-09-07T11:01:30.000Z"
  }).lifecycle;
  assert.equal(lifecycle.processing.processingVersion, 1);

  lifecycle = applySessionLifecycleTransition(lifecycle, {
    to: "processing",
    actorUserId: GM,
    reasonCode: "WORKER_RETRY_CLAIM",
    occurredAt: "2026-09-07T11:01:31.000Z",
    jobId: "job-session-001-retry",
    leaseExpiresAt: "2026-09-07T11:06:31.000Z"
  }).lifecycle;
  assert.equal(lifecycle.processing.attempt, 2);

  lifecycle = applySessionLifecycleTransition(lifecycle, {
    to: "reviewReady",
    actorUserId: GM,
    reasonCode: "WORKER_REVIEW_READY",
    occurredAt: "2026-09-07T11:03:00.000Z",
    reviewSetId: "review-session-001-v1",
    costMicros: 150000,
    latencyMs: 89000
  }).lifecycle;
  assert.equal(lifecycle.reviewSets.length, 1);
  assert.equal(lifecycle.reviewSets[0].processingVersion, 1);

  lifecycle = applySessionLifecycleTransition(lifecycle, {
    to: "published",
    actorUserId: GM,
    reasonCode: "GM_PUBLISH",
    occurredAt: "2026-09-07T11:04:00.000Z"
  }).lifecycle;
  assert.equal(lifecycle.status, "published");
  assert.equal(lifecycle.reviewSets[0].publishedAt, "2026-09-07T11:04:00.000Z");

  assert.throws(() => applySessionLifecycleTransition(lifecycle, {
    to: "queued",
    actorUserId: GM,
    occurredAt: "2026-09-07T11:05:00.000Z"
  }), /not allowed/i);
});

test("stale processing lease recovery requeues the same processing version", () => {
  let lifecycle = endSessionLifecycle(
    startSessionLifecycle(connect(baseLifecycle()), {
      actorUserId: GM,
      occurredAt: "2026-09-07T10:02:00.000Z"
    }).lifecycle,
    { actorUserId: GM, occurredAt: "2026-09-07T11:00:00.000Z" }
  ).lifecycle;
  lifecycle = applySessionLifecycleTransition(lifecycle, {
    to: "queued",
    actorUserId: GM,
    occurredAt: "2026-09-07T11:00:01.000Z",
    reasonCode: "GM_QUEUE_PROCESSING"
  }).lifecycle;
  lifecycle = applySessionLifecycleTransition(lifecycle, {
    to: "processing",
    actorUserId: GM,
    occurredAt: "2026-09-07T11:00:02.000Z",
    reasonCode: "WORKER_CLAIM",
    jobId: "job-stale-001",
    leaseExpiresAt: "2026-09-07T11:01:02.000Z"
  }).lifecycle;

  assert.throws(() => recoverStaleSessionLifecycle(lifecycle, {
    actorUserId: GM,
    occurredAt: "2026-09-07T11:00:30.000Z"
  }), /still active/i);

  const recovered = recoverStaleSessionLifecycle(lifecycle, {
    actorUserId: GM,
    occurredAt: "2026-09-07T11:01:03.000Z"
  });
  assert.equal(recovered.lifecycle.status, "queued");
  assert.equal(recovered.lifecycle.processing.processingVersion, 1);
  assert.equal(recovered.lifecycle.processing.jobId, null);
  assert.equal(recovered.lifecycle.transitions.at(-1).reasonCode, "STALE_PROCESSING_RECOVERY");
});

test("partial sources are visible as bounded warnings and invalid authority fails closed", () => {
  const normalized = normalizeSessionSourceRanges(sources());
  const lifecycle = connect(baseLifecycle());
  assert.equal(normalized.length, 2);
  assert.deepEqual(sessionPartialSourceWarnings(lifecycle), [
    {
      provider: "discord",
      stream: "campaign.chat",
      state: "partial",
      warningCode: "MESSAGE_CONTENT_PARTIAL"
    }
  ]);

  assert.throws(() => normalizeSessionSourceRanges([
    { ...sources()[0], connectionId: null }
  ]), /requires a configured connection/i);

  assert.throws(() => normalizeSessionSourceRanges([
    {
      provider: "manual",
      connectionId: "connection-forbidden",
      stream: "gm.manual",
      state: "ready",
      fromCursor: null,
      toCursor: null,
      schemaVersion: "manual-v1",
      adapterVersion: "manual-v1",
      warningCode: null
    }
  ]), /cannot claim an integration connection/i);

  assert.throws(() => normalizeSessionSourceRanges([
    sources()[0],
    { ...sources()[0] }
  ]), /duplicate/i);
});
