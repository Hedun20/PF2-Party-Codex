import {
  computeIntegrationEventChecksum,
  parseIntegrationConnection,
  parseNormalizedIntegrationEvent,
  type IntegrationEventVerificationContext,
  type NormalizedIntegrationEventContract,
  type NormalizedIntegrationEventHashInputContract
} from "./integrations.js";
import {
  parseCampaignId,
  parseIntegrationConnectionId,
  parseWorkspaceId,
  type CampaignId,
  type IntegrationConnectionId,
  type WorkspaceId
} from "./ids.js";
import type { HumanCampaignAction } from "./policy.js";
import {
  expectEnum,
  expectExactKeys,
  expectRecord,
  expectString,
  fail,
  type JsonObject
} from "./validation.js";

declare const discordSnowflakeBrand: unique symbol;

export type DiscordSnowflake<Kind extends string> = string & {
  readonly [discordSnowflakeBrand]: Kind;
};

export type DiscordApplicationId = DiscordSnowflake<"DiscordApplicationId">;
export type DiscordGuildId = DiscordSnowflake<"DiscordGuildId">;
export type DiscordChannelId = DiscordSnowflake<"DiscordChannelId">;
export type DiscordMessageId = DiscordSnowflake<"DiscordMessageId">;
export type DiscordAttachmentId = DiscordSnowflake<"DiscordAttachmentId">;
export type DiscordUserId = DiscordSnowflake<"DiscordUserId">;
export type DiscordInteractionId = DiscordSnowflake<"DiscordInteractionId">;

export const DISCORD_CONNECTION_MODES = ["commandsOnly", "channelCapture"] as const;
export const DISCORD_INTERACTION_TRANSPORTS = ["outgoingWebhook"] as const;
export const DISCORD_OAUTH_SCOPES = ["applications.commands", "bot"] as const;
export const DISCORD_COMMAND_PERMISSION_NAMES = [
  "VIEW_CHANNEL",
  "SEND_MESSAGES",
  "EMBED_LINKS"
] as const;
export const DISCORD_CAPTURE_PERMISSION_NAMES = [
  "VIEW_CHANNEL",
  "SEND_MESSAGES",
  "EMBED_LINKS",
  "READ_MESSAGE_HISTORY"
] as const;
export const DISCORD_COMMAND_PERMISSION_BITS = "19456" as const;
export const DISCORD_CAPTURE_PERMISSION_BITS = "84992" as const;
export const DISCORD_CAPTURE_GATEWAY_INTENTS = [
  "GUILDS",
  "GUILD_MESSAGES",
  "MESSAGE_CONTENT"
] as const;
export const DISCORD_PRIVILEGED_INTENT_REVIEW_STATES = [
  "notRequested",
  "enabledBelowReviewThreshold",
  "approved"
] as const;
export const DISCORD_COMMAND_IDS = [
  "codex.status",
  "codex.recap",
  "codex.ask",
  "codex.capture.start",
  "codex.capture.stop",
  "codex.message.capture"
] as const;
export const DISCORD_COMMAND_KINDS = ["slash", "messageContext"] as const;
export const DISCORD_GATEWAY_MESSAGE_DISPATCHES = [
  "MESSAGE_CREATE",
  "MESSAGE_UPDATE",
  "MESSAGE_DELETE"
] as const;
export const DISCORD_AUDIT_ACTIONS = [
  "connection.paired",
  "connection.paused",
  "connection.revoked",
  "credential.rotated",
  "capture.started",
  "capture.stopped",
  "command.allowed",
  "command.denied",
  "event.accepted",
  "event.quarantined",
  "gateway.resumed",
  "gateway.reidentified"
] as const;
export const DISCORD_SAFE_OUTCOMES = [
  "SUCCEEDED",
  "DENIED",
  "INVALID_SIGNATURE",
  "STALE_SIGNATURE",
  "BINDING_MISMATCH",
  "CHANNEL_NOT_CONFIGURED",
  "COMMAND_UNSUPPORTED",
  "INTENT_NOT_APPROVED",
  "RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "EVENT_QUARANTINED"
] as const;

export type DiscordConnectionMode = (typeof DISCORD_CONNECTION_MODES)[number];
export type DiscordInteractionTransport = (typeof DISCORD_INTERACTION_TRANSPORTS)[number];
export type DiscordPrivilegedIntentReviewState =
  (typeof DISCORD_PRIVILEGED_INTENT_REVIEW_STATES)[number];
export type DiscordCommandId = (typeof DISCORD_COMMAND_IDS)[number];
export type DiscordCommandKind = (typeof DISCORD_COMMAND_KINDS)[number];
export type DiscordGatewayMessageDispatch = (typeof DISCORD_GATEWAY_MESSAGE_DISPATCHES)[number];
export type DiscordAuditAction = (typeof DISCORD_AUDIT_ACTIONS)[number];
export type DiscordSafeOutcome = (typeof DISCORD_SAFE_OUTCOMES)[number];

export interface DiscordAlphaCommandDefinition {
  readonly id: DiscordCommandId;
  readonly discordName: string;
  readonly kind: DiscordCommandKind;
  readonly requiredAction: Extract<
    HumanCampaignAction,
    "discord.command.player" | "discord.command.gm"
  >;
  readonly responseVisibility: "ephemeral";
  readonly availableWithoutMessageContentIntent: true;
}

export const DISCORD_ALPHA_COMMAND_CATALOG: readonly DiscordAlphaCommandDefinition[] = [
  {
    id: "codex.status",
    discordName: "/codex status",
    kind: "slash",
    requiredAction: "discord.command.player",
    responseVisibility: "ephemeral",
    availableWithoutMessageContentIntent: true
  },
  {
    id: "codex.recap",
    discordName: "/codex recap",
    kind: "slash",
    requiredAction: "discord.command.player",
    responseVisibility: "ephemeral",
    availableWithoutMessageContentIntent: true
  },
  {
    id: "codex.ask",
    discordName: "/codex ask",
    kind: "slash",
    requiredAction: "discord.command.player",
    responseVisibility: "ephemeral",
    availableWithoutMessageContentIntent: true
  },
  {
    id: "codex.capture.start",
    discordName: "/codex capture start",
    kind: "slash",
    requiredAction: "discord.command.gm",
    responseVisibility: "ephemeral",
    availableWithoutMessageContentIntent: true
  },
  {
    id: "codex.capture.stop",
    discordName: "/codex capture stop",
    kind: "slash",
    requiredAction: "discord.command.gm",
    responseVisibility: "ephemeral",
    availableWithoutMessageContentIntent: true
  },
  {
    id: "codex.message.capture",
    discordName: "Capture in Party Codex",
    kind: "messageContext",
    requiredAction: "discord.command.gm",
    responseVisibility: "ephemeral",
    availableWithoutMessageContentIntent: true
  }
] as const;

export interface DiscordChannelBindingContract {
  readonly channelId: DiscordChannelId;
  readonly stream: string;
}

export interface DiscordConnectionBindingContract {
  readonly schemaVersion: "hed70-discord-connection-v1";
  readonly connectionId: IntegrationConnectionId;
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly applicationId: DiscordApplicationId;
  readonly guildId: DiscordGuildId;
  readonly channels: readonly DiscordChannelBindingContract[];
  readonly mode: DiscordConnectionMode;
  readonly interactionTransport: DiscordInteractionTransport;
  readonly oauthScopes: readonly (typeof DISCORD_OAUTH_SCOPES)[number][];
  readonly permissionBits:
    | typeof DISCORD_COMMAND_PERMISSION_BITS
    | typeof DISCORD_CAPTURE_PERMISSION_BITS;
  readonly gatewayIntents: readonly (typeof DISCORD_CAPTURE_GATEWAY_INTENTS)[number][];
  readonly privilegedIntentReviewState: DiscordPrivilegedIntentReviewState;
  readonly commandCatalogVersion: "hed70-alpha-v1";
  readonly interactionPublicKeyVersion: string;
  readonly botCredentialVersion: string;
  readonly retentionPolicyVersion: string;
  readonly deletionPolicyVersion: string;
  readonly updatedAt: string;
}

export interface DiscordMessageTargetContract {
  readonly messageId: DiscordMessageId;
  readonly channelId: DiscordChannelId;
  readonly authorId: DiscordUserId;
  readonly content: string;
  readonly createdAt: string;
  readonly editedAt: string | null;
}

export type DiscordCommandArgumentsContract =
  | Readonly<Record<string, never>>
  | { readonly question: string }
  | { readonly channelId: DiscordChannelId }
  | { readonly targetMessage: DiscordMessageTargetContract };

export interface DiscordInteractionCommandContract {
  readonly schemaVersion: "hed70-discord-command-v1";
  readonly interactionId: DiscordInteractionId;
  readonly applicationId: DiscordApplicationId;
  readonly guildId: DiscordGuildId;
  readonly channelId: DiscordChannelId;
  readonly userId: DiscordUserId;
  readonly command: DiscordCommandId;
  readonly kind: DiscordCommandKind;
  readonly arguments: DiscordCommandArgumentsContract;
  readonly issuedAt: string;
  readonly requiredAction: Extract<
    HumanCampaignAction,
    "discord.command.player" | "discord.command.gm"
  >;
  readonly responseVisibility: "ephemeral";
}

export interface DiscordInteractionSignatureInput {
  readonly signatureHex: string;
  readonly signatureTimestamp: string;
  readonly rawBody: string;
}

export interface DiscordInteractionSignatureContext {
  readonly publicKeyHex: string;
  readonly receivedAt: string;
  readonly maxClockSkewMs: number;
  readonly verifyEd25519: (message: string, signatureHex: string, publicKeyHex: string) => boolean;
}

export interface VerifiedDiscordInteractionSignature {
  readonly schemaVersion: "hed70-discord-signature-v1";
  readonly signatureTimestamp: string;
  readonly verifiedAt: string;
}

export interface DiscordGatewayMessageContract {
  readonly schemaVersion: "hed70-discord-message-v1";
  readonly gatewaySessionId: string;
  readonly gatewaySequence: string;
  readonly dispatch: DiscordGatewayMessageDispatch;
  readonly applicationId: DiscordApplicationId;
  readonly guildId: DiscordGuildId;
  readonly channelId: DiscordChannelId;
  readonly messageId: DiscordMessageId;
  readonly sourceKind: "user" | "bot" | "webhook" | "system";
  readonly authorId: DiscordUserId | null;
  readonly content: string | null;
  readonly messageCreatedAt: string | null;
  readonly messageEditedAt: string | null;
  readonly occurredAt: string;
}

export interface DiscordEventMappingContext extends IntegrationEventVerificationContext {
  readonly binding: unknown;
  readonly integrationSequence: string;
  readonly traceId: string;
}

export interface DiscordManualCaptureMappingContext extends DiscordEventMappingContext {
  readonly authorizedAction: "discord.command.gm";
}

export interface DiscordAuditFactContract {
  readonly schemaVersion: "hed70-discord-audit-v1";
  readonly auditId: string;
  readonly connectionId: IntegrationConnectionId;
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly guildId: DiscordGuildId;
  readonly channelId: DiscordChannelId | null;
  readonly action: DiscordAuditAction;
  readonly outcome: DiscordSafeOutcome;
  readonly credentialVersion: string;
  readonly traceId: string;
  readonly occurredAt: string;
}

const DISCORD_SNOWFLAKE = /^[1-9][0-9]{0,19}$/;
const CANONICAL_SEQUENCE = /^(?:0|[1-9][0-9]{0,39})$/;
const CANONICAL_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const LOWERCASE_HEX_64 = /^[a-f0-9]{64}$/;
const LOWERCASE_HEX_128 = /^[a-f0-9]{128}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_CHANNELS = 32;
const MAX_CONTENT_BYTES = 16_384;
const MAX_INTERACTION_BODY_BYTES = 32_768;
const MAX_QUESTION_LENGTH = 1_000;
const MAX_SIGNATURE_SKEW_MS = 300_000;

function parseDiscordSnowflake<Kind extends string>(
  value: unknown,
  path: string
): DiscordSnowflake<Kind> {
  const snowflake = expectString(value, path);
  if (!DISCORD_SNOWFLAKE.test(snowflake))
    return fail(path, "expected a canonical Discord snowflake");
  return snowflake as DiscordSnowflake<Kind>;
}

export function parseDiscordApplicationId(
  value: unknown,
  path = "applicationId"
): DiscordApplicationId {
  return parseDiscordSnowflake<"DiscordApplicationId">(value, path);
}

export function parseDiscordGuildId(value: unknown, path = "guildId"): DiscordGuildId {
  return parseDiscordSnowflake<"DiscordGuildId">(value, path);
}

export function parseDiscordChannelId(value: unknown, path = "channelId"): DiscordChannelId {
  return parseDiscordSnowflake<"DiscordChannelId">(value, path);
}

export function parseDiscordMessageId(value: unknown, path = "messageId"): DiscordMessageId {
  return parseDiscordSnowflake<"DiscordMessageId">(value, path);
}

export function parseDiscordAttachmentId(
  value: unknown,
  path = "attachmentId"
): DiscordAttachmentId {
  return parseDiscordSnowflake<"DiscordAttachmentId">(value, path);
}

export function parseDiscordUserId(value: unknown, path = "userId"): DiscordUserId {
  return parseDiscordSnowflake<"DiscordUserId">(value, path);
}

export function parseDiscordInteractionId(
  value: unknown,
  path = "interactionId"
): DiscordInteractionId {
  return parseDiscordSnowflake<"DiscordInteractionId">(value, path);
}

function parseCanonicalInstant(value: unknown, path: string): string {
  const instant = expectString(value, path);
  const milliseconds = Date.parse(instant);
  if (
    !CANONICAL_INSTANT.test(instant) ||
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== instant
  ) {
    return fail(path, "expected a canonical UTC instant");
  }
  return instant;
}

function parseSafeId(value: unknown, path: string): string {
  const id = expectString(value, path);
  if (!SAFE_ID.test(id)) return fail(path, "expected a bounded stable identifier");
  return id;
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function compareDiscordSnowflakes(left: string, right: string): number {
  if (left.length !== right.length) return left.length - right.length;
  return left < right ? -1 : left > right ? 1 : 0;
}

function expectExactStringList(
  value: unknown,
  expected: readonly string[],
  path: string
): readonly string[] {
  if (!Array.isArray(value) || value.length !== expected.length) {
    return fail(path, `expected exact list: ${expected.join(", ")}`);
  }
  value.forEach((item, index) => {
    if (item !== expected[index]) fail(`${path}[${index}]`, `expected ${expected[index]}`);
  });
  return [...expected];
}

function parseChannelBinding(value: unknown, path: string): DiscordChannelBindingContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, ["channelId", "stream"], path);
  return {
    channelId: parseDiscordChannelId(record["channelId"], `${path}.channelId`),
    stream: parseSafeId(record["stream"], `${path}.stream`)
  };
}

function findChannel(
  binding: DiscordConnectionBindingContract,
  channelId: DiscordChannelId,
  path: string
): DiscordChannelBindingContract {
  const channel = binding.channels.find((candidate) => candidate.channelId === channelId);
  if (!channel) return fail(path, "channel is not configured for this connection");
  return channel;
}

export function parseDiscordConnectionBinding(
  value: unknown,
  trustedIntegrationConnection: unknown
): DiscordConnectionBindingContract {
  const path = "discordConnection";
  const record = expectRecord(value, path);
  expectExactKeys(
    record,
    [
      "schemaVersion",
      "connectionId",
      "workspaceId",
      "campaignId",
      "applicationId",
      "guildId",
      "channels",
      "mode",
      "interactionTransport",
      "oauthScopes",
      "permissionBits",
      "gatewayIntents",
      "privilegedIntentReviewState",
      "commandCatalogVersion",
      "interactionPublicKeyVersion",
      "botCredentialVersion",
      "retentionPolicyVersion",
      "deletionPolicyVersion",
      "updatedAt"
    ],
    path
  );
  if (record["schemaVersion"] !== "hed70-discord-connection-v1") {
    fail(`${path}.schemaVersion`, "unsupported Discord connection schema");
  }
  if (record["commandCatalogVersion"] !== "hed70-alpha-v1") {
    fail(`${path}.commandCatalogVersion`, "unsupported command catalog");
  }

  const integrationConnection = parseIntegrationConnection(trustedIntegrationConnection);
  if (integrationConnection.provider !== "discord") fail(path, "trusted connection is not Discord");

  const connectionId = parseIntegrationConnectionId(record["connectionId"], `${path}.connectionId`);
  const workspaceId = parseWorkspaceId(record["workspaceId"], `${path}.workspaceId`);
  const campaignId = parseCampaignId(record["campaignId"], `${path}.campaignId`);
  const guildId = parseDiscordGuildId(record["guildId"], `${path}.guildId`);
  if (
    connectionId !== integrationConnection.connectionId ||
    workspaceId !== integrationConnection.workspaceId ||
    campaignId !== integrationConnection.campaignId ||
    guildId !== integrationConnection.externalInstanceId
  ) {
    fail(path, "Discord binding does not match the trusted integration connection");
  }

  if (!Array.isArray(record["channels"])) fail(`${path}.channels`, "expected an array");
  if (record["channels"].length === 0 || record["channels"].length > MAX_CHANNELS) {
    fail(`${path}.channels`, `must contain between 1 and ${MAX_CHANNELS} channels`);
  }
  const channels = record["channels"].map((item, index) =>
    parseChannelBinding(item, `${path}.channels[${index}]`)
  );
  for (let index = 0; index < channels.length; index += 1) {
    const previous = channels[index - 1];
    const current = channels[index];
    if (
      current &&
      previous &&
      compareDiscordSnowflakes(current.channelId, previous.channelId) <= 0
    ) {
      fail(`${path}.channels[${index}]`, "channels must be sorted and unique");
    }
    if (current && !integrationConnection.allowedStreams.includes(current.stream)) {
      fail(`${path}.channels[${index}].stream`, "stream is not allowed by the connection");
    }
  }

  const mode = expectEnum(record["mode"], DISCORD_CONNECTION_MODES, `${path}.mode`);
  const reviewState = expectEnum(
    record["privilegedIntentReviewState"],
    DISCORD_PRIVILEGED_INTENT_REVIEW_STATES,
    `${path}.privilegedIntentReviewState`
  );
  expectExactStringList(record["oauthScopes"], DISCORD_OAUTH_SCOPES, `${path}.oauthScopes`);

  const permissionBits = expectString(record["permissionBits"], `${path}.permissionBits`);
  const expectedPermissionBits =
    mode === "commandsOnly" ? DISCORD_COMMAND_PERMISSION_BITS : DISCORD_CAPTURE_PERMISSION_BITS;
  if (permissionBits !== expectedPermissionBits) {
    fail(`${path}.permissionBits`, `expected least-privilege bitset ${expectedPermissionBits}`);
  }
  const expectedIntents = mode === "commandsOnly" ? [] : DISCORD_CAPTURE_GATEWAY_INTENTS;
  expectExactStringList(record["gatewayIntents"], expectedIntents, `${path}.gatewayIntents`);
  if (mode === "commandsOnly" && reviewState !== "notRequested") {
    fail(
      `${path}.privilegedIntentReviewState`,
      "commands-only mode must not request a privileged intent"
    );
  }
  if (mode === "channelCapture" && reviewState === "notRequested") {
    fail(
      `${path}.privilegedIntentReviewState`,
      "channel capture requires enabled or approved MESSAGE_CONTENT"
    );
  }

  const botCredentialVersion = parseSafeId(
    record["botCredentialVersion"],
    `${path}.botCredentialVersion`
  );
  const retentionPolicyVersion = parseSafeId(
    record["retentionPolicyVersion"],
    `${path}.retentionPolicyVersion`
  );
  const deletionPolicyVersion = parseSafeId(
    record["deletionPolicyVersion"],
    `${path}.deletionPolicyVersion`
  );
  if (botCredentialVersion !== integrationConnection.credentialVersion) {
    fail(`${path}.botCredentialVersion`, "must match the trusted connection credential version");
  }
  if (retentionPolicyVersion !== integrationConnection.retentionPolicyVersion) {
    fail(`${path}.retentionPolicyVersion`, "must match the trusted connection retention policy");
  }
  if (deletionPolicyVersion !== integrationConnection.deletionPolicyVersion) {
    fail(`${path}.deletionPolicyVersion`, "must match the trusted connection deletion policy");
  }

  return {
    schemaVersion: "hed70-discord-connection-v1",
    connectionId,
    workspaceId,
    campaignId,
    applicationId: parseDiscordApplicationId(record["applicationId"], `${path}.applicationId`),
    guildId,
    channels,
    mode,
    interactionTransport: expectEnum(
      record["interactionTransport"],
      DISCORD_INTERACTION_TRANSPORTS,
      `${path}.interactionTransport`
    ),
    oauthScopes: [...DISCORD_OAUTH_SCOPES],
    permissionBits: expectedPermissionBits,
    gatewayIntents: [...expectedIntents],
    privilegedIntentReviewState: reviewState,
    commandCatalogVersion: "hed70-alpha-v1",
    interactionPublicKeyVersion: parseSafeId(
      record["interactionPublicKeyVersion"],
      `${path}.interactionPublicKeyVersion`
    ),
    botCredentialVersion,
    retentionPolicyVersion,
    deletionPolicyVersion,
    updatedAt: parseCanonicalInstant(record["updatedAt"], `${path}.updatedAt`)
  };
}

export function verifyDiscordInteractionSignature(
  value: unknown,
  context: DiscordInteractionSignatureContext
): VerifiedDiscordInteractionSignature {
  const path = "discordSignature";
  const record = expectRecord(value, path);
  expectExactKeys(record, ["signatureHex", "signatureTimestamp", "rawBody"], path);
  const signatureHex = expectString(record["signatureHex"], `${path}.signatureHex`);
  const signatureTimestamp = expectString(
    record["signatureTimestamp"],
    `${path}.signatureTimestamp`
  );
  const rawBody = expectString(record["rawBody"], `${path}.rawBody`, true);
  if (!LOWERCASE_HEX_128.test(signatureHex))
    fail(`${path}.signatureHex`, "expected lowercase Ed25519 signature");
  if (!/^[1-9][0-9]{9,10}$/.test(signatureTimestamp)) {
    fail(`${path}.signatureTimestamp`, "expected canonical Unix seconds");
  }
  if (!LOWERCASE_HEX_64.test(context.publicKeyHex))
    fail("context.publicKeyHex", "expected lowercase Ed25519 public key");
  if (
    !Number.isSafeInteger(context.maxClockSkewMs) ||
    context.maxClockSkewMs < 0 ||
    context.maxClockSkewMs > MAX_SIGNATURE_SKEW_MS
  ) {
    fail("context.maxClockSkewMs", `must be between 0 and ${MAX_SIGNATURE_SKEW_MS}`);
  }
  if (utf8ByteLength(rawBody) > MAX_INTERACTION_BODY_BYTES) {
    fail(`${path}.rawBody`, `exceeds ${MAX_INTERACTION_BODY_BYTES} UTF-8 bytes`);
  }
  const receivedAt = parseCanonicalInstant(context.receivedAt, "context.receivedAt");
  const signedAtMs = Number(signatureTimestamp) * 1_000;
  if (Math.abs(Date.parse(receivedAt) - signedAtMs) > context.maxClockSkewMs) {
    fail(`${path}.signatureTimestamp`, "signature timestamp is outside the trusted allowance");
  }
  if (
    !context.verifyEd25519(`${signatureTimestamp}${rawBody}`, signatureHex, context.publicKeyHex)
  ) {
    fail(`${path}.signatureHex`, "invalid Discord interaction signature");
  }
  return {
    schemaVersion: "hed70-discord-signature-v1",
    signatureTimestamp,
    verifiedAt: receivedAt
  };
}

function parseMessageTarget(value: unknown, path: string): DiscordMessageTargetContract {
  const record = expectRecord(value, path);
  expectExactKeys(
    record,
    ["messageId", "channelId", "authorId", "content", "createdAt", "editedAt"],
    path
  );
  const content = expectString(record["content"], `${path}.content`);
  if (utf8ByteLength(content) > MAX_CONTENT_BYTES)
    fail(`${path}.content`, `exceeds ${MAX_CONTENT_BYTES} UTF-8 bytes`);
  const createdAt = parseCanonicalInstant(record["createdAt"], `${path}.createdAt`);
  const editedAt =
    record["editedAt"] === null
      ? null
      : parseCanonicalInstant(record["editedAt"], `${path}.editedAt`);
  if (editedAt !== null && Date.parse(editedAt) < Date.parse(createdAt)) {
    fail(`${path}.editedAt`, "must not predate message creation");
  }
  return {
    messageId: parseDiscordMessageId(record["messageId"], `${path}.messageId`),
    channelId: parseDiscordChannelId(record["channelId"], `${path}.channelId`),
    authorId: parseDiscordUserId(record["authorId"], `${path}.authorId`),
    content,
    createdAt,
    editedAt
  };
}

function parseCommandArguments(
  command: DiscordCommandId,
  value: unknown,
  path: string
): DiscordCommandArgumentsContract {
  const record = expectRecord(value, path);
  if (command === "codex.status" || command === "codex.recap") {
    expectExactKeys(record, [], path);
    return {};
  }
  if (command === "codex.ask") {
    expectExactKeys(record, ["question"], path);
    const question = expectString(record["question"], `${path}.question`);
    if (question.length > MAX_QUESTION_LENGTH)
      fail(`${path}.question`, `must be at most ${MAX_QUESTION_LENGTH} characters`);
    return { question };
  }
  if (command === "codex.capture.start" || command === "codex.capture.stop") {
    expectExactKeys(record, ["channelId"], path);
    return { channelId: parseDiscordChannelId(record["channelId"], `${path}.channelId`) };
  }
  expectExactKeys(record, ["targetMessage"], path);
  return { targetMessage: parseMessageTarget(record["targetMessage"], `${path}.targetMessage`) };
}

export function parseDiscordInteractionCommand(
  value: unknown,
  trustedBinding: DiscordConnectionBindingContract
): DiscordInteractionCommandContract {
  const path = "discordCommand";
  const record = expectRecord(value, path);
  expectExactKeys(
    record,
    [
      "schemaVersion",
      "interactionId",
      "applicationId",
      "guildId",
      "channelId",
      "userId",
      "command",
      "kind",
      "arguments",
      "issuedAt"
    ],
    path
  );
  if (record["schemaVersion"] !== "hed70-discord-command-v1") {
    fail(`${path}.schemaVersion`, "unsupported Discord command schema");
  }
  const applicationId = parseDiscordApplicationId(record["applicationId"], `${path}.applicationId`);
  const guildId = parseDiscordGuildId(record["guildId"], `${path}.guildId`);
  const channelId = parseDiscordChannelId(record["channelId"], `${path}.channelId`);
  if (applicationId !== trustedBinding.applicationId || guildId !== trustedBinding.guildId) {
    fail(path, "command application or guild does not match the trusted binding");
  }
  findChannel(trustedBinding, channelId, `${path}.channelId`);
  const command = expectEnum(record["command"], DISCORD_COMMAND_IDS, `${path}.command`);
  const kind = expectEnum(record["kind"], DISCORD_COMMAND_KINDS, `${path}.kind`);
  const definition = DISCORD_ALPHA_COMMAND_CATALOG.find((candidate) => candidate.id === command);
  if (!definition || definition.kind !== kind)
    fail(`${path}.kind`, "command kind does not match the alpha catalog");
  const args = parseCommandArguments(command, record["arguments"], `${path}.arguments`);
  if ("channelId" in args)
    findChannel(trustedBinding, args.channelId, `${path}.arguments.channelId`);
  if ("targetMessage" in args && args.targetMessage.channelId !== channelId) {
    fail(
      `${path}.arguments.targetMessage.channelId`,
      "target message must be in the invoking channel"
    );
  }
  return {
    schemaVersion: "hed70-discord-command-v1",
    interactionId: parseDiscordInteractionId(record["interactionId"], `${path}.interactionId`),
    applicationId,
    guildId,
    channelId,
    userId: parseDiscordUserId(record["userId"], `${path}.userId`),
    command,
    kind,
    arguments: args,
    issuedAt: parseCanonicalInstant(record["issuedAt"], `${path}.issuedAt`),
    requiredAction: definition.requiredAction,
    responseVisibility: "ephemeral"
  };
}

export function parseDiscordGatewayMessage(
  value: unknown,
  trustedBinding: DiscordConnectionBindingContract
): DiscordGatewayMessageContract {
  const path = "discordMessage";
  const record = expectRecord(value, path);
  expectExactKeys(
    record,
    [
      "schemaVersion",
      "gatewaySessionId",
      "gatewaySequence",
      "dispatch",
      "applicationId",
      "guildId",
      "channelId",
      "messageId",
      "sourceKind",
      "authorId",
      "content",
      "messageCreatedAt",
      "messageEditedAt",
      "occurredAt"
    ],
    path
  );
  if (record["schemaVersion"] !== "hed70-discord-message-v1") {
    fail(`${path}.schemaVersion`, "unsupported Discord message schema");
  }
  if (trustedBinding.mode !== "channelCapture")
    fail(path, "gateway messages require channel-capture mode");
  const applicationId = parseDiscordApplicationId(record["applicationId"], `${path}.applicationId`);
  const guildId = parseDiscordGuildId(record["guildId"], `${path}.guildId`);
  const channelId = parseDiscordChannelId(record["channelId"], `${path}.channelId`);
  if (applicationId !== trustedBinding.applicationId || guildId !== trustedBinding.guildId) {
    fail(path, "message application or guild does not match the trusted binding");
  }
  findChannel(trustedBinding, channelId, `${path}.channelId`);
  const sequence = expectString(record["gatewaySequence"], `${path}.gatewaySequence`);
  if (!CANONICAL_SEQUENCE.test(sequence))
    fail(`${path}.gatewaySequence`, "expected canonical decimal sequence");
  const dispatch = expectEnum(
    record["dispatch"],
    DISCORD_GATEWAY_MESSAGE_DISPATCHES,
    `${path}.dispatch`
  );
  const sourceKind = expectEnum(
    record["sourceKind"],
    ["user", "bot", "webhook", "system"] as const,
    `${path}.sourceKind`
  );
  const authorId =
    record["authorId"] === null ? null : parseDiscordUserId(record["authorId"], `${path}.authorId`);
  const content =
    record["content"] === null ? null : expectString(record["content"], `${path}.content`);
  if (content !== null && utf8ByteLength(content) > MAX_CONTENT_BYTES) {
    fail(`${path}.content`, `exceeds ${MAX_CONTENT_BYTES} UTF-8 bytes`);
  }
  const createdAt =
    record["messageCreatedAt"] === null
      ? null
      : parseCanonicalInstant(record["messageCreatedAt"], `${path}.messageCreatedAt`);
  const editedAt =
    record["messageEditedAt"] === null
      ? null
      : parseCanonicalInstant(record["messageEditedAt"], `${path}.messageEditedAt`);
  const occurredAt = parseCanonicalInstant(record["occurredAt"], `${path}.occurredAt`);

  if (dispatch === "MESSAGE_CREATE") {
    if (
      sourceKind !== "user" ||
      authorId === null ||
      content === null ||
      createdAt === null ||
      editedAt !== null
    ) {
      fail(path, "MESSAGE_CREATE requires a complete human-authored text snapshot");
    }
    if (occurredAt !== createdAt)
      fail(`${path}.occurredAt`, "must equal messageCreatedAt for MESSAGE_CREATE");
  } else if (dispatch === "MESSAGE_UPDATE") {
    if (
      sourceKind !== "user" ||
      authorId === null ||
      content === null ||
      createdAt === null ||
      editedAt === null
    ) {
      fail(path, "MESSAGE_UPDATE requires a complete merged human-authored text snapshot");
    }
    if (Date.parse(editedAt) < Date.parse(createdAt) || occurredAt !== editedAt) {
      fail(`${path}.messageEditedAt`, "must be coherent with creation and occurrence times");
    }
  } else if (
    sourceKind !== "system" ||
    authorId !== null ||
    content !== null ||
    createdAt !== null ||
    editedAt !== null
  ) {
    fail(path, "MESSAGE_DELETE must contain identifiers only");
  }

  return {
    schemaVersion: "hed70-discord-message-v1",
    gatewaySessionId: parseSafeId(record["gatewaySessionId"], `${path}.gatewaySessionId`),
    gatewaySequence: sequence,
    dispatch,
    applicationId,
    guildId,
    channelId,
    messageId: parseDiscordMessageId(record["messageId"], `${path}.messageId`),
    sourceKind,
    authorId,
    content,
    messageCreatedAt: createdAt,
    messageEditedAt: editedAt,
    occurredAt
  };
}

function buildNormalizedDiscordEvent(
  source: DiscordGatewayMessageContract | DiscordMessageTargetContract,
  sourceKind: "gateway" | "messageContext",
  context: DiscordEventMappingContext,
  commandInteractionId: DiscordInteractionId | null
): NormalizedIntegrationEventContract {
  const connection = parseIntegrationConnection(context.connection);
  const binding = parseDiscordConnectionBinding(context.binding, connection);
  const channelId = source.channelId;
  const channel = findChannel(binding, channelId, "discordEvent.channelId");
  const sequence = expectString(context.integrationSequence, "context.integrationSequence");
  if (!CANONICAL_SEQUENCE.test(sequence)) {
    fail("context.integrationSequence", "expected canonical integration-stream sequence");
  }
  const isGateway = "dispatch" in source;
  const messageId = source.messageId;
  const authorId = isGateway ? source.authorId : source.authorId;
  const content = isGateway ? source.content : source.content;
  const createdAt = isGateway ? source.messageCreatedAt : source.createdAt;
  const editedAt = isGateway ? source.messageEditedAt : source.editedAt;
  const occurredAt = isGateway ? source.occurredAt : (source.editedAt ?? source.createdAt);
  const type = isGateway
    ? source.dispatch === "MESSAGE_CREATE"
      ? "chat.message.created"
      : source.dispatch === "MESSAGE_UPDATE"
        ? "chat.message.updated"
        : "chat.message.deleted"
    : source.editedAt === null
      ? "chat.message.created"
      : "chat.message.updated";
  const sourceEventVersion = isGateway
    ? source.dispatch === "MESSAGE_CREATE"
      ? "create"
      : source.dispatch === "MESSAGE_UPDATE"
        ? `edit:${source.messageEditedAt}`
        : `delete:${source.gatewaySessionId}:${source.gatewaySequence}`
    : source.editedAt === null
      ? `created:${source.createdAt}`
      : `edit:${source.editedAt}`;
  const payload: JsonObject = {
    source: sourceKind,
    guildId: binding.guildId,
    channelId,
    messageId,
    authorId,
    content,
    messageCreatedAt: createdAt,
    messageEditedAt: editedAt,
    ...(isGateway
      ? {
          dispatch: source.dispatch,
          gatewaySessionId: source.gatewaySessionId,
          gatewaySequence: source.gatewaySequence
        }
      : {}),
    ...(commandInteractionId === null ? {} : { interactionId: commandInteractionId })
  };

  const input: NormalizedIntegrationEventHashInputContract = {
    schemaVersion: "hed56-event-v1",
    eventId: context.eventId,
    provider: "discord",
    connectionId: connection.connectionId,
    workspaceId: connection.workspaceId,
    campaignId: connection.campaignId,
    worldId: connection.worldId,
    sessionId: context.sessionId,
    stream: channel.stream,
    sourceDocumentId: messageId,
    sourceEventId: messageId,
    sourceEventVersion,
    sequence,
    occurredAt,
    receivedAt: context.receivedAt,
    actor: {
      kind: authorId === null ? "system" : "user",
      sourceActorId: authorId,
      displayName: null
    },
    speaker: null,
    type,
    visibility: { classification: "restricted", sourceActorIds: [] },
    payload,
    adapterVersion: connection.adapterVersion,
    traceId: context.traceId,
    causationId: commandInteractionId
  };
  const verification: IntegrationEventVerificationContext = {
    connection,
    eventId: context.eventId,
    sessionId: context.sessionId,
    receivedAt: context.receivedAt,
    evaluatedAt: context.evaluatedAt,
    maxClockSkewMs: context.maxClockSkewMs,
    sha256: context.sha256
  };
  return parseNormalizedIntegrationEvent(
    { ...input, checksum: computeIntegrationEventChecksum(input, context.sha256) },
    verification
  );
}

export function mapDiscordGatewayMessageToIntegrationEvent(
  value: unknown,
  context: DiscordEventMappingContext
): NormalizedIntegrationEventContract {
  const connection = parseIntegrationConnection(context.connection);
  const binding = parseDiscordConnectionBinding(context.binding, connection);
  const source = parseDiscordGatewayMessage(value, binding);
  return buildNormalizedDiscordEvent(source, "gateway", context, null);
}

export function mapDiscordManualCaptureToIntegrationEvent(
  value: unknown,
  context: DiscordManualCaptureMappingContext
): NormalizedIntegrationEventContract {
  if (context.authorizedAction !== "discord.command.gm") {
    return fail(
      "context.authorizedAction",
      "manual capture requires a trusted GM command decision"
    );
  }
  const connection = parseIntegrationConnection(context.connection);
  const binding = parseDiscordConnectionBinding(context.binding, connection);
  const command = parseDiscordInteractionCommand(value, binding);
  if (command.command !== "codex.message.capture" || !("targetMessage" in command.arguments)) {
    return fail("discordCommand.command", "expected the approved message-context capture command");
  }
  return buildNormalizedDiscordEvent(
    command.arguments.targetMessage,
    "messageContext",
    context,
    command.interactionId
  );
}

export function parseDiscordAuditFact(value: unknown): DiscordAuditFactContract {
  const path = "discordAudit";
  const record = expectRecord(value, path);
  expectExactKeys(
    record,
    [
      "schemaVersion",
      "auditId",
      "connectionId",
      "workspaceId",
      "campaignId",
      "guildId",
      "channelId",
      "action",
      "outcome",
      "credentialVersion",
      "traceId",
      "occurredAt"
    ],
    path
  );
  if (record["schemaVersion"] !== "hed70-discord-audit-v1") {
    fail(`${path}.schemaVersion`, "unsupported Discord audit schema");
  }
  return {
    schemaVersion: "hed70-discord-audit-v1",
    auditId: parseSafeId(record["auditId"], `${path}.auditId`),
    connectionId: parseIntegrationConnectionId(record["connectionId"], `${path}.connectionId`),
    workspaceId: parseWorkspaceId(record["workspaceId"], `${path}.workspaceId`),
    campaignId: parseCampaignId(record["campaignId"], `${path}.campaignId`),
    guildId: parseDiscordGuildId(record["guildId"], `${path}.guildId`),
    channelId:
      record["channelId"] === null
        ? null
        : parseDiscordChannelId(record["channelId"], `${path}.channelId`),
    action: expectEnum(record["action"], DISCORD_AUDIT_ACTIONS, `${path}.action`),
    outcome: expectEnum(record["outcome"], DISCORD_SAFE_OUTCOMES, `${path}.outcome`),
    credentialVersion: parseSafeId(record["credentialVersion"], `${path}.credentialVersion`),
    traceId: parseSafeId(record["traceId"], `${path}.traceId`),
    occurredAt: parseCanonicalInstant(record["occurredAt"], `${path}.occurredAt`)
  };
}
