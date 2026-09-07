import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import { ObjectId } from "mongodb";

import { createApp } from "../../apps/server/src/app.js";
import { config } from "../../apps/server/src/config.js";
import { closeMongo, connectMongo, getDb } from "../../apps/server/src/db/mongo.js";
import {
  claimSessionProcessing,
  submitSessionProcessingReport
} from "../../apps/server/src/repositories/sessionLifecycleRepository.js";
import {
  buildQueuedSessionProcessingRequest,
  readSessionProcessingSourceSnapshot
} from "../../apps/server/src/repositories/sessionProcessingSourceSnapshotRepository.js";
import { createSessionToken } from "../../apps/server/src/services/authTokens.js";

const SAFE_DATABASE_PREFIX = "pf2_party_codex_test_";
const SAFE_MONGO_HOSTS = new Set(["127.0.0.1", "localhost"]);
const silentLogger = { debug() {}, info() {}, warn() {}, error() {} };
const workerId = "session-golden-worker-v1";

const ids = {
  workspace: new ObjectId(),
  campaign: new ObjectId(),
  session: new ObjectId(),
  owner: new ObjectId()
};

let database;
let server;
let baseUrl = "";
let token = "";

function assertDisposableTarget() {
  assert.ok(config.mongoUri, "MONGO_URI is required for session golden-path tests");
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

function manualSource(toCursor = "12") {
  return {
    provider: "manual",
    connectionId: null,
    stream: "gm.manual",
    state: "ready",
    fromCursor: null,
    toCursor,
    schemaVersion: "manual-v1",
    adapterVersion: "manual-v1",
    warningCode: null
  };
}

async function api(pathname, { method = "GET", body } = {}) {
  const headers = {
    authorization: `Bearer ${token}`,
    "x-campaign-id": ids.campaign.toString()
  };
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  return { status: response.status, json: await response.json() };
}

function workerReport(outcome, overrides = {}) {
  const report = {
    schemaVersion: "hed27-session-processing-report-v1",
    workspaceId: ids.workspace.toString(),
    campaignId: ids.campaign.toString(),
    sessionId: ids.session.toString(),
    processingVersion: 1,
    jobId: "job-session-golden-v1",
    attempt: 1,
    outcome,
    progressPercent: 55,
    leaseExpiresAt: "2026-09-07T10:12:00.000Z",
    reviewSetId: null,
    costMicros: 25000,
    latencyMs: 7000,
    safeErrorCode: null,
    occurredAt: "2026-09-07T10:07:00.000Z"
  };
  if (outcome === "reviewReady") {
    Object.assign(report, {
      progressPercent: 100,
      leaseExpiresAt: null,
      reviewSetId: "review-session-golden-v1",
      costMicros: 155000,
      latencyMs: 91000,
      occurredAt: "2026-09-07T10:09:00.000Z"
    });
  }
  return { ...report, ...overrides };
}

before(async () => {
  assertDisposableTarget();
  const status = await connectMongo();
  assert.equal(status.connected, true);
  database = getDb();
  await database.dropDatabase();

  const stamp = "2026-09-07T09:00:00.000Z";
  await database.collection("users").insertOne({
    _id: ids.owner,
    email: "session-owner@example.test",
    name: "Session Owner",
    emailVerified: true,
    status: "active",
    sessionVersion: 1,
    activeCampaignId: ids.campaign,
    createdAt: stamp,
    updatedAt: stamp
  });
  await database.collection("workspaces").insertOne({
    _id: ids.workspace,
    ownerUserId: ids.owner,
    name: "Session Golden Workspace",
    status: "active",
    plan: "development",
    subscriptionStatus: "active",
    settings: {},
    createdAt: stamp,
    updatedAt: stamp
  });
  await database.collection("campaigns").insertOne({
    _id: ids.campaign,
    workspaceId: ids.workspace,
    ownerUserId: ids.owner,
    name: "Session Golden Campaign",
    status: "active",
    activeWorldId: "",
    settings: {},
    createdAt: stamp,
    updatedAt: stamp
  });
  await database.collection("memberships").insertOne({
    _id: new ObjectId(),
    userId: ids.owner,
    workspaceId: ids.workspace,
    campaignId: ids.campaign,
    role: "owner",
    status: "active",
    displayName: "Owner",
    joinedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp
  });
  await database.collection("sessions").insertOne({
    _id: ids.session,
    campaignId: ids.campaign,
    title: "Golden Session",
    status: "planned",
    scheduledAt: "2026-09-07T18:00:00.000Z",
    createdBy: ids.owner,
    updatedBy: ids.owner,
    createdAt: stamp,
    updatedAt: stamp
  });

  token = createSessionToken({ id: ids.owner.toString(), sessionVersion: 1 });
  const app = createApp({
    appConfig: {
      ...config,
      allowedOrigins: ["http://localhost:5173"],
      apiRateLimit: 10_000
    },
    appLogger: silentLogger
  });
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server?.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  if (database) await database.dropDatabase();
  await closeMongo({ silent: true });
});

test("GM HTTP lifecycle freezes sources, reaches worker review-ready and publishes one canonical review set", async () => {
  const path = `/api/sessions/${ids.session}/lifecycle`;

  let response = await api(`${path}/initialize`, {
    method: "POST",
    body: { occurredAt: "2026-09-07T10:00:00.000Z" }
  });
  assert.equal(response.status, 201);
  assert.equal(response.json.session.status, "draft");

  response = await api(`${path}/connect`, {
    method: "POST",
    body: {
      occurredAt: "2026-09-07T10:01:00.000Z",
      sourceRanges: [manualSource("12")]
    }
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.session.status, "connected");

  response = await api(`${path}/start`, {
    method: "POST",
    body: { occurredAt: "2026-09-07T10:02:00.000Z" }
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.session.status, "collecting");

  response = await api(`${path}/end`, {
    method: "POST",
    body: {
      occurredAt: "2026-09-07T10:03:00.000Z",
      sourceRanges: [manualSource("20")]
    }
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.session.status, "ended");
  assert.equal(response.json.session.sourceRanges[0].toCursor, "20");

  response = await api(`${path}/queue`, {
    method: "POST",
    body: { occurredAt: "2026-09-07T10:04:00.000Z" }
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.session.status, "queued");
  assert.equal(response.json.session.processing.processingVersion, 1);

  const repeatedQueue = await api(`${path}/queue`, {
    method: "POST",
    body: { occurredAt: "2026-09-07T10:04:01.000Z" }
  });
  assert.equal(repeatedQueue.status, 200);
  assert.equal(repeatedQueue.json.idempotent, true);

  const processingRequest = await buildQueuedSessionProcessingRequest({
    workspaceId: ids.workspace.toString(),
    campaignId: ids.campaign.toString(),
    sessionId: ids.session.toString(),
    policyVersion: "campaign-policy-v1"
  });
  assert.equal(processingRequest.processingVersion, 1);
  assert.match(processingRequest.sourceSnapshotHash, /^[a-f0-9]{64}$/);
  assert.equal(processingRequest.requestedAt, "2026-09-07T10:04:00.000Z");

  const frozenSnapshot = await readSessionProcessingSourceSnapshot({
    workspaceId: processingRequest.workspaceId,
    campaignId: processingRequest.campaignId,
    sessionId: processingRequest.sessionId,
    processingVersion: processingRequest.processingVersion,
    sourceSnapshotRef: processingRequest.sourceSnapshotRef,
    sourceSnapshotHash: processingRequest.sourceSnapshotHash
  });
  assert.equal(frozenSnapshot.capturedAt, "2026-09-07T10:04:00.000Z");
  assert.equal(frozenSnapshot.sources.length, 1);
  assert.equal(frozenSnapshot.sources[0].toCursor, "20");
  assert.doesNotMatch(JSON.stringify(frozenSnapshot), /password|token|credential|rawEvidence/i);

  let queuedStored = await database.collection("sessions").findOne({ _id: ids.session });
  assert.equal(queuedStored.processingSourceSnapshots.length, 1, "queue retry must not duplicate the frozen snapshot");

  const claimed = await claimSessionProcessing({
    workspaceId: ids.workspace.toString(),
    campaignId: ids.campaign.toString(),
    sessionId: ids.session.toString(),
    workerId,
    jobId: "job-session-golden-v1",
    occurredAt: "2026-09-07T10:05:00.000Z",
    leaseExpiresAt: "2026-09-07T10:10:00.000Z"
  });
  assert.equal(claimed.session.status, "processing");
  assert.equal(claimed.session.processing.attempt, 1);

  await submitSessionProcessingReport({ workerId, report: workerReport("progress") });
  response = await api(path);
  assert.equal(response.status, 200);
  assert.equal(response.json.session.status, "processing");
  assert.equal(response.json.session.processing.progressPercent, 55);
  assert.equal(response.json.session.processing.costMicros, 25000);

  await submitSessionProcessingReport({ workerId, report: workerReport("reviewReady") });
  response = await api(path);
  assert.equal(response.status, 200);
  assert.equal(response.json.session.status, "reviewReady");
  assert.equal(response.json.session.reviewSets.length, 1);
  assert.equal(response.json.session.reviewSets[0].reviewSetId, "review-session-golden-v1");

  response = await api(`${path}/publish`, {
    method: "POST",
    body: { occurredAt: "2026-09-07T10:10:00.000Z" }
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.session.status, "published");
  assert.equal(response.json.session.reviewSets.length, 1);
  assert.equal(response.json.session.reviewSets[0].publishedAt, "2026-09-07T10:10:00.000Z");

  const repeated = await api(`${path}/publish`, {
    method: "POST",
    body: { occurredAt: "2026-09-07T10:10:01.000Z" }
  });
  assert.equal(repeated.status, 200);
  assert.equal(repeated.json.idempotent, true);
  assert.equal(repeated.json.session.reviewSets.length, 1);

  const stored = await database.collection("sessions").findOne({ _id: ids.session });
  assert.equal(stored.status, "planned", "golden path must preserve the rollback session status");
  assert.equal(stored.lifecycle.status, "published");
  assert.equal(stored.lifecycle.reviewSets.length, 1);
  assert.equal(stored.processingSourceSnapshots.length, 1);
  assert.deepEqual(
    stored.lifecycle.transitions.slice(-3).map(({ actorKind, to }) => ({ actorKind, to })),
    [
      { actorKind: "worker", to: "processing" },
      { actorKind: "worker", to: "reviewReady" },
      { actorKind: "user", to: "published" }
    ]
  );
});
