import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  ContractValidationError,
  DISCORD_ALPHA_COMMAND_CATALOG,
  DISCORD_CAPTURE_GATEWAY_INTENTS,
  DISCORD_CAPTURE_PERMISSION_BITS,
  DISCORD_COMMAND_PERMISSION_BITS,
  computeIntegrationEventIdempotencyKey,
  mapDiscordGatewayMessageToIntegrationEvent,
  mapDiscordManualCaptureToIntegrationEvent,
  parseDiscordAuditFact,
  parseDiscordConnectionBinding,
  parseDiscordGatewayMessage,
  parseDiscordInteractionCommand,
  verifyDiscordInteractionSignature
} from "../../packages/contracts/dist/index.js";

const ids = {
  application: "123456789012345670",
  guild: "123456789012345671",
  channel: "123456789012345672",
  otherChannel: "123456789012345673",
  message: "123456789012345674",
  user: "123456789012345675",
  interaction: "123456789012345676"
};

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function integrationConnection(overrides = {}) {
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

function binding(overrides = {}) {
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
    permissionBits: DISCORD_CAPTURE_PERMISSION_BITS,
    gatewayIntents: [...DISCORD_CAPTURE_GATEWAY_INTENTS],
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

function commandsOnlyBinding(overrides = {}) {
  return binding({
    mode: "commandsOnly",
    permissionBits: DISCORD_COMMAND_PERMISSION_BITS,
    gatewayIntents: [],
    privilegedIntentReviewState: "notRequested",
    ...overrides
  });
}

function command(overrides = {}) {
  return {
    schemaVersion: "hed70-discord-command-v1",
    interactionId: ids.interaction,
    applicationId: ids.application,
    guildId: ids.guild,
    channelId: ids.channel,
    userId: ids.user,
    command: "codex.status",
    kind: "slash",
    arguments: {},
    issuedAt: "2026-08-23T17:00:00.000Z",
    ...overrides
  };
}

function gatewayMessage(overrides = {}) {
  return {
    schemaVersion: "hed70-discord-message-v1",
    gatewaySessionId: "discord-gateway-session-redacted-001",
    gatewaySequence: "42",
    dispatch: "MESSAGE_CREATE",
    applicationId: ids.application,
    guildId: ids.guild,
    channelId: ids.channel,
    messageId: ids.message,
    sourceKind: "user",
    authorId: ids.user,
    content: "The party enters the redacted vault.",
    messageCreatedAt: "2026-08-23T16:59:59.000Z",
    messageEditedAt: null,
    occurredAt: "2026-08-23T16:59:59.000Z",
    ...overrides
  };
}

function mappingContext(overrides = {}) {
  return {
    connection: integrationConnection(),
    binding: binding(),
    eventId: "event-discord-redacted-001",
    sessionId: "session-redacted-001",
    receivedAt: "2026-08-23T17:00:00.000Z",
    evaluatedAt: "2026-08-23T17:00:00.500Z",
    maxClockSkewMs: 30_000,
    integrationSequence: "7",
    traceId: "trace-discord-redacted-001",
    sha256,
    ...overrides
  };
}

test("Discord connection modes freeze scopes, permissions, intents and exact tenant binding", () => {
  const capture = parseDiscordConnectionBinding(binding(), integrationConnection());
  assert.equal(capture.mode, "channelCapture");
  assert.equal(capture.permissionBits, "84992");
  assert.deepEqual(capture.gatewayIntents, ["GUILDS", "GUILD_MESSAGES", "MESSAGE_CONTENT"]);

  const commands = parseDiscordConnectionBinding(commandsOnlyBinding(), integrationConnection());
  assert.equal(commands.mode, "commandsOnly");
  assert.equal(commands.permissionBits, "19456");
  assert.deepEqual(commands.gatewayIntents, []);

  for (const candidate of [
    binding({ guildId: "223456789012345671" }),
    binding({ campaignId: "campaign-redacted-002" }),
    binding({ oauthScopes: ["applications.commands", "bot", "identify"] }),
    binding({ permissionBits: "8" }),
    binding({ gatewayIntents: ["GUILDS", "GUILD_MESSAGES"] }),
    binding({ botCredentialVersion: "discord-credential-v2" }),
    binding({ retentionPolicyVersion: "discord-retention-v2" }),
    binding({ deletionPolicyVersion: "discord-deletion-v2" }),
    commandsOnlyBinding({ privilegedIntentReviewState: "approved" })
  ]) {
    assert.throws(
      () => parseDiscordConnectionBinding(candidate, integrationConnection()),
      ContractValidationError
    );
  }
});

test("interaction signatures bind timestamp plus raw body and reject stale, invalid or oversized input", () => {
  const rawBody = JSON.stringify({ type: 1 });
  const signatureTimestamp = String(Date.parse("2026-08-23T17:00:00.000Z") / 1_000);
  let verifiedMessage = null;
  const context = {
    publicKeyHex: "b".repeat(64),
    receivedAt: "2026-08-23T17:00:01.000Z",
    maxClockSkewMs: 5_000,
    verifyEd25519(message, signature, publicKey) {
      verifiedMessage = message;
      return signature === "a".repeat(128) && publicKey === "b".repeat(64);
    }
  };
  const result = verifyDiscordInteractionSignature(
    { signatureHex: "a".repeat(128), signatureTimestamp, rawBody },
    context
  );
  assert.equal(result.verifiedAt, context.receivedAt);
  assert.equal(verifiedMessage, `${signatureTimestamp}${rawBody}`);

  assert.throws(
    () =>
      verifyDiscordInteractionSignature(
        { signatureHex: "c".repeat(128), signatureTimestamp, rawBody },
        context
      ),
    ContractValidationError
  );
  assert.throws(
    () =>
      verifyDiscordInteractionSignature(
        { signatureHex: "a".repeat(128), signatureTimestamp, rawBody },
        { ...context, receivedAt: "2026-08-23T17:01:00.000Z" }
      ),
    ContractValidationError
  );
  assert.throws(
    () =>
      verifyDiscordInteractionSignature(
        { signatureHex: "a".repeat(128), signatureTimestamp, rawBody: "x".repeat(32_769) },
        context
      ),
    ContractValidationError
  );
});

test("the alpha catalog is closed, ephemeral and maps commands to campaign policy actions", () => {
  assert.equal(DISCORD_ALPHA_COMMAND_CATALOG.length, 6);
  assert.ok(
    DISCORD_ALPHA_COMMAND_CATALOG.every((entry) => entry.responseVisibility === "ephemeral")
  );
  assert.ok(
    DISCORD_ALPHA_COMMAND_CATALOG.every(
      (entry) => entry.availableWithoutMessageContentIntent === true
    )
  );

  const trustedBinding = parseDiscordConnectionBinding(
    commandsOnlyBinding(),
    integrationConnection()
  );
  const status = parseDiscordInteractionCommand(command(), trustedBinding);
  assert.equal(status.requiredAction, "discord.command.player");
  const capture = parseDiscordInteractionCommand(
    command({
      command: "codex.capture.start",
      arguments: { channelId: ids.channel }
    }),
    trustedBinding
  );
  assert.equal(capture.requiredAction, "discord.command.gm");
});

test("commands reject guild/channel spoofing, catalog drift and sensitive transport fields", () => {
  const trustedBinding = parseDiscordConnectionBinding(
    commandsOnlyBinding(),
    integrationConnection()
  );
  for (const candidate of [
    command({ guildId: "223456789012345671" }),
    command({ channelId: ids.otherChannel }),
    command({ command: "codex.admin" }),
    command({ command: "codex.message.capture", kind: "slash" }),
    command({ token: "interaction-token-must-never-cross" }),
    command({ command: "codex.ask", arguments: { question: "x", promptInjection: true } })
  ]) {
    assert.throws(
      () => parseDiscordInteractionCommand(candidate, trustedBinding),
      ContractValidationError
    );
  }
});

test("Gateway create, update and delete map to the frozen HED-56 Discord event family", () => {
  const created = mapDiscordGatewayMessageToIntegrationEvent(gatewayMessage(), mappingContext());
  assert.equal(created.type, "chat.message.created");
  assert.equal(created.stream, `discord.channel.${ids.channel}`);
  assert.equal(created.sourceEventId, ids.message);
  assert.equal(created.sequence, "7");
  assert.equal(created.payload.gatewaySequence, "42");
  assert.equal(created.payload.content, "The party enters the redacted vault.");
  assert.equal(created.visibility.classification, "restricted");

  const replay = mapDiscordGatewayMessageToIntegrationEvent(gatewayMessage(), mappingContext());
  assert.equal(replay.checksum, created.checksum);
  const wrongSequenceReplay = mapDiscordGatewayMessageToIntegrationEvent(
    gatewayMessage(),
    mappingContext({ integrationSequence: "8" })
  );
  assert.notEqual(wrongSequenceReplay.checksum, created.checksum);
  const { checksum: _replayChecksum, ...replayInput } = replay;
  const { checksum: _wrongSequenceChecksum, ...wrongSequenceInput } = wrongSequenceReplay;
  assert.equal(
    computeIntegrationEventIdempotencyKey(replayInput, sha256),
    computeIntegrationEventIdempotencyKey(wrongSequenceInput, sha256)
  );

  const updated = mapDiscordGatewayMessageToIntegrationEvent(
    gatewayMessage({
      gatewaySequence: "43",
      dispatch: "MESSAGE_UPDATE",
      content: "The party enters the redacted archive.",
      messageEditedAt: "2026-08-23T17:00:00.000Z",
      occurredAt: "2026-08-23T17:00:00.000Z"
    }),
    mappingContext({ eventId: "event-discord-redacted-002" })
  );
  assert.equal(updated.type, "chat.message.updated");
  assert.match(updated.sourceEventVersion, /^edit:/);

  const deleted = mapDiscordGatewayMessageToIntegrationEvent(
    gatewayMessage({
      gatewaySequence: "44",
      dispatch: "MESSAGE_DELETE",
      sourceKind: "system",
      authorId: null,
      content: null,
      messageCreatedAt: null,
      messageEditedAt: null,
      occurredAt: "2026-08-23T17:00:00.000Z"
    }),
    mappingContext({ eventId: "event-discord-redacted-003" })
  );
  assert.equal(deleted.type, "chat.message.deleted");
  assert.equal(deleted.actor.kind, "system");
  assert.equal(deleted.payload.content, null);
});

test("Gateway capture excludes bots/webhooks, partial edits and unconfigured channels", () => {
  const trustedBinding = parseDiscordConnectionBinding(binding(), integrationConnection());
  for (const candidate of [
    gatewayMessage({ sourceKind: "bot" }),
    gatewayMessage({ sourceKind: "webhook" }),
    gatewayMessage({ channelId: ids.otherChannel }),
    gatewayMessage({
      dispatch: "MESSAGE_UPDATE",
      content: null,
      messageEditedAt: "2026-08-23T17:00:00.000Z",
      occurredAt: "2026-08-23T17:00:00.000Z"
    })
  ]) {
    assert.throws(
      () => parseDiscordGatewayMessage(candidate, trustedBinding),
      ContractValidationError
    );
  }
  assert.throws(
    () =>
      parseDiscordGatewayMessage(
        gatewayMessage(),
        parseDiscordConnectionBinding(commandsOnlyBinding(), integrationConnection())
      ),
    ContractValidationError
  );
});

test("message-context capture is the no-privileged-intent evidence fallback", () => {
  const manualCommand = command({
    command: "codex.message.capture",
    kind: "messageContext",
    arguments: {
      targetMessage: {
        messageId: ids.message,
        channelId: ids.channel,
        authorId: ids.user,
        content: "Explicitly selected redacted message.",
        createdAt: "2026-08-23T16:59:00.000Z",
        editedAt: null
      }
    }
  });
  const event = mapDiscordManualCaptureToIntegrationEvent(
    manualCommand,
    mappingContext({
      binding: commandsOnlyBinding(),
      authorizedAction: "discord.command.gm"
    })
  );
  assert.equal(event.type, "chat.message.created");
  assert.equal(event.sequence, "7");
  assert.equal(event.payload.source, "messageContext");
  assert.equal(event.causationId, ids.interaction);
});

test("manual capture cannot bypass the GM policy decision or configured-channel binding", () => {
  const manualCommand = command({
    command: "codex.message.capture",
    kind: "messageContext",
    arguments: {
      targetMessage: {
        messageId: ids.message,
        channelId: ids.channel,
        authorId: ids.user,
        content: "Explicitly selected redacted message.",
        createdAt: "2026-08-23T16:59:00.000Z",
        editedAt: null
      }
    }
  });
  assert.throws(
    () =>
      mapDiscordManualCaptureToIntegrationEvent(
        manualCommand,
        mappingContext({
          binding: commandsOnlyBinding(),
          authorizedAction: "discord.command.player"
        })
      ),
    ContractValidationError
  );
  assert.throws(
    () =>
      mapDiscordManualCaptureToIntegrationEvent(
        {
          ...manualCommand,
          arguments: {
            targetMessage: { ...manualCommand.arguments.targetMessage, channelId: ids.otherChannel }
          }
        },
        mappingContext({ binding: commandsOnlyBinding(), authorizedAction: "discord.command.gm" })
      ),
    ContractValidationError
  );
});

test("Discord audit facts are payload-free and reject message or credential leakage", () => {
  const audit = {
    schemaVersion: "hed70-discord-audit-v1",
    auditId: "audit-discord-redacted-001",
    connectionId: "connection-discord-redacted-001",
    workspaceId: "workspace-redacted-001",
    campaignId: "campaign-redacted-001",
    guildId: ids.guild,
    channelId: ids.channel,
    action: "event.accepted",
    outcome: "SUCCEEDED",
    credentialVersion: "discord-credential-v3",
    traceId: "trace-discord-redacted-001",
    occurredAt: "2026-08-23T17:00:00.000Z"
  };
  assert.equal(parseDiscordAuditFact(audit).action, "event.accepted");
  for (const leaked of [
    { ...audit, content: "private message" },
    { ...audit, botToken: "redacted-secret" },
    { ...audit, interactionToken: "redacted-secret" }
  ]) {
    assert.throws(() => parseDiscordAuditFact(leaked), ContractValidationError);
  }
});
