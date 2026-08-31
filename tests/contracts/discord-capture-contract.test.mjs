import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  ContractValidationError,
  advanceDiscordBackfillCursor,
  mapDiscordCaptureMessageToIntegrationEvent,
  parseDiscordBackfillCursor,
  parseDiscordCaptureMessage,
  parseDiscordCaptureScope,
  parseDiscordConnectionBinding,
  parseDiscordRateLimit,
  planDiscordBackfillPage,
  reconcileDiscordMessageRevision,
  resolveDiscordCaptureTarget
} from "../../packages/contracts/dist/index.js";

const ids = {
  application: "123456789012345670",
  guild: "123456789012345671",
  channel: "123456789012345672",
  otherChannel: "123456789012345673",
  thread: "123456789012345674",
  message: "123456789012345675",
  reply: "123456789012345676",
  user: "123456789012345677",
  attachment: "123456789012345678",
  unsupportedAttachment: "123456789012345679"
};

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function connection(overrides = {}) {
  return {
    schemaVersion: "hed56-connection-v1",
    connectionId: "connection-discord-redacted-001",
    provider: "discord",
    workspaceId: "workspace-redacted-001",
    campaignId: "campaign-redacted-001",
    worldId: null,
    externalInstanceId: ids.guild,
    state: "active",
    credentialState: "active",
    credentialVersion: "discord-credential-v3",
    credentialExpiresAt: "2026-09-23T17:00:00.000Z",
    capabilities: ["events:ingest", "events:replay"],
    allowedStreams: [`discord.channel.${ids.channel}`],
    adapterVersion: "discord-api-v10-adapter-v1",
    retentionPolicyVersion: "discord-retention-v1",
    exportPolicyVersion: "evidence-export-v1",
    deletionPolicyVersion: "discord-deletion-v1",
    createdAt: "2026-08-23T16:00:00.000Z",
    updatedAt: "2026-08-23T16:30:00.000Z",
    revokedAt: null,
    ...overrides
  };
}

function bindingInput(overrides = {}) {
  return {
    schemaVersion: "hed70-discord-connection-v1",
    connectionId: "connection-discord-redacted-001",
    workspaceId: "workspace-redacted-001",
    campaignId: "campaign-redacted-001",
    applicationId: ids.application,
    guildId: ids.guild,
    channels: [{ channelId: ids.channel, stream: `discord.channel.${ids.channel}` }],
    mode: "channelCapture",
    interactionTransport: "outgoingWebhook",
    oauthScopes: ["applications.commands", "bot"],
    permissionBits: "84992",
    gatewayIntents: ["GUILDS", "GUILD_MESSAGES", "MESSAGE_CONTENT"],
    privilegedIntentReviewState: "enabledBelowReviewThreshold",
    commandCatalogVersion: "hed70-alpha-v1",
    interactionPublicKeyVersion: "discord-public-key-v2",
    botCredentialVersion: "discord-credential-v3",
    retentionPolicyVersion: "discord-retention-v1",
    deletionPolicyVersion: "discord-deletion-v1",
    updatedAt: "2026-08-23T16:30:00.000Z",
    ...overrides
  };
}

function binding() {
  return parseDiscordConnectionBinding(bindingInput(), connection());
}

function scopeInput(overrides = {}) {
  return {
    schemaVersion: "hed74-discord-capture-scope-v1",
    connectionId: "connection-discord-redacted-001",
    workspaceId: "workspace-redacted-001",
    campaignId: "campaign-redacted-001",
    guildId: ids.guild,
    sessionId: "session-redacted-001",
    state: "active",
    targets: [
      {
        kind: "channel",
        channelId: ids.channel,
        parentChannelId: null,
        stream: `discord.channel.${ids.channel}`,
        visibility: "restricted"
      },
      {
        kind: "thread",
        channelId: ids.thread,
        parentChannelId: ids.channel,
        stream: `discord.channel.${ids.channel}`,
        visibility: "managerOnly"
      }
    ],
    retentionPolicyVersion: "discord-retention-v1",
    deletionPolicyVersion: "discord-deletion-v1",
    startsAt: "2026-08-23T16:00:00.000Z",
    endsAt: "2026-08-23T20:00:00.000Z",
    updatedAt: "2026-08-23T16:30:00.000Z",
    ...overrides
  };
}

function scope(overrides = {}) {
  return parseDiscordCaptureScope(scopeInput(overrides), binding(), "2026-08-23T17:00:00.500Z");
}

function attachment(overrides = {}) {
  return {
    attachmentId: ids.attachment,
    filename: "map-redacted.png",
    description: "Redacted encounter map",
    mediaType: "image/png",
    sizeBytes: 1_024,
    width: 800,
    height: 600,
    disposition: "storedMetadata",
    ...overrides
  };
}

function message(overrides = {}) {
  return {
    schemaVersion: "hed74-discord-capture-message-v1",
    gatewaySessionId: "discord-gateway-session-redacted-001",
    gatewaySequence: "42",
    dispatch: "MESSAGE_CREATE",
    sourceKind: "user",
    applicationId: ids.application,
    guildId: ids.guild,
    channelId: ids.channel,
    parentChannelId: null,
    messageId: ids.message,
    messageType: "reply",
    authorId: ids.user,
    authorLinkRef: "discord-links/link-redacted-001",
    authorLinkVersion: "link-v2",
    content: "The party replies in the configured channel.",
    replyToMessageId: ids.reply,
    attachments: [
      attachment(),
      attachment({
        attachmentId: ids.unsupportedAttachment,
        filename: "unknown-redacted.bin",
        description: null,
        mediaType: "application/octet-stream",
        sizeBytes: 512,
        width: null,
        height: null,
        disposition: "ignoredUnsupported"
      })
    ],
    messageCreatedAt: "2026-08-23T16:59:59.000Z",
    messageEditedAt: null,
    occurredAt: "2026-08-23T16:59:59.000Z",
    ...overrides
  };
}

function mappingContext(overrides = {}) {
  return {
    connection: connection(),
    binding: bindingInput(),
    scope: scopeInput(),
    eventId: "event-discord-capture-redacted-001",
    sessionId: "session-redacted-001",
    receivedAt: "2026-08-23T17:00:00.000Z",
    evaluatedAt: "2026-08-23T17:00:00.500Z",
    maxClockSkewMs: 30_000,
    integrationSequence: "7",
    traceId: "trace-discord-capture-redacted-001",
    ingressKind: "live",
    authorLinkSourceUserId: ids.user,
    authorLinkRef: "discord-links/link-redacted-001",
    authorLinkVersion: "link-v2",
    sha256,
    ...overrides
  };
}

test("capture scope binds an active campaign session to explicit channels and threads", () => {
  const parsed = scope();
  assert.equal(parsed.targets.length, 2);
  assert.equal(parsed.targets[1].parentChannelId, ids.channel);
  assert.equal(parsed.targets[1].visibility, "managerOnly");

  for (const candidate of [
    scopeInput({ campaignId: "campaign-redacted-002" }),
    scopeInput({ state: "active", targets: [] }),
    scopeInput({ targets: [...scopeInput().targets].reverse() }),
    scopeInput({ retentionPolicyVersion: "discord-retention-v2" }),
    scopeInput({ targets: [{ ...scopeInput().targets[0], stream: "other.stream" }] }),
    scopeInput({
      targets: [
        {
          kind: "thread",
          channelId: ids.thread,
          parentChannelId: ids.otherChannel,
          stream: `discord.channel.${ids.channel}`,
          visibility: "restricted"
        }
      ]
    })
  ]) {
    assert.throws(
      () => parseDiscordCaptureScope(candidate, binding(), "2026-08-23T17:00:00.500Z"),
      ContractValidationError
    );
  }
});

test("routing rejects unconfigured content before any storage-bearing message parse", () => {
  const secretContent = "content-that-must-never-reach-storage";
  const decision = resolveDiscordCaptureTarget(
    {
      applicationId: ids.application,
      guildId: ids.guild,
      channelId: ids.otherChannel,
      parentChannelId: null
    },
    scope(),
    binding(),
    "2026-08-23T17:00:00.500Z",
    "live"
  );
  assert.deepEqual(decision, { outcome: "ignored", safeCode: "TARGET_NOT_CONFIGURED" });
  assert.doesNotMatch(JSON.stringify(decision), new RegExp(secretContent));

  const thread = resolveDiscordCaptureTarget(
    {
      applicationId: ids.application,
      guildId: ids.guild,
      channelId: ids.thread,
      parentChannelId: ids.channel
    },
    scope(),
    binding(),
    "2026-08-23T17:00:00.500Z",
    "live"
  );
  assert.equal(thread.outcome, "eligible");
  assert.equal(thread.target.kind, "thread");
});

test("routing fails closed while paused or outside the linked session window", () => {
  const route = {
    applicationId: ids.application,
    guildId: ids.guild,
    channelId: ids.channel,
    parentChannelId: null
  };
  assert.equal(
    resolveDiscordCaptureTarget(
      route,
      scope({ state: "paused" }),
      binding(),
      "2026-08-23T17:00:00.500Z",
      "live"
    ).safeCode,
    "CAPTURE_INACTIVE"
  );
  assert.equal(
    resolveDiscordCaptureTarget(route, scope(), binding(), "2026-08-23T20:00:00.000Z", "live")
      .safeCode,
    "OUTSIDE_SESSION_WINDOW"
  );
  assert.equal(
    resolveDiscordCaptureTarget(
      route,
      scope({ state: "paused" }),
      binding(),
      "2026-08-23T20:00:00.000Z",
      "backfill"
    ).outcome,
    "eligible"
  );
});

test("eligible messages normalize replies and metadata-only supported/ignored attachments", () => {
  const parsedScope = scope();
  const parsed = parseDiscordCaptureMessage(message(), parsedScope.targets[0], mappingContext());
  assert.equal(parsed.replyToMessageId, ids.reply);
  assert.equal(parsed.attachments[0].disposition, "storedMetadata");
  assert.equal(parsed.attachments[1].disposition, "ignoredUnsupported");
  assert.equal("url" in parsed.attachments[0], false);

  for (const candidate of [
    message({ attachments: [{ ...attachment(), url: "https://cdn.example/private" }] }),
    message({ attachments: [attachment({ disposition: "ignoredUnsupported" })] }),
    message({ attachments: [attachment({ mediaType: "application/octet-stream" })] }),
    message({ messageType: "default", replyToMessageId: ids.reply }),
    message({ content: "" }),
    message({ sourceKind: "bot" }),
    message({ sourceKind: "webhook" }),
    message({ authorLinkRef: "discord-links/spoof", authorLinkVersion: "link-v2" }),
    message({ authorId: ids.reply })
  ]) {
    assert.throws(
      () => parseDiscordCaptureMessage(candidate, parsedScope.targets[0], mappingContext()),
      ContractValidationError
    );
  }
});

test("create, complete edit and delete become immutable restricted HED-56 evidence", () => {
  const created = mapDiscordCaptureMessageToIntegrationEvent(message(), mappingContext());
  assert.equal(created.type, "chat.message.created");
  assert.equal(created.visibility.classification, "restricted");
  assert.equal(created.payload.replyToMessageId, ids.reply);
  assert.equal(created.payload.attachments.length, 1);
  assert.equal(created.payload.attachments[0].attachmentId, ids.attachment);

  const updated = mapDiscordCaptureMessageToIntegrationEvent(
    message({
      gatewaySequence: "43",
      dispatch: "MESSAGE_UPDATE",
      content: "The edited reply remains complete.",
      messageEditedAt: "2026-08-23T17:00:00.000Z",
      occurredAt: "2026-08-23T17:00:00.000Z"
    }),
    mappingContext({
      eventId: "event-discord-capture-redacted-002",
      integrationSequence: "8"
    })
  );
  assert.equal(updated.type, "chat.message.updated");

  const deleted = mapDiscordCaptureMessageToIntegrationEvent(
    message({
      gatewaySequence: "44",
      dispatch: "MESSAGE_DELETE",
      sourceKind: "system",
      messageType: null,
      authorId: null,
      authorLinkRef: null,
      authorLinkVersion: null,
      content: null,
      replyToMessageId: null,
      attachments: [],
      messageCreatedAt: null,
      messageEditedAt: null,
      occurredAt: "2026-08-23T17:00:00.000Z"
    }),
    mappingContext({
      eventId: "event-discord-capture-redacted-003",
      integrationSequence: "9",
      authorLinkSourceUserId: null,
      authorLinkRef: null,
      authorLinkVersion: null
    })
  );
  assert.equal(deleted.type, "chat.message.deleted");
  assert.equal(deleted.payload.content, null);

  const recovered = mapDiscordCaptureMessageToIntegrationEvent(
    message(),
    mappingContext({
      ingressKind: "backfill",
      eventId: "event-discord-capture-redacted-004",
      integrationSequence: "10",
      receivedAt: "2026-08-23T20:30:00.000Z",
      evaluatedAt: "2026-08-23T20:30:00.500Z"
    })
  );
  assert.equal(recovered.type, "chat.message.created");
  assert.throws(
    () =>
      mapDiscordCaptureMessageToIntegrationEvent(
        message(),
        mappingContext({
          ingressKind: "backfill",
          connection: connection({ capabilities: ["events:ingest"] }),
          eventId: "event-discord-capture-redacted-005",
          integrationSequence: "11",
          receivedAt: "2026-08-23T20:30:00.000Z",
          evaluatedAt: "2026-08-23T20:30:00.500Z"
        })
      ),
    ContractValidationError
  );
  assert.throws(
    () =>
      mapDiscordCaptureMessageToIntegrationEvent(
        message({
          messageCreatedAt: "2026-08-23T20:00:00.000Z",
          occurredAt: "2026-08-23T20:00:00.000Z"
        }),
        mappingContext({
          ingressKind: "backfill",
          eventId: "event-discord-capture-redacted-006",
          integrationSequence: "12",
          receivedAt: "2026-08-23T20:30:00.000Z",
          evaluatedAt: "2026-08-23T20:30:00.500Z"
        })
      ),
    ContractValidationError
  );
});

test("edit/delete reconciliation is deterministic, idempotent and append-only", () => {
  const created = mapDiscordCaptureMessageToIntegrationEvent(message(), mappingContext());
  const first = reconcileDiscordMessageRevision(null, created);
  assert.equal(first.outcome, "accepted");
  assert.equal(first.nextRevision.version, 1);
  assert.equal(
    reconcileDiscordMessageRevision(first.nextRevision, created).outcome,
    "idempotentReplay"
  );
  assert.equal(
    reconcileDiscordMessageRevision(
      { ...first.nextRevision, lastChecksum: "0".repeat(64) },
      created
    ).outcome,
    "idempotencyConflict"
  );

  const updated = mapDiscordCaptureMessageToIntegrationEvent(
    message({
      gatewaySequence: "43",
      dispatch: "MESSAGE_UPDATE",
      content: "Edited text.",
      messageEditedAt: "2026-08-23T17:00:00.000Z",
      occurredAt: "2026-08-23T17:00:00.000Z"
    }),
    mappingContext({ eventId: "event-redacted-002", integrationSequence: "8" })
  );
  const edit = reconcileDiscordMessageRevision(first.nextRevision, updated);
  assert.equal(edit.outcome, "accepted");
  assert.equal(edit.nextRevision.version, 2);
  assert.equal(
    reconcileDiscordMessageRevision(edit.nextRevision, created).outcome,
    "staleRevision"
  );
});

function cursor(overrides = {}) {
  return {
    schemaVersion: "hed74-discord-backfill-v1",
    connectionId: "connection-discord-redacted-001",
    targetChannelId: ids.channel,
    afterMessageId: null,
    state: "pending",
    pagesCommitted: 0,
    version: 0,
    updatedAt: "2026-08-23T16:30:00.000Z",
    ...overrides
  };
}

test("backfill advances over every scanned provider message after eligible commits", () => {
  assert.deepEqual(planDiscordBackfillPage(cursor(), scope()), {
    channelId: ids.channel,
    afterMessageId: null,
    limit: 100,
    orderAfterFetch: "oldestFirst"
  });
  assert.equal(
    planDiscordBackfillPage(cursor(), scope({ state: "paused" })).orderAfterFetch,
    "oldestFirst"
  );
  assert.throws(
    () => planDiscordBackfillPage(cursor({ connectionId: "connection-redacted-002" }), scope()),
    ContractValidationError
  );
  const shortPage = advanceDiscordBackfillCursor(
    cursor(),
    [ids.reply, ids.user],
    [ids.reply, ids.user],
    "2026-08-23T17:00:00.000Z"
  );
  assert.equal(shortPage.state, "complete");
  assert.equal(shortPage.afterMessageId, ids.user);
  assert.equal(shortPage.pagesCommitted, 1);

  const hundred = Array.from({ length: 100 }, (_, index) =>
    String(223456789012345600n + BigInt(index))
  );
  assert.equal(
    advanceDiscordBackfillCursor(cursor(), hundred, hundred.slice(0, 2), "2026-08-23T17:00:00.000Z")
      .state,
    "running"
  );
  assert.equal(
    advanceDiscordBackfillCursor(cursor(), hundred, hundred.slice(0, 2), "2026-08-23T17:00:00.000Z")
      .afterMessageId,
    hundred.at(-1)
  );
  assert.throws(
    () =>
      advanceDiscordBackfillCursor(
        cursor(),
        [ids.user, ids.reply],
        [ids.user, ids.reply],
        "2026-08-23T17:00:00.000Z"
      ),
    ContractValidationError
  );
  assert.throws(
    () =>
      advanceDiscordBackfillCursor(
        cursor(),
        [ids.reply],
        [ids.message],
        "2026-08-23T17:00:00.000Z"
      ),
    ContractValidationError
  );
  assert.equal(parseDiscordBackfillCursor(shortPage).version, 1);
  assert.equal(
    advanceDiscordBackfillCursor(cursor(), ["9", "10"], [], "2026-08-23T17:00:00.000Z")
      .afterMessageId,
    "10"
  );
  assert.throws(
    () =>
      advanceDiscordBackfillCursor(
        cursor({ afterMessageId: ids.user, state: "running" }),
        [ids.reply],
        [ids.reply],
        "2026-08-23T17:00:00.000Z"
      ),
    ContractValidationError
  );
});

test("rate-limit observations follow provider delay and expose no request/content fields", () => {
  const rateLimit = {
    schemaVersion: "hed74-discord-rate-limit-v1",
    scope: "route",
    bucket: "discord-bucket-redacted-001",
    retryAfterMs: 1_250,
    observedAt: "2026-08-23T17:00:00.000Z",
    attempt: 2
  };
  assert.equal(parseDiscordRateLimit(rateLimit).retryAfterMs, 1_250);
  for (const candidate of [
    { ...rateLimit, retryAfterMs: 3_600_001 },
    { ...rateLimit, attempt: 11 },
    { ...rateLimit, content: "must-not-enter-rate-limit-state" },
    { ...rateLimit, authorization: "must-not-enter-rate-limit-state" }
  ]) {
    assert.throws(() => parseDiscordRateLimit(candidate), ContractValidationError);
  }
});
