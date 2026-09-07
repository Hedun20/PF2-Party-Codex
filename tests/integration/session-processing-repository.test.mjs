import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { ObjectId } from "mongodb";

import { config } from "../../apps/server/src/config.js";
import { closeMongo, connectMongo, getDb } from "../../apps/server/src/db/mongo.js";
import {
  endCampaignSessionLifecycle,
  ensureSessionLifecycle,
  startCampaignSessionLifecycle,
  submitSessionProcessingReport,
  transitionCampaignSessionLifecycle
} from "../../apps/server/src/repositories/sessionLifecycleRepository.js";

const SAFE_DATABASE_PREFIX = "pf2_party_codex_test_";
const SAFE_MONGO_HOSTS = new Set(["127.0.0.1", "localhost"]);
const WORKER_ID = "session-processing-worker-test-v1";

const ids = {
  workspace: new ObjectId(),
  otherWorkspace: new ObjectId(),
  campaign: new ObjectId(),
  reviewSession: new ObjectId(),
  failedSession: new ObjectId(),
  user: new ObjectId()
};

let database;

function assertDisposableTarget() {
  assert.ok(config.mongoUri, "MONGO_URI is required for session processing repository tests");
  assert.match(
    config.mongoDbName,
    new RegExp(`^${SAFE_DATABASE_PREFIX}[A-Za-z0-9_]+$`),
    `Refusing non-disposable Mongo database name: ${config.mongoDbName}`
  );
  const target = new URL(config.mongoUri);
  assert.ok(SAFE_MONGO_HOSTS.has(target.hostname), `Refusing non-local Mongo host: ${target.hostname}`);
  assert.equal(target.username, "");
  assert.equal(target.password, "");
}

function scope(sessionId) {
  return {
    workspaceId: ids.workspace.toString(),
    campaignId: ids.campaign.toString(),
    sessionId: sessionId.toString(),
    userId: ids.user.toString()
  };
}

function sourceRanges() {
  return [
    {
      provider: "manual",
      connectionId: null,
      stream: "gm.manual",
      state: "ready",
      fromCursor: null,
      toCursor: "12",
      schemaVersion: "manual-v1",
      adapterVersion: "manual-v1",
      warningCode: null
    }
  ];
}

async function seedSession(sessionId, title) {
  const stamp = "2026-09-07T10:00:00.000Z";
  await database.collection("sessions").insertOne({
    _id: sessionId,
    campaignId: ids.campaign,
    title,
    status: "planned",
    createdBy: ids.user,
    updatedBy: ids.user,
    createdAt: stamp,
    updatedAt: stamp
  });
}

async function prepareProcessing(sessionId, jobId) {
  const target = scope(sessionId);
  await ensureSessionLifecycle({ ...target, occurredAt: "2026-09-07T10:00:01.000Z" });
  await transitionCampaignSessionLifecycle({
    ...target,
    input: {
      to: "connected",
      sourceRanges: sourceRanges(),
      occurredAt: "2026-09-07T10:01:00.000Z",
      reasonCode: "GM_CONNECT"
    }
  });
  await startCampaignSessionLifecycle({ ...target, input: { occurredAt: "2026-09-07T10:02:00.000Z" } });
  await endCampaignSessionLifecycle({ ...target, input: { occurredAt: "2026-09-07T10:03:00.000Z" } });
  await transitionCampaignSessionLifecycle({
    ...target,
    input: {
      to: "queued",
      occurredAt: "2026-09-07T10:04:00.000Z",
      reasonCode: "GM_QUEUE_PROCESSING"
    }
  });
  return transitionCampaignSessionLifecycle({
    ...target,
    input: {
      to: "processing",
      actorKind: "worker",
      actorId: WORKER_ID,
      occurredAt: "2026-09-07T10:05:00.000Z",
      reasonCode: "WORKER_CLAIM",
      jobId,
      leaseExpiresAt: "2026-09-07T10:10:00.000Z"
    }
  });
}

function report(sessionId, jobId, outcome, overrides = {}) {
  const base = {
    schemaVersion: "hed27-session-processing-report-v1",
    workspaceId: ids.workspace.toString(),
    campaignId: ids.campaign.toString(),
    sessionId: sessionId.toString(),
    processingVersion: 1,
    jobId,
    attempt: 1,
    outcome,
    progressPercent: 40,
    leaseExpiresAt: "2026-09-07T10:11:00.000Z",
    reviewSetId: null,
    costMicros: 12000,
    latencyMs: 4100,
    safeErrorCode: null,
    occurredAt: "2026-09-07T10:06:00.000Z"
  };
  if (outcome === "reviewReady") {
    Object.assign(base, {
      progressPercent: 100,
      leaseExpiresAt: null,
      reviewSetId: `review-${sessionId.toString()}`,
      costMicros: 150000,
      latencyMs: 89000,
      occurredAt: "2026-09-07T10:08:00.000Z"
    });
  }
  if (outcome === "failed") {
    Object.assign(base, {
      progressPercent: 60,
      leaseExpiresAt: null,
      safeErrorCode: "MODEL_TIMEOUT",
      occurredAt: "2026-09-07T10:08:00.000Z"
    });
  }
  return { ...base, ...overrides };
}

before(async () => {
  assertDisposableTarget();
  const status = await connectMongo();
  assert.equal(status.connected, true);
  database = getDb();
  await database.dropDatabase();
  await seedSession(ids.reviewSession, "Review-ready worker session");
  await seedSession(ids.failedSession, "Failed worker session");
  await prepareProcessing(ids.reviewSession, "job-review-session-v1");
  await prepareProcessing(ids.failedSession, "job-failed-session-v1");
});

after(async () => {
  if (database) await database.dropDatabase();
  await closeMongo({ silent: true });
});

test("worker progress crosses the archive owner only with exact scope, version and attempt", async () => {
  const result = await submitSessionProcessingReport({
    workerId: WORKER_ID,
    report: report(ids.reviewSession, "job-review-session-v1", "progress")
  });
  assert.equal(result.session.status, "processing");
  assert.equal(result.session.processing.progressPercent, 40);

  await assert.rejects(
    submitSessionProcessingReport({
      workerId: WORKER_ID,
      report: report(ids.reviewSession, "job-review-session-v1", "progress", {
        processingVersion: 2,
        progressPercent: 50,
        occurredAt: "2026-09-07T10:06:30.000Z",
        leaseExpiresAt: "2026-09-07T10:11:30.000Z"
      })
    }),
    (error) => error.status === 409 && error.code === "SESSION_LIFECYCLE_CONCURRENT_CHANGE"
  );

  await assert.rejects(
    submitSessionProcessingReport({
      workerId: WORKER_ID,
      report: report(ids.reviewSession, "job-review-session-v1", "progress", {
        attempt: 2,
        progressPercent: 50,
        occurredAt: "2026-09-07T10:06:30.000Z",
        leaseExpiresAt: "2026-09-07T10:11:30.000Z"
      })
    }),
    (error) => error.status === 409 && error.code === "SESSION_LIFECYCLE_CONCURRENT_CHANGE"
  );
});

test("review-ready worker result creates exactly one review set and retry is idempotent", async () => {
  const terminal = report(ids.reviewSession, "job-review-session-v1", "reviewReady");
  const result = await submitSessionProcessingReport({ workerId: WORKER_ID, report: terminal });
  assert.equal(result.idempotent, false);
  assert.equal(result.session.status, "reviewReady");
  assert.equal(result.session.processing.progressPercent, 100);
  assert.equal(result.session.reviewSets.length, 1);
  assert.equal(result.session.reviewSets[0].reviewSetId, terminal.reviewSetId);
  assert.equal(result.session.transitions.at(-1).actorKind, "worker");
  assert.equal(result.session.transitions.at(-1).actorId, WORKER_ID);

  const retry = await submitSessionProcessingReport({ workerId: WORKER_ID, report: terminal });
  assert.equal(retry.idempotent, true);
  assert.equal(retry.session.reviewSets.length, 1);

  await assert.rejects(
    submitSessionProcessingReport({
      workerId: WORKER_ID,
      report: { ...terminal, reviewSetId: "review-conflicting-v1" }
    }),
    (error) => error.status === 409 && error.code === "SESSION_LIFECYCLE_CONCURRENT_CHANGE"
  );

  const stored = await database.collection("sessions").findOne({ _id: ids.reviewSession });
  assert.equal(stored.status, "planned", "worker completion must preserve the rollback session status");
  assert.equal(stored.updatedBy.toString(), ids.user.toString(), "worker completion must not impersonate a human editor");
});

test("failed worker result preserves final progress and blocks stale terminal mutation", async () => {
  const failed = report(ids.failedSession, "job-failed-session-v1", "failed");
  const result = await submitSessionProcessingReport({ workerId: WORKER_ID, report: failed });
  assert.equal(result.session.status, "failed");
  assert.equal(result.session.processing.progressPercent, 60);
  assert.equal(result.session.processing.safeErrorCode, "MODEL_TIMEOUT");
  assert.equal(result.session.reviewSets.length, 0);
  assert.equal(result.session.transitions.at(-1).reasonCode, "WORKER_FAILURE");

  const retry = await submitSessionProcessingReport({ workerId: WORKER_ID, report: failed });
  assert.equal(retry.idempotent, true);

  await assert.rejects(
    submitSessionProcessingReport({
      workerId: WORKER_ID,
      report: report(ids.failedSession, "job-failed-session-v1", "reviewReady")
    }),
    (error) => error.status === 409 && error.code === "SESSION_LIFECYCLE_CONCURRENT_CHANGE"
  );
});

test("worker report validation fails closed before tenant or payload confusion can mutate storage", async () => {
  const base = report(ids.failedSession, "job-failed-session-v1", "failed");

  await assert.rejects(
    submitSessionProcessingReport({
      workerId: WORKER_ID,
      report: { ...base, workspaceId: ids.otherWorkspace.toString() }
    }),
    (error) => error.status === 409 && error.code === "SESSION_LIFECYCLE_SCOPE_MISMATCH"
  );

  await assert.rejects(
    submitSessionProcessingReport({
      workerId: WORKER_ID,
      report: { ...base, rawEvidence: "forbidden" }
    }),
    (error) => error.status === 400 && error.code === "SESSION_PROCESSING_INVALID"
  );
});
