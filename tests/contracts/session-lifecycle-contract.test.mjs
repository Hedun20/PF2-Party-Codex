import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSessionLifecycleTransition,
  canTransitionSessionLifecycle,
  ContractValidationError,
  parseUnifiedSessionLifecycleContract
} from "../../packages/contracts/dist/index.js";

function draftSession(overrides = {}) {
  return {
    schemaVersion: "hed27-session-lifecycle-v1",
    id: "session-redacted-001",
    workspaceId: "workspace-redacted-001",
    campaignId: "campaign-redacted-001",
    title: "The Glass Vault",
    scheduledAt: "2026-09-07T18:00:00.000Z",
    status: "draft",
    sourceRanges: [
      {
        provider: "foundry",
        connectionId: "connection-redacted-foundry-001",
        stream: "world.events",
        state: "ready",
        fromCursor: null,
        toCursor: null,
        schemaVersion: "hed56-event-v1",
        adapterVersion: "foundry-v14-adapter-v1",
        warningCode: null
      },
      {
        provider: "discord",
        connectionId: "connection-redacted-discord-001",
        stream: "campaign.chat",
        state: "partial",
        fromCursor: "410",
        toCursor: "512",
        schemaVersion: "hed70-discord-message-v1",
        adapterVersion: "discord-v10-adapter-v1",
        warningCode: "MESSAGE_CONTENT_PARTIAL"
      },
      {
        provider: "manual",
        connectionId: null,
        stream: "gm.manual",
        state: "ready",
        fromCursor: null,
        toCursor: null,
        schemaVersion: "manual-v1",
        adapterVersion: "manual-v1",
        warningCode: null
      }
    ],
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
    createdBy: "user-redacted-gm-001",
    updatedBy: "user-redacted-gm-001",
    createdAt: "2026-09-07T10:00:00.000Z",
    updatedAt: "2026-09-07T10:00:00.000Z",
    ...overrides
  };
}

function transition(
  sequence,
  from,
  to,
  occurredAt,
  reasonCode = "GM_ACTION",
  actorKind = "user",
  actorId = "user-redacted-gm-001"
) {
  return {
    sequence,
    from,
    to,
    actorKind,
    actorId,
    reasonCode,
    occurredAt
  };
}

test("draft lifecycle records exact tenant scope, source ranges and partial warnings", () => {
  const parsed = parseUnifiedSessionLifecycleContract(draftSession());
  assert.equal(parsed.status, "draft");
  assert.equal(parsed.workspaceId, "workspace-redacted-001");
  assert.equal(parsed.campaignId, "campaign-redacted-001");
  assert.equal(parsed.sourceRanges.length, 3);
  assert.equal(parsed.sourceRanges[1].warningCode, "MESSAGE_CONTENT_PARTIAL");
});

test("session lifecycle only admits explicit state-machine transitions", () => {
  assert.equal(canTransitionSessionLifecycle("draft", "connected"), true);
  assert.equal(canTransitionSessionLifecycle("collecting", "paused"), true);
  assert.equal(canTransitionSessionLifecycle("paused", "collecting"), true);
  assert.equal(canTransitionSessionLifecycle("reviewReady", "published"), true);
  assert.equal(canTransitionSessionLifecycle("failed", "queued"), true);

  for (const [from, to] of [
    ["draft", "processing"],
    ["collecting", "published"],
    ["published", "queued"],
    ["canceled", "draft"]
  ]) {
    assert.equal(canTransitionSessionLifecycle(from, to), false);
    assert.throws(() => assertSessionLifecycleTransition(from, to), ContractValidationError);
  }
});

test("transition history is contiguous and revision-bound", () => {
  const transitions = [
    transition(1, "draft", "connected", "2026-09-07T10:01:00.000Z"),
    transition(2, "connected", "collecting", "2026-09-07T10:02:00.000Z"),
    transition(3, "collecting", "paused", "2026-09-07T10:03:00.000Z")
  ];
  const parsed = parseUnifiedSessionLifecycleContract(draftSession({
    status: "paused",
    lifecycleRevision: 3,
    transitions,
    updatedAt: "2026-09-07T10:03:00.000Z"
  }));
  assert.equal(parsed.lifecycleRevision, 3);

  assert.throws(
    () => parseUnifiedSessionLifecycleContract(draftSession({
      status: "paused",
      lifecycleRevision: 2,
      transitions,
      updatedAt: "2026-09-07T10:03:00.000Z"
    })),
    ContractValidationError
  );

  assert.throws(
    () => parseUnifiedSessionLifecycleContract(draftSession({
      status: "paused",
      lifecycleRevision: 3,
      transitions: [
        transition(1, "draft", "connected", "2026-09-07T10:01:00.000Z"),
        transition(2, "collecting", "paused", "2026-09-07T10:03:00.000Z")
      ],
      updatedAt: "2026-09-07T10:03:00.000Z"
    })),
    ContractValidationError
  );
});

test("transition actors distinguish human GM actions from worker and system actions", () => {
  const transitions = [
    transition(1, "draft", "connected", "2026-09-07T10:01:00.000Z"),
    transition(2, "connected", "collecting", "2026-09-07T10:02:00.000Z"),
    transition(3, "collecting", "ended", "2026-09-07T11:00:00.000Z"),
    transition(4, "ended", "queued", "2026-09-07T11:00:01.000Z"),
    transition(
      5,
      "queued",
      "processing",
      "2026-09-07T11:00:02.000Z",
      "WORKER_CLAIM",
      "worker",
      "session-processing-worker-v1"
    )
  ];
  const processing = {
    processingVersion: 1,
    jobId: "job-session-001",
    attempt: 1,
    progressPercent: 0,
    costMicros: 0,
    latencyMs: 0,
    queuedAt: "2026-09-07T11:00:01.000Z",
    startedAt: "2026-09-07T11:00:02.000Z",
    completedAt: null,
    leaseExpiresAt: "2026-09-07T11:05:02.000Z",
    safeErrorCode: null
  };
  const parsed = parseUnifiedSessionLifecycleContract(draftSession({
    status: "processing",
    processing,
    lifecycleRevision: 5,
    transitions,
    updatedAt: "2026-09-07T11:00:02.000Z"
  }));
  assert.equal(parsed.transitions[4].actorKind, "worker");
  assert.equal(parsed.transitions[4].actorId, "session-processing-worker-v1");

  assert.throws(
    () => parseUnifiedSessionLifecycleContract(draftSession({
      status: "connected",
      lifecycleRevision: 1,
      transitions: [{
        sequence: 1,
        from: "draft",
        to: "connected",
        actorUserId: "user-redacted-gm-001",
        reasonCode: "GM_CONNECT",
        occurredAt: "2026-09-07T10:01:00.000Z"
      }],
      updatedAt: "2026-09-07T10:01:00.000Z"
    })),
    ContractValidationError
  );
});

test("review-ready and published states enforce one review set per processing version", () => {
  const transitions = [
    transition(1, "draft", "connected", "2026-09-07T10:01:00.000Z"),
    transition(2, "connected", "collecting", "2026-09-07T10:02:00.000Z"),
    transition(3, "collecting", "ended", "2026-09-07T11:00:00.000Z"),
    transition(4, "ended", "queued", "2026-09-07T11:00:01.000Z"),
    transition(5, "queued", "processing", "2026-09-07T11:00:02.000Z", "WORKER_CLAIM", "worker", "session-processing-worker-v1"),
    transition(6, "processing", "reviewReady", "2026-09-07T11:02:00.000Z", "WORKER_REVIEW_READY", "worker", "session-processing-worker-v1")
  ];
  const processing = {
    processingVersion: 1,
    jobId: "job-session-001",
    attempt: 1,
    progressPercent: 100,
    costMicros: 125000,
    latencyMs: 118000,
    queuedAt: "2026-09-07T11:00:01.000Z",
    startedAt: "2026-09-07T11:00:02.000Z",
    completedAt: "2026-09-07T11:02:00.000Z",
    leaseExpiresAt: null,
    safeErrorCode: null
  };
  const reviewSet = {
    processingVersion: 1,
    reviewSetId: "review-session-001-v1",
    createdAt: "2026-09-07T11:02:00.000Z",
    publishedAt: null
  };

  const ready = parseUnifiedSessionLifecycleContract(draftSession({
    status: "reviewReady",
    processing,
    reviewSets: [reviewSet],
    lifecycleRevision: 6,
    transitions,
    updatedAt: "2026-09-07T11:02:00.000Z"
  }));
  assert.equal(ready.reviewSets[0].processingVersion, 1);

  assert.throws(
    () => parseUnifiedSessionLifecycleContract(draftSession({
      status: "reviewReady",
      processing,
      reviewSets: [],
      lifecycleRevision: 6,
      transitions,
      updatedAt: "2026-09-07T11:02:00.000Z"
    })),
    ContractValidationError
  );

  assert.throws(
    () => parseUnifiedSessionLifecycleContract(draftSession({
      status: "reviewReady",
      processing,
      reviewSets: [reviewSet, { ...reviewSet, reviewSetId: "review-session-001-duplicate" }],
      lifecycleRevision: 6,
      transitions,
      updatedAt: "2026-09-07T11:02:00.000Z"
    })),
    ContractValidationError
  );

  const publishedTransitions = [
    ...transitions,
    transition(7, "reviewReady", "published", "2026-09-07T11:03:00.000Z", "GM_PUBLISH")
  ];
  assert.throws(
    () => parseUnifiedSessionLifecycleContract(draftSession({
      status: "published",
      processing,
      reviewSets: [reviewSet],
      lifecycleRevision: 7,
      transitions: publishedTransitions,
      updatedAt: "2026-09-07T11:03:00.000Z"
    })),
    ContractValidationError
  );

  const published = parseUnifiedSessionLifecycleContract(draftSession({
    status: "published",
    processing,
    reviewSets: [{ ...reviewSet, publishedAt: "2026-09-07T11:03:00.000Z" }],
    lifecycleRevision: 7,
    transitions: publishedTransitions,
    updatedAt: "2026-09-07T11:03:00.000Z"
  }));
  assert.equal(published.status, "published");
});

test("source range authority and processing timing fail closed", () => {
  assert.throws(
    () => parseUnifiedSessionLifecycleContract(draftSession({
      sourceRanges: [{
        ...draftSession().sourceRanges[0],
        connectionId: null
      }]
    })),
    ContractValidationError
  );

  assert.throws(
    () => parseUnifiedSessionLifecycleContract(draftSession({
      sourceRanges: [{
        ...draftSession().sourceRanges[2],
        connectionId: "connection-redacted-forbidden"
      }]
    })),
    ContractValidationError
  );

  assert.throws(
    () => parseUnifiedSessionLifecycleContract(draftSession({
      sourceRanges: [{
        ...draftSession().sourceRanges[1],
        state: "partial",
        warningCode: null
      }]
    })),
    ContractValidationError
  );

  assert.throws(
    () => parseUnifiedSessionLifecycleContract(draftSession({
      processing: {
        ...draftSession().processing,
        queuedAt: "2026-09-07T11:00:02.000Z",
        startedAt: "2026-09-07T11:00:01.000Z"
      }
    })),
    ContractValidationError
  );
});
