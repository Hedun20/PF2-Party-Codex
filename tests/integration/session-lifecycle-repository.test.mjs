import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { ObjectId } from "mongodb";

import { config } from "../../apps/server/src/config.js";
import { closeMongo, connectMongo, getDb } from "../../apps/server/src/db/mongo.js";
import {
  endCampaignSessionLifecycle,
  ensureSessionLifecycle,
  recoverCampaignSessionLifecycle,
  reportSessionProcessingProgress,
  startCampaignSessionLifecycle,
  transitionCampaignSessionLifecycle
} from "../../apps/server/src/repositories/sessionLifecycleRepository.js";

const SAFE_DATABASE_PREFIX = "pf2_party_codex_test_";
const SAFE_MONGO_HOSTS = new Set(["127.0.0.1", "localhost"]);

const ids = {
  workspace: new ObjectId(),
  otherWorkspace: new ObjectId(),
  campaign: new ObjectId(),
  otherCampaign: new ObjectId(),
  session: new ObjectId(),
  secondSession: new ObjectId(),
  user: new ObjectId()
};

let database;

function assertDisposableTarget() {
  assert.ok(config.mongoUri, "MONGO_URI is required for session lifecycle repository tests");
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

function scope(sessionId = ids.session) {
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
      provider: "foundry",
      connectionId: "connection-foundry-test-001",
      stream: "world.events",
      state: "ready",
      fromCursor: "10",
      toCursor: "40",
      schemaVersion: "hed56-event-v1",
      adapterVersion: "foundry-v14-adapter-v1",
      warningCode: null
    },
    {
      provider: "discord",
      connectionId: "connection-discord-test-001",
      stream: "campaign.chat",
      state: "partial",
      fromCursor: "50",
      toCursor: "72",
      schemaVersion: "hed70-discord-message-v1",
      adapterVersion: "discord-v10-adapter-v1",
      warningCode: "MESSAGE_CONTENT_PARTIAL"
    }
  ];
}

async function seedSessions() {
  const stamp = "2026-09-07T10:00:00.000Z";
  await database.collection("sessions").insertMany([
    {
      _id: ids.session,
      campaignId: ids.campaign,
      title: "Repository lifecycle test",
      scheduledAt: "2026-09-07T18:00:00.000Z",
      status: "planned",
      createdBy: ids.user,
      updatedBy: ids.user,
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      _id: ids.secondSession,
      campaignId: ids.campaign,
      title: "Concurrent lifecycle test",
      scheduledAt: null,
      status: "planned",
      createdBy: ids.user,
      updatedBy: ids.user,
      createdAt: stamp,
      updatedAt: stamp
    }
  ]);
}

before(async () => {
  assertDisposableTarget();
  const status = await connectMongo();
  assert.equal(status.connected, true);
  database = getDb();
  await database.dropDatabase();
  await seedSessions();
});

after(async () => {
  if (database) await database.dropDatabase();
  await closeMongo({ silent: true });
});

test("legacy session lifecycle initializes lazily without replacing legacy session fields", async () => {
  const result = await ensureSessionLifecycle({
    ...scope(),
    occurredAt: "2026-09-07T10:00:01.000Z"
  });
  assert.equal(result.initialized, true);
  assert.equal(result.session.status, "draft");
  assert.equal(result.session.legacyStatus, "planned");
  assert.equal(result.session.workspaceId, ids.workspace.toString());
  assert.equal(result.session.campaignId, ids.campaign.toString());

  const stored = await database.collection("sessions").findOne({ _id: ids.session });
  assert.equal(stored.status, "planned", "legacy status must remain available to the rollback adapter");
  assert.equal(stored.title, "Repository lifecycle test");
  assert.equal(stored.lifecycle.status, "draft");

  const repeated = await ensureSessionLifecycle({
    ...scope(),
    occurredAt: "2026-09-07T10:00:02.000Z"
  });
  assert.equal(repeated.initialized, false);
  assert.equal(repeated.session.lifecycleRevision, 0);
});

test("session lifecycle rejects cross-workspace and cross-campaign substitution", async () => {
  await assert.rejects(
    ensureSessionLifecycle({
      ...scope(),
      workspaceId: ids.otherWorkspace.toString(),
      occurredAt: "2026-09-07T10:00:03.000Z"
    }),
    (error) => error.status === 409 && error.code === "SESSION_LIFECYCLE_SCOPE_MISMATCH"
  );

  await assert.rejects(
    ensureSessionLifecycle({
      ...scope(),
      campaignId: ids.otherCampaign.toString(),
      occurredAt: "2026-09-07T10:00:03.000Z"
    }),
    (error) => error.status === 404 && error.code === "SESSION_NOT_FOUND"
  );
});

test("concurrent collection starts converge to one transition and one idempotent result", async () => {
  const second = scope(ids.secondSession);
  await ensureSessionLifecycle({ ...second, occurredAt: "2026-09-07T10:01:00.000Z" });
  await transitionCampaignSessionLifecycle({
    ...second,
    input: {
      to: "connected",
      sourceRanges: sourceRanges(),
      occurredAt: "2026-09-07T10:01:01.000Z",
      reasonCode: "GM_CONNECT"
    }
  });

  const results = await Promise.all([
    startCampaignSessionLifecycle({ ...second, input: { occurredAt: "2026-09-07T10:01:02.000Z" } }),
    startCampaignSessionLifecycle({ ...second, input: { occurredAt: "2026-09-07T10:01:02.000Z" } })
  ]);
  assert.deepEqual(results.map((item) => item.idempotent).sort(), [false, true]);

  const stored = await database.collection("sessions").findOne({ _id: ids.secondSession });
  assert.equal(stored.lifecycle.status, "collecting");
  assert.equal(stored.lifecycle.lifecycleRevision, 2);
  assert.equal(stored.lifecycle.transitions.filter((item) => item.to === "collecting").length, 1);
});

test("processing progress is bound to exact job attempt and cannot regress", async () => {
  const primary = scope();
  await transitionCampaignSessionLifecycle({
    ...primary,
    input: {
      to: "connected",
      sourceRanges: sourceRanges(),
      occurredAt: "2026-09-07T10:02:00.000Z",
      reasonCode: "GM_CONNECT"
    }
  });
  await startCampaignSessionLifecycle({ ...primary, input: { occurredAt: "2026-09-07T10:02:01.000Z" } });
  await endCampaignSessionLifecycle({ ...primary, input: { occurredAt: "2026-09-07T11:00:00.000Z" } });
  await transitionCampaignSessionLifecycle({
    ...primary,
    input: { to: "queued", occurredAt: "2026-09-07T11:00:01.000Z", reasonCode: "GM_QUEUE_PROCESSING" }
  });
  const claimed = await transitionCampaignSessionLifecycle({
    ...primary,
    input: {
      to: "processing",
      occurredAt: "2026-09-07T11:00:02.000Z",
      reasonCode: "WORKER_CLAIM",
      jobId: "job-repository-001",
      leaseExpiresAt: "2026-09-07T11:05:02.000Z"
    }
  });
  assert.equal(claimed.session.processing.attempt, 1);

  const progress = await reportSessionProcessingProgress({
    workspaceId: primary.workspaceId,
    campaignId: primary.campaignId,
    sessionId: primary.sessionId,
    jobId: "job-repository-001",
    attempt: 1,
    progressPercent: 45,
    costMicros: 12000,
    latencyMs: 4100,
    leaseExpiresAt: "2026-09-07T11:06:00.000Z",
    occurredAt: "2026-09-07T11:00:30.000Z"
  });
  assert.equal(progress.session.processing.progressPercent, 45);
  assert.equal(progress.session.processing.costMicros, 12000);

  await assert.rejects(
    reportSessionProcessingProgress({
      workspaceId: primary.workspaceId,
      campaignId: primary.campaignId,
      sessionId: primary.sessionId,
      jobId: "job-stale-attempt",
      attempt: 1,
      progressPercent: 50,
      occurredAt: "2026-09-07T11:00:31.000Z"
    }),
    (error) => error.status === 409 && error.code === "SESSION_LIFECYCLE_CONCURRENT_CHANGE"
  );

  await assert.rejects(
    reportSessionProcessingProgress({
      workspaceId: primary.workspaceId,
      campaignId: primary.campaignId,
      sessionId: primary.sessionId,
      jobId: "job-repository-001",
      attempt: 1,
      progressPercent: 44,
      occurredAt: "2026-09-07T11:00:32.000Z"
    }),
    (error) => error.status === 409 && error.code === "SESSION_PROGRESS_REGRESSION"
  );
});

test("stale processing recovery persists failed evidence before requeueing", async () => {
  const primary = scope();
  const storedBefore = await database.collection("sessions").findOne({ _id: ids.session });
  const priorRevision = storedBefore.lifecycle.lifecycleRevision;

  const recovered = await recoverCampaignSessionLifecycle({
    ...primary,
    input: { occurredAt: "2026-09-07T11:06:01.000Z" }
  });
  assert.equal(recovered.session.status, "queued");
  assert.equal(recovered.session.processing.processingVersion, 1);
  assert.equal(recovered.session.lifecycleRevision, priorRevision + 2);
  assert.deepEqual(
    recovered.session.transitions.slice(-2).map(({ from, to, reasonCode }) => ({ from, to, reasonCode })),
    [
      { from: "processing", to: "failed", reasonCode: "STALE_PROCESSING_LEASE" },
      { from: "failed", to: "queued", reasonCode: "STALE_PROCESSING_RECOVERY" }
    ]
  );
});
