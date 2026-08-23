import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  canonicalizeIntegrationEvent,
  computeIntegrationEventChecksum,
  computeIntegrationEventIdempotencyKey,
  ContractValidationError,
  parseIntegrationConnection,
  parseIntegrationIngestionCursor,
  parseIntegrationIngestionReceipt,
  parseNormalizedIntegrationEvent
} from "../../packages/contracts/dist/index.js";

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function connection(overrides = {}) {
  return {
    schemaVersion: "hed56-connection-v1",
    connectionId: "connection-redacted-001",
    provider: "foundry",
    workspaceId: "workspace-redacted-001",
    campaignId: "campaign-redacted-001",
    worldId: "world-redacted-001",
    externalInstanceId: "foundry-instance-redacted-001",
    state: "active",
    credentialState: "active",
    credentialVersion: "credential-v3",
    credentialExpiresAt: "2026-09-23T17:00:00.000Z",
    capabilities: ["events:ingest", "events:replay"],
    allowedStreams: ["campaign.events", "world.events"],
    adapterVersion: "foundry-v14-adapter-v1",
    retentionPolicyVersion: "evidence-retention-v1",
    exportPolicyVersion: "evidence-export-v1",
    deletionPolicyVersion: "evidence-deletion-v1",
    createdAt: "2026-08-23T16:00:00.000Z",
    updatedAt: "2026-08-23T16:30:00.000Z",
    revokedAt: null,
    ...overrides
  };
}

const baseEventInput = {
  schemaVersion: "hed56-event-v1",
  eventId: "event-redacted-001",
  provider: "foundry",
  connectionId: "connection-redacted-001",
  workspaceId: "workspace-redacted-001",
  campaignId: "campaign-redacted-001",
  worldId: "world-redacted-001",
  sessionId: "session-redacted-001",
  stream: "world.events",
  sourceDocumentId: "chat-message-redacted-001",
  sourceEventId: "foundry-hook-redacted-001",
  sourceEventVersion: "1",
  sequence: "42",
  occurredAt: "2026-08-23T16:59:59.000Z",
  receivedAt: "2026-08-23T17:00:00.000Z",
  actor: {
    kind: "character",
    sourceActorId: "actor-redacted-001",
    displayName: "Redacted hero"
  },
  speaker: null,
  type: "roll.created",
  visibility: {
    classification: "restricted",
    sourceActorIds: []
  },
  payload: {
    roll: { formula: "1d20+8", total: 24 },
    source: { hook: "createChatMessage" }
  },
  adapterVersion: "foundry-v14-adapter-v1",
  traceId: "trace-redacted-001",
  causationId: null
};

function eventInput(value) {
  const { checksum: _checksum, ...input } = value;
  return input;
}

function event(overrides = {}) {
  const candidate = { ...baseEventInput, ...overrides };
  let checksum = "f".repeat(64);
  if (!Object.hasOwn(overrides, "checksum")) {
    try {
      checksum = computeIntegrationEventChecksum(candidate, sha256);
    } catch {
      // Invalid candidates still reach the runtime parser under test.
    }
  }
  return {
    ...candidate,
    checksum: Object.hasOwn(overrides, "checksum") ? overrides.checksum : checksum
  };
}

function verification(overrides = {}) {
  return {
    connection: connection(),
    eventId: "event-redacted-001",
    sessionId: "session-redacted-001",
    receivedAt: "2026-08-23T17:00:00.000Z",
    evaluatedAt: "2026-08-23T17:00:00.500Z",
    maxClockSkewMs: 30_000,
    sha256,
    ...overrides
  };
}

test("normalized integration events bind exact connection, tenant and restricted evidence", () => {
  const parsed = parseNormalizedIntegrationEvent(event(), verification());
  assert.equal(parsed.connectionId, "connection-redacted-001");
  assert.equal(parsed.workspaceId, "workspace-redacted-001");
  assert.equal(parsed.campaignId, "campaign-redacted-001");
  assert.equal(parsed.visibility.classification, "restricted");
  assert.equal(parsed.checksum, computeIntegrationEventChecksum(baseEventInput, sha256));
  assert.equal(parseIntegrationConnection(connection()).state, "active");

  const spoken = parseNormalizedIntegrationEvent(
    event({
      type: "chat.message.created",
      speaker: {
        kind: "character",
        sourceActorId: "actor-redacted-002",
        displayName: "Redacted speaker"
      }
    }),
    verification()
  );
  assert.equal(spoken.speaker?.sourceActorId, "actor-redacted-002");
});

test("event checksums bind semantics while idempotency binds the source occurrence", () => {
  const original = event();
  const reorderedPayload = event({
    eventId: "event-redacted-retry-002",
    receivedAt: "2026-08-23T17:00:02.000Z",
    traceId: "trace-redacted-retry-002",
    payload: {
      source: { hook: "createChatMessage" },
      roll: { total: 24, formula: "1d20+8" }
    }
  });
  assert.equal(
    canonicalizeIntegrationEvent(eventInput(reorderedPayload)),
    canonicalizeIntegrationEvent(eventInput(original))
  );
  assert.equal(reorderedPayload.checksum, original.checksum);
  assert.equal(
    computeIntegrationEventIdempotencyKey(eventInput(reorderedPayload), sha256),
    computeIntegrationEventIdempotencyKey(eventInput(original), sha256)
  );

  const changedPayload = event({ payload: { roll: { formula: "1d20+8", total: 25 } } });
  assert.notEqual(changedPayload.checksum, original.checksum);
  assert.equal(
    computeIntegrationEventIdempotencyKey(eventInput(changedPayload), sha256),
    computeIntegrationEventIdempotencyKey(eventInput(original), sha256)
  );

  const changedSpeaker = event({
    speaker: { kind: "character", sourceActorId: "actor-redacted-002", displayName: null }
  });
  assert.notEqual(changedSpeaker.checksum, original.checksum);

  const changedVersion = event({ sourceEventVersion: "2" });
  assert.notEqual(
    computeIntegrationEventIdempotencyKey(eventInput(changedVersion), sha256),
    computeIntegrationEventIdempotencyKey(eventInput(original), sha256)
  );
});

test("integration events reject tenant, provider, stream and adapter claim drift", () => {
  for (const candidate of [
    event({ workspaceId: "workspace-redacted-002" }),
    event({ campaignId: "campaign-redacted-002" }),
    event({ worldId: "world-redacted-002" }),
    event({ provider: "discord" }),
    event({ connectionId: "connection-redacted-002" }),
    event({ sessionId: "session-redacted-002" }),
    event({ stream: "unapproved.events" }),
    event({ adapterVersion: "foundry-v14-adapter-v2" }),
    event({ type: "transcript.segment.created" })
  ]) {
    assert.throws(
      () => parseNormalizedIntegrationEvent(candidate, verification()),
      ContractValidationError
    );
  }
  assert.throws(
    () => parseNormalizedIntegrationEvent(event(), verification({ eventId: "event-redacted-002" })),
    ContractValidationError
  );
});

test("paused, revoked, expired and under-capable connections fail closed", () => {
  const revoked = connection({
    state: "revoked",
    credentialState: "revoked",
    updatedAt: "2026-08-23T16:45:00.000Z",
    revokedAt: "2026-08-23T16:45:00.000Z"
  });
  for (const trustedConnection of [
    connection({ state: "paused" }),
    revoked,
    connection({ credentialState: "expired" }),
    connection({ credentialExpiresAt: "2026-08-23T17:00:00.500Z" }),
    connection({ capabilities: ["health:write"] })
  ]) {
    assert.throws(
      () =>
        parseNormalizedIntegrationEvent(event(), verification({ connection: trustedConnection })),
      ContractValidationError
    );
  }
});

test("connection lifecycle, capability and stream records are canonical", () => {
  for (const candidate of [
    connection({ provider: "unknown" }),
    connection({ capabilities: ["events:replay", "events:ingest"] }),
    connection({ capabilities: ["events:ingest", "events:ingest"] }),
    connection({ allowedStreams: ["world.events", "campaign.events"] }),
    connection({ allowedStreams: [] }),
    connection({ updatedAt: "2026-08-23T15:59:59.999Z" }),
    connection({ revokedAt: "2026-08-23T16:30:00.000Z" }),
    connection({ state: "revoked", credentialState: "revoked", revokedAt: null }),
    { ...connection(), credential: "must-not-enter-connection" }
  ]) {
    assert.throws(() => parseIntegrationConnection(candidate), ContractValidationError);
  }
});

test("timestamps, sequence and checksum are canonical and gateway-bound", () => {
  for (const candidate of [
    event({ sequence: "042" }),
    event({ sequence: "-1" }),
    event({ occurredAt: "0" }),
    event({ occurredAt: "2026-08-23T17:01:00.501Z" }),
    event({ receivedAt: "2026-08-23T17:00:00.001Z" }),
    event({ checksum: "not-a-checksum" }),
    { ...event(), payload: { changed: true } }
  ]) {
    assert.throws(
      () => parseNormalizedIntegrationEvent(candidate, verification()),
      ContractValidationError
    );
  }
  assert.throws(
    () => parseNormalizedIntegrationEvent(event(), verification({ maxClockSkewMs: 300_001 })),
    ContractValidationError
  );
});

test("raw integration payloads reject secret-shaped data, oversized content and extra fields", () => {
  for (const candidate of [
    event({ payload: { nested: { access_token: "must-not-enter-evidence" } } }),
    event({ payload: { content: "x".repeat(70_000) } }),
    { ...event(), credential: "must-not-enter-event" },
    event({
      actor: { kind: "character", sourceActorId: "actor-redacted", displayName: "bad\nname" }
    }),
    event({ visibility: { classification: "participantScoped", sourceActorIds: [] } }),
    event({
      visibility: { classification: "managerOnly", sourceActorIds: ["actor-redacted-001"] }
    })
  ]) {
    assert.throws(
      () => parseNormalizedIntegrationEvent(candidate, verification()),
      ContractValidationError
    );
  }

  let error;
  try {
    parseNormalizedIntegrationEvent(
      event({ payload: { authorization: "Bearer private-value" } }),
      verification()
    );
  } catch (candidate) {
    error = candidate;
  }
  assert.equal(error instanceof ContractValidationError, true);
  assert.doesNotMatch(String(error), /Bearer private-value/);
});

test("participant-scoped evidence carries only sorted provider actor references", () => {
  const parsed = parseNormalizedIntegrationEvent(
    event({
      visibility: {
        classification: "participantScoped",
        sourceActorIds: ["actor-redacted-001", "actor-redacted-002"]
      }
    }),
    verification()
  );
  assert.deepEqual(parsed.visibility.sourceActorIds, ["actor-redacted-001", "actor-redacted-002"]);

  assert.throws(
    () =>
      parseNormalizedIntegrationEvent(
        event({
          visibility: {
            classification: "participantScoped",
            sourceActorIds: ["actor-redacted-002", "actor-redacted-001"]
          }
        }),
        verification()
      ),
    ContractValidationError
  );
});

test("cursor and receipt evidence are bounded, monotonic and payload-free", () => {
  const idempotencyKey = computeIntegrationEventIdempotencyKey(baseEventInput, sha256);
  const eventChecksum = computeIntegrationEventChecksum(baseEventInput, sha256);
  const cursor = parseIntegrationIngestionCursor({
    schemaVersion: "hed56-cursor-v1",
    connectionId: "connection-redacted-001",
    stream: "world.events",
    lastSequence: "42",
    lastSourceEventId: "foundry-hook-redacted-001",
    lastEventChecksum: eventChecksum,
    version: 3,
    updatedAt: "2026-08-23T17:00:01.000Z"
  });
  assert.equal(cursor.version, 3);

  const receipt = parseIntegrationIngestionReceipt({
    schemaVersion: "hed56-receipt-v1",
    receiptId: "receipt-redacted-001",
    connectionId: "connection-redacted-001",
    idempotencyKey,
    eventId: "event-redacted-001",
    eventChecksum,
    stream: "world.events",
    sequence: "42",
    outcome: "accepted",
    evidenceRef: "evidence-records/evidence-redacted-001",
    safeCode: null,
    replayCount: 2,
    createdAt: "2026-08-23T17:00:01.000Z",
    lastSeenAt: "2026-08-23T17:00:03.000Z",
    purgeAt: "2026-09-23T17:00:03.000Z"
  });
  assert.equal(receipt.replayCount, 2);

  const quarantined = parseIntegrationIngestionReceipt({
    ...receipt,
    receiptId: "receipt-redacted-002",
    outcome: "quarantined",
    evidenceRef: null,
    safeCode: "EVENT_SCHEMA_INVALID"
  });
  assert.equal(quarantined.outcome, "quarantined");

  for (const candidate of [
    { ...receipt, payload: { forbidden: true } },
    { ...receipt, evidenceRef: null },
    { ...receipt, replayCount: -1 },
    { ...receipt, lastSeenAt: "2026-08-23T16:59:59.000Z" },
    { ...receipt, purgeAt: "2026-08-23T17:00:03.000Z" }
  ]) {
    assert.throws(() => parseIntegrationIngestionReceipt(candidate), ContractValidationError);
  }
});
