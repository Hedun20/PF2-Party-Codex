import {
  parseDiscordAttachmentId,
  parseDiscordApplicationId,
  parseDiscordChannelId,
  parseDiscordConnectionBinding,
  parseDiscordGuildId,
  parseDiscordMessageId,
  parseDiscordUserId,
  type DiscordAttachmentId,
  type DiscordApplicationId,
  type DiscordChannelId,
  type DiscordConnectionBindingContract,
  type DiscordEventMappingContext,
  type DiscordGuildId,
  type DiscordMessageId,
  type DiscordUserId
} from "./discord.js";
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
  parseSessionId,
  parseWorkspaceId,
  type CampaignId,
  type IntegrationConnectionId,
  type SessionId,
  type WorkspaceId
} from "./ids.js";
import {
  expectEnum,
  expectExactKeys,
  expectInteger,
  expectRecord,
  expectString,
  fail,
  type JsonObject
} from "./validation.js";

export const DISCORD_CAPTURE_TARGET_KINDS = ["channel", "thread"] as const;
export const DISCORD_CAPTURE_STATES = ["active", "paused"] as const;
export const DISCORD_CAPTURE_VISIBILITIES = ["restricted", "managerOnly"] as const;
export const DISCORD_CAPTURE_DISPATCHES = [
  "MESSAGE_CREATE",
  "MESSAGE_UPDATE",
  "MESSAGE_DELETE"
] as const;
export const DISCORD_CAPTURE_MESSAGE_TYPES = ["default", "reply"] as const;
export const DISCORD_ATTACHMENT_DISPOSITIONS = ["storedMetadata", "ignoredUnsupported"] as const;
export const DISCORD_CAPTURE_ROUTE_OUTCOMES = ["eligible", "ignored"] as const;
export const DISCORD_REVISION_OUTCOMES = [
  "accepted",
  "idempotentReplay",
  "idempotencyConflict",
  "staleRevision"
] as const;
export const DISCORD_BACKFILL_STATES = ["pending", "running", "complete", "paused"] as const;
export const DISCORD_RATE_LIMIT_SCOPES = ["route", "shared", "global"] as const;

export type DiscordCaptureTargetKind = (typeof DISCORD_CAPTURE_TARGET_KINDS)[number];
export type DiscordCaptureState = (typeof DISCORD_CAPTURE_STATES)[number];
export type DiscordCaptureVisibility = (typeof DISCORD_CAPTURE_VISIBILITIES)[number];
export type DiscordCaptureDispatch = (typeof DISCORD_CAPTURE_DISPATCHES)[number];
export type DiscordCaptureMessageType = (typeof DISCORD_CAPTURE_MESSAGE_TYPES)[number];
export type DiscordAttachmentDisposition = (typeof DISCORD_ATTACHMENT_DISPOSITIONS)[number];
export type DiscordRevisionOutcome = (typeof DISCORD_REVISION_OUTCOMES)[number];
export type DiscordBackfillState = (typeof DISCORD_BACKFILL_STATES)[number];
export type DiscordRateLimitScope = (typeof DISCORD_RATE_LIMIT_SCOPES)[number];

export interface DiscordCaptureTargetContract {
  readonly kind: DiscordCaptureTargetKind;
  readonly channelId: DiscordChannelId;
  readonly parentChannelId: DiscordChannelId | null;
  readonly stream: string;
  readonly visibility: DiscordCaptureVisibility;
}

export interface DiscordCaptureScopeContract {
  readonly schemaVersion: "hed74-discord-capture-scope-v1";
  readonly connectionId: IntegrationConnectionId;
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly guildId: DiscordGuildId;
  readonly sessionId: SessionId;
  readonly state: DiscordCaptureState;
  readonly targets: readonly DiscordCaptureTargetContract[];
  readonly retentionPolicyVersion: string;
  readonly deletionPolicyVersion: string;
  readonly startsAt: string;
  readonly endsAt: string | null;
  readonly updatedAt: string;
}

export interface DiscordCaptureRoutingContract {
  readonly applicationId: DiscordApplicationId;
  readonly guildId: DiscordGuildId;
  readonly channelId: DiscordChannelId;
  readonly parentChannelId: DiscordChannelId | null;
}

export type DiscordCaptureRouteDecision =
  | {
      readonly outcome: "eligible";
      readonly target: DiscordCaptureTargetContract;
    }
  | {
      readonly outcome: "ignored";
      readonly safeCode:
        | "CAPTURE_INACTIVE"
        | "OUTSIDE_SESSION_WINDOW"
        | "APPLICATION_MISMATCH"
        | "GUILD_MISMATCH"
        | "TARGET_NOT_CONFIGURED";
    };

export interface DiscordAttachmentMetadataContract {
  readonly attachmentId: DiscordAttachmentId;
  readonly filename: string;
  readonly description: string | null;
  readonly mediaType: string | null;
  readonly sizeBytes: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly disposition: DiscordAttachmentDisposition;
}

export interface DiscordCaptureMessageContract {
  readonly schemaVersion: "hed74-discord-capture-message-v1";
  readonly gatewaySessionId: string;
  readonly gatewaySequence: string;
  readonly dispatch: DiscordCaptureDispatch;
  readonly sourceKind: "user" | "bot" | "webhook" | "system";
  readonly applicationId: DiscordApplicationId;
  readonly guildId: DiscordGuildId;
  readonly channelId: DiscordChannelId;
  readonly parentChannelId: DiscordChannelId | null;
  readonly messageId: DiscordMessageId;
  readonly messageType: DiscordCaptureMessageType | null;
  readonly authorId: DiscordUserId | null;
  readonly authorLinkRef: string | null;
  readonly authorLinkVersion: string | null;
  readonly content: string | null;
  readonly replyToMessageId: DiscordMessageId | null;
  readonly attachments: readonly DiscordAttachmentMetadataContract[];
  readonly messageCreatedAt: string | null;
  readonly messageEditedAt: string | null;
  readonly occurredAt: string;
}

export interface DiscordCaptureMappingContext extends DiscordEventMappingContext {
  readonly scope: unknown;
  readonly authorLinkRef: string | null;
  readonly authorLinkVersion: string | null;
}

export interface DiscordMessageRevisionContract {
  readonly schemaVersion: "hed74-discord-revision-v1";
  readonly connectionId: IntegrationConnectionId;
  readonly stream: string;
  readonly messageId: DiscordMessageId;
  readonly lastSourceEventVersion: string;
  readonly lastChecksum: string;
  readonly lastOccurredAt: string;
  readonly deletedAt: string | null;
  readonly version: number;
}

export interface DiscordRevisionDecision {
  readonly outcome: DiscordRevisionOutcome;
  readonly safeCode: string | null;
  readonly nextRevision: DiscordMessageRevisionContract | null;
}

export interface DiscordBackfillCursorContract {
  readonly schemaVersion: "hed74-discord-backfill-v1";
  readonly connectionId: IntegrationConnectionId;
  readonly targetChannelId: DiscordChannelId;
  readonly afterMessageId: DiscordMessageId | null;
  readonly state: DiscordBackfillState;
  readonly pagesCommitted: number;
  readonly version: number;
  readonly updatedAt: string;
}

export interface DiscordBackfillRequestContract {
  readonly channelId: DiscordChannelId;
  readonly afterMessageId: DiscordMessageId | null;
  readonly limit: 100;
  readonly orderAfterFetch: "oldestFirst";
}

export interface DiscordRateLimitContract {
  readonly schemaVersion: "hed74-discord-rate-limit-v1";
  readonly scope: DiscordRateLimitScope;
  readonly bucket: string | null;
  readonly retryAfterMs: number;
  readonly observedAt: string;
  readonly attempt: number;
}

const CANONICAL_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CANONICAL_SEQUENCE = /^(?:0|[1-9][0-9]{0,39})$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_FILENAME = /^[^\r\n\0/\\]{1,255}$/;
const SAFE_MEDIA_TYPE = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/;
const SUPPORTED_ATTACHMENT_MEDIA_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain"
]);
const MAX_TARGETS = 64;
const MAX_ATTACHMENTS = 10;
const MAX_CONTENT_BYTES = 16_384;
const MAX_SUPPORTED_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const MAX_RATE_LIMIT_DELAY_MS = 3_600_000;

function compareDiscordSnowflakes(left: string, right: string): number {
  if (left.length !== right.length) return left.length - right.length;
  return left < right ? -1 : left > right ? 1 : 0;
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
  if (!SAFE_ID.test(id)) return fail(path, "expected a bounded safe identifier");
  return id;
}

function parseNullableSafeId(value: unknown, path: string): string | null {
  return value === null ? null : parseSafeId(value, path);
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function parseTarget(value: unknown, path: string): DiscordCaptureTargetContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, ["kind", "channelId", "parentChannelId", "stream", "visibility"], path);
  const kind = expectEnum(record["kind"], DISCORD_CAPTURE_TARGET_KINDS, `${path}.kind`);
  const channelId = parseDiscordChannelId(record["channelId"], `${path}.channelId`);
  const parentChannelId =
    record["parentChannelId"] === null
      ? null
      : parseDiscordChannelId(record["parentChannelId"], `${path}.parentChannelId`);
  if ((kind === "channel") !== (parentChannelId === null)) {
    fail(`${path}.parentChannelId`, "threads require one parent; channels require null");
  }
  if (parentChannelId === channelId)
    fail(`${path}.parentChannelId`, "cannot equal the target channel");
  return {
    kind,
    channelId,
    parentChannelId,
    stream: parseSafeId(record["stream"], `${path}.stream`),
    visibility: expectEnum(record["visibility"], DISCORD_CAPTURE_VISIBILITIES, `${path}.visibility`)
  };
}

export function parseDiscordCaptureScope(
  value: unknown,
  trustedBinding: DiscordConnectionBindingContract,
  evaluatedAt: string
): DiscordCaptureScopeContract {
  const path = "discordCaptureScope";
  const record = expectRecord(value, path);
  expectExactKeys(
    record,
    [
      "schemaVersion",
      "connectionId",
      "workspaceId",
      "campaignId",
      "guildId",
      "sessionId",
      "state",
      "targets",
      "retentionPolicyVersion",
      "deletionPolicyVersion",
      "startsAt",
      "endsAt",
      "updatedAt"
    ],
    path
  );
  if (record["schemaVersion"] !== "hed74-discord-capture-scope-v1") {
    fail(`${path}.schemaVersion`, "unsupported capture scope schema");
  }
  const connectionId = parseIntegrationConnectionId(record["connectionId"], `${path}.connectionId`);
  const workspaceId = parseWorkspaceId(record["workspaceId"], `${path}.workspaceId`);
  const campaignId = parseCampaignId(record["campaignId"], `${path}.campaignId`);
  const guildId = parseDiscordGuildId(record["guildId"], `${path}.guildId`);
  if (
    connectionId !== trustedBinding.connectionId ||
    workspaceId !== trustedBinding.workspaceId ||
    campaignId !== trustedBinding.campaignId ||
    guildId !== trustedBinding.guildId
  ) {
    fail(path, "capture scope does not match the trusted Discord binding");
  }
  if (trustedBinding.mode !== "channelCapture")
    fail(path, "capture scope requires channel-capture mode");
  if (!Array.isArray(record["targets"]) || record["targets"].length === 0) {
    fail(`${path}.targets`, "expected a non-empty target array");
  }
  if (record["targets"].length > MAX_TARGETS)
    fail(`${path}.targets`, `must contain at most ${MAX_TARGETS} targets`);
  const targets = record["targets"].map((item, index) =>
    parseTarget(item, `${path}.targets[${index}]`)
  );
  for (let index = 0; index < targets.length; index += 1) {
    const current = targets[index];
    const previous = targets[index - 1];
    if (
      current &&
      previous &&
      compareDiscordSnowflakes(current.channelId, previous.channelId) <= 0
    ) {
      fail(`${path}.targets[${index}]`, "targets must be sorted and unique by channelId");
    }
    if (!current) continue;
    const bindingChannelId = current.parentChannelId ?? current.channelId;
    const bindingChannel = trustedBinding.channels.find(
      (candidate) => candidate.channelId === bindingChannelId
    );
    if (!bindingChannel || bindingChannel.stream !== current.stream) {
      fail(
        `${path}.targets[${index}]`,
        "target must inherit an explicitly configured channel stream"
      );
    }
  }
  const retentionPolicyVersion = parseSafeId(
    record["retentionPolicyVersion"],
    `${path}.retentionPolicyVersion`
  );
  const deletionPolicyVersion = parseSafeId(
    record["deletionPolicyVersion"],
    `${path}.deletionPolicyVersion`
  );
  if (
    retentionPolicyVersion !== trustedBinding.retentionPolicyVersion ||
    deletionPolicyVersion !== trustedBinding.deletionPolicyVersion
  ) {
    fail(path, "capture policies must match the trusted Discord binding");
  }
  const startsAt = parseCanonicalInstant(record["startsAt"], `${path}.startsAt`);
  const endsAt =
    record["endsAt"] === null ? null : parseCanonicalInstant(record["endsAt"], `${path}.endsAt`);
  if (endsAt !== null && Date.parse(endsAt) <= Date.parse(startsAt)) {
    fail(`${path}.endsAt`, "must be later than startsAt");
  }
  parseCanonicalInstant(evaluatedAt, "evaluatedAt");
  return {
    schemaVersion: "hed74-discord-capture-scope-v1",
    connectionId,
    workspaceId,
    campaignId,
    guildId,
    sessionId: parseSessionId(record["sessionId"], `${path}.sessionId`),
    state: expectEnum(record["state"], DISCORD_CAPTURE_STATES, `${path}.state`),
    targets,
    retentionPolicyVersion,
    deletionPolicyVersion,
    startsAt,
    endsAt,
    updatedAt: parseCanonicalInstant(record["updatedAt"], `${path}.updatedAt`)
  };
}

export function resolveDiscordCaptureTarget(
  value: unknown,
  scope: DiscordCaptureScopeContract,
  binding: DiscordConnectionBindingContract,
  evaluatedAt: string
): DiscordCaptureRouteDecision {
  const path = "discordCaptureRoute";
  const record = expectRecord(value, path);
  expectExactKeys(record, ["applicationId", "guildId", "channelId", "parentChannelId"], path);
  const applicationId = parseDiscordApplicationId(record["applicationId"], `${path}.applicationId`);
  const guildId = parseDiscordGuildId(record["guildId"], `${path}.guildId`);
  const channelId = parseDiscordChannelId(record["channelId"], `${path}.channelId`);
  const parentChannelId =
    record["parentChannelId"] === null
      ? null
      : parseDiscordChannelId(record["parentChannelId"], `${path}.parentChannelId`);
  const now = Date.parse(parseCanonicalInstant(evaluatedAt, "evaluatedAt"));
  if (scope.state !== "active") return { outcome: "ignored", safeCode: "CAPTURE_INACTIVE" };
  if (
    now < Date.parse(scope.startsAt) ||
    (scope.endsAt !== null && now >= Date.parse(scope.endsAt))
  ) {
    return { outcome: "ignored", safeCode: "OUTSIDE_SESSION_WINDOW" };
  }
  if (applicationId !== binding.applicationId) {
    return { outcome: "ignored", safeCode: "APPLICATION_MISMATCH" };
  }
  if (guildId !== binding.guildId || guildId !== scope.guildId) {
    return { outcome: "ignored", safeCode: "GUILD_MISMATCH" };
  }
  const target = scope.targets.find(
    (candidate) =>
      candidate.channelId === channelId && candidate.parentChannelId === parentChannelId
  );
  return target
    ? { outcome: "eligible", target }
    : { outcome: "ignored", safeCode: "TARGET_NOT_CONFIGURED" };
}

function parseAttachment(value: unknown, path: string): DiscordAttachmentMetadataContract {
  const record = expectRecord(value, path);
  expectExactKeys(
    record,
    [
      "attachmentId",
      "filename",
      "description",
      "mediaType",
      "sizeBytes",
      "width",
      "height",
      "disposition"
    ],
    path
  );
  const filename = expectString(record["filename"], `${path}.filename`);
  if (!SAFE_FILENAME.test(filename)) fail(`${path}.filename`, "expected a bounded basename");
  const description =
    record["description"] === null
      ? null
      : expectString(record["description"], `${path}.description`, true);
  if (description !== null && description.length > 1_024) {
    fail(`${path}.description`, "must be at most 1024 characters");
  }
  const mediaType =
    record["mediaType"] === null ? null : expectString(record["mediaType"], `${path}.mediaType`);
  if (mediaType !== null && !SAFE_MEDIA_TYPE.test(mediaType)) {
    fail(`${path}.mediaType`, "expected a canonical media type");
  }
  const sizeBytes = expectInteger(record["sizeBytes"], `${path}.sizeBytes`);
  if (sizeBytes < 0) fail(`${path}.sizeBytes`, "must not be negative");
  const width = record["width"] === null ? null : expectInteger(record["width"], `${path}.width`);
  const height =
    record["height"] === null ? null : expectInteger(record["height"], `${path}.height`);
  if (
    (width === null) !== (height === null) ||
    (width !== null && (width <= 0 || height === null || height <= 0))
  ) {
    fail(path, "attachment dimensions must be positive and appear together");
  }
  const disposition = expectEnum(
    record["disposition"],
    DISCORD_ATTACHMENT_DISPOSITIONS,
    `${path}.disposition`
  );
  const supported =
    mediaType !== null &&
    SUPPORTED_ATTACHMENT_MEDIA_TYPES.has(mediaType) &&
    sizeBytes <= MAX_SUPPORTED_ATTACHMENT_BYTES;
  if ((disposition === "storedMetadata") !== supported) {
    fail(`${path}.disposition`, "must match the reviewed media-type and size policy");
  }
  return {
    attachmentId: parseDiscordAttachmentId(record["attachmentId"], `${path}.attachmentId`),
    filename,
    description,
    mediaType,
    sizeBytes,
    width,
    height,
    disposition
  };
}

export function parseDiscordCaptureMessage(
  value: unknown,
  target: DiscordCaptureTargetContract,
  context: DiscordCaptureMappingContext
): DiscordCaptureMessageContract {
  const path = "discordCaptureMessage";
  const record = expectRecord(value, path);
  expectExactKeys(
    record,
    [
      "schemaVersion",
      "gatewaySessionId",
      "gatewaySequence",
      "dispatch",
      "sourceKind",
      "applicationId",
      "guildId",
      "channelId",
      "parentChannelId",
      "messageId",
      "messageType",
      "authorId",
      "authorLinkRef",
      "authorLinkVersion",
      "content",
      "replyToMessageId",
      "attachments",
      "messageCreatedAt",
      "messageEditedAt",
      "occurredAt"
    ],
    path
  );
  if (record["schemaVersion"] !== "hed74-discord-capture-message-v1") {
    fail(`${path}.schemaVersion`, "unsupported capture message schema");
  }
  const channelId = parseDiscordChannelId(record["channelId"], `${path}.channelId`);
  const parentChannelId =
    record["parentChannelId"] === null
      ? null
      : parseDiscordChannelId(record["parentChannelId"], `${path}.parentChannelId`);
  if (channelId !== target.channelId || parentChannelId !== target.parentChannelId) {
    fail(path, "message target does not match the eligible routing decision");
  }
  const authorLinkRef = parseNullableSafeId(record["authorLinkRef"], `${path}.authorLinkRef`);
  const authorLinkVersion = parseNullableSafeId(
    record["authorLinkVersion"],
    `${path}.authorLinkVersion`
  );
  if (
    authorLinkRef !== context.authorLinkRef ||
    authorLinkVersion !== context.authorLinkVersion ||
    (authorLinkRef === null) !== (authorLinkVersion === null)
  ) {
    fail(path, "author link must match trusted platform resolution");
  }
  const sequence = expectString(record["gatewaySequence"], `${path}.gatewaySequence`);
  if (!CANONICAL_SEQUENCE.test(sequence))
    fail(`${path}.gatewaySequence`, "expected canonical decimal sequence");
  const dispatch = expectEnum(record["dispatch"], DISCORD_CAPTURE_DISPATCHES, `${path}.dispatch`);
  const sourceKind = expectEnum(
    record["sourceKind"],
    ["user", "bot", "webhook", "system"] as const,
    `${path}.sourceKind`
  );
  if (
    ((dispatch === "MESSAGE_CREATE" || dispatch === "MESSAGE_UPDATE") && sourceKind !== "user") ||
    (dispatch === "MESSAGE_DELETE" && sourceKind !== "system")
  ) {
    fail(`${path}.sourceKind`, "only human create/update and system delete are supported");
  }
  const authorId =
    record["authorId"] === null ? null : parseDiscordUserId(record["authorId"], `${path}.authorId`);
  const content =
    record["content"] === null ? null : expectString(record["content"], `${path}.content`);
  if (content !== null && utf8ByteLength(content) > MAX_CONTENT_BYTES) {
    fail(`${path}.content`, `exceeds ${MAX_CONTENT_BYTES} UTF-8 bytes`);
  }
  if (!Array.isArray(record["attachments"]) || record["attachments"].length > MAX_ATTACHMENTS) {
    fail(`${path}.attachments`, `expected at most ${MAX_ATTACHMENTS} attachments`);
  }
  const attachments = record["attachments"].map((item, index) =>
    parseAttachment(item, `${path}.attachments[${index}]`)
  );
  for (let index = 1; index < attachments.length; index += 1) {
    const current = attachments[index];
    const previous = attachments[index - 1];
    if (
      current &&
      previous &&
      compareDiscordSnowflakes(current.attachmentId, previous.attachmentId) <= 0
    ) {
      fail(`${path}.attachments[${index}]`, "attachments must be sorted and unique");
    }
  }
  const messageType =
    record["messageType"] === null
      ? null
      : expectEnum(record["messageType"], DISCORD_CAPTURE_MESSAGE_TYPES, `${path}.messageType`);
  const replyToMessageId =
    record["replyToMessageId"] === null
      ? null
      : parseDiscordMessageId(record["replyToMessageId"], `${path}.replyToMessageId`);
  if ((messageType === "reply") !== (replyToMessageId !== null)) {
    fail(`${path}.replyToMessageId`, "must appear exactly for reply messages");
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
      authorId === null ||
      content === null ||
      messageType === null ||
      createdAt === null ||
      editedAt !== null
    ) {
      fail(path, "MESSAGE_CREATE requires a complete supported human message");
    }
    if (occurredAt !== createdAt) fail(`${path}.occurredAt`, "must equal messageCreatedAt");
  } else if (dispatch === "MESSAGE_UPDATE") {
    if (
      authorId === null ||
      content === null ||
      messageType === null ||
      createdAt === null ||
      editedAt === null
    ) {
      fail(path, "MESSAGE_UPDATE requires a complete merged message snapshot");
    }
    if (Date.parse(editedAt) < Date.parse(createdAt) || occurredAt !== editedAt) {
      fail(`${path}.messageEditedAt`, "must be coherent with occurrence time");
    }
  } else if (
    authorId !== null ||
    authorLinkRef !== null ||
    content !== null ||
    messageType !== null ||
    replyToMessageId !== null ||
    attachments.length !== 0 ||
    createdAt !== null ||
    editedAt !== null
  ) {
    fail(path, "MESSAGE_DELETE must contain routing and message identifiers only");
  }
  return {
    schemaVersion: "hed74-discord-capture-message-v1",
    gatewaySessionId: parseSafeId(record["gatewaySessionId"], `${path}.gatewaySessionId`),
    gatewaySequence: sequence,
    dispatch,
    sourceKind,
    applicationId: parseDiscordApplicationId(record["applicationId"], `${path}.applicationId`),
    guildId: parseDiscordGuildId(record["guildId"], `${path}.guildId`),
    channelId,
    parentChannelId,
    messageId: parseDiscordMessageId(record["messageId"], `${path}.messageId`),
    messageType,
    authorId,
    authorLinkRef,
    authorLinkVersion,
    content,
    replyToMessageId,
    attachments,
    messageCreatedAt: createdAt,
    messageEditedAt: editedAt,
    occurredAt
  };
}

export function mapDiscordCaptureMessageToIntegrationEvent(
  value: unknown,
  context: DiscordCaptureMappingContext
): NormalizedIntegrationEventContract {
  const connection = parseIntegrationConnection(context.connection);
  const binding = parseDiscordConnectionBinding(context.binding, connection);
  const scope = parseDiscordCaptureScope(context.scope, binding, context.evaluatedAt);
  if (scope.sessionId !== context.sessionId)
    fail("context.sessionId", "must match the active capture scope");
  const routeRecord = expectRecord(value, "discordCaptureMessage");
  const route = resolveDiscordCaptureTarget(
    {
      applicationId: routeRecord["applicationId"],
      guildId: routeRecord["guildId"],
      channelId: routeRecord["channelId"],
      parentChannelId: routeRecord["parentChannelId"]
    },
    scope,
    binding,
    context.evaluatedAt
  );
  if (route.outcome !== "eligible") fail("discordCaptureMessage", route.safeCode);
  const message = parseDiscordCaptureMessage(value, route.target, context);
  if (message.applicationId !== binding.applicationId || message.guildId !== binding.guildId) {
    fail("discordCaptureMessage", "application or guild binding mismatch");
  }
  const integrationSequence = expectString(
    context.integrationSequence,
    "context.integrationSequence"
  );
  if (!CANONICAL_SEQUENCE.test(integrationSequence)) {
    fail("context.integrationSequence", "expected canonical integration sequence");
  }
  const type =
    message.dispatch === "MESSAGE_CREATE"
      ? "chat.message.created"
      : message.dispatch === "MESSAGE_UPDATE"
        ? "chat.message.updated"
        : "chat.message.deleted";
  const sourceEventVersion =
    message.dispatch === "MESSAGE_CREATE"
      ? `created:${message.messageCreatedAt}`
      : message.dispatch === "MESSAGE_UPDATE"
        ? `edit:${message.messageEditedAt}`
        : `delete:${message.gatewaySessionId}:${message.gatewaySequence}`;
  const payload: JsonObject = {
    source: "discordChannelCapture",
    guildId: message.guildId,
    channelId: message.channelId,
    parentChannelId: message.parentChannelId,
    messageId: message.messageId,
    messageType: message.messageType,
    authorId: message.authorId,
    authorLinkRef: message.authorLinkRef,
    authorLinkVersion: message.authorLinkVersion,
    content: message.content,
    replyToMessageId: message.replyToMessageId,
    attachments: message.attachments
      .filter((attachment) => attachment.disposition === "storedMetadata")
      .map((attachment) => ({ ...attachment })),
    messageCreatedAt: message.messageCreatedAt,
    messageEditedAt: message.messageEditedAt,
    gatewaySessionId: message.gatewaySessionId,
    gatewaySequence: message.gatewaySequence,
    dispatch: message.dispatch,
    sourceKind: message.sourceKind
  };
  const input: NormalizedIntegrationEventHashInputContract = {
    schemaVersion: "hed56-event-v1",
    eventId: context.eventId,
    provider: "discord",
    connectionId: connection.connectionId,
    workspaceId: connection.workspaceId,
    campaignId: connection.campaignId,
    worldId: connection.worldId,
    sessionId: scope.sessionId,
    stream: route.target.stream,
    sourceDocumentId: message.messageId,
    sourceEventId: message.messageId,
    sourceEventVersion,
    sequence: integrationSequence,
    occurredAt: message.occurredAt,
    receivedAt: context.receivedAt,
    actor: {
      kind: message.authorId === null ? "system" : "user",
      sourceActorId: message.authorId,
      displayName: null
    },
    speaker: null,
    type,
    visibility: { classification: route.target.visibility, sourceActorIds: [] },
    payload,
    adapterVersion: connection.adapterVersion,
    traceId: context.traceId,
    causationId: null
  };
  const verification: IntegrationEventVerificationContext = {
    connection,
    eventId: context.eventId,
    sessionId: scope.sessionId,
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

export function parseDiscordMessageRevision(value: unknown): DiscordMessageRevisionContract {
  const path = "discordRevision";
  const record = expectRecord(value, path);
  expectExactKeys(
    record,
    [
      "schemaVersion",
      "connectionId",
      "stream",
      "messageId",
      "lastSourceEventVersion",
      "lastChecksum",
      "lastOccurredAt",
      "deletedAt",
      "version"
    ],
    path
  );
  if (record["schemaVersion"] !== "hed74-discord-revision-v1") {
    fail(`${path}.schemaVersion`, "unsupported revision schema");
  }
  const checksum = expectString(record["lastChecksum"], `${path}.lastChecksum`);
  if (!SHA256.test(checksum)) fail(`${path}.lastChecksum`, "expected lowercase SHA-256");
  const version = expectInteger(record["version"], `${path}.version`);
  if (version < 1) fail(`${path}.version`, "must be positive");
  const lastOccurredAt = parseCanonicalInstant(record["lastOccurredAt"], `${path}.lastOccurredAt`);
  const deletedAt =
    record["deletedAt"] === null
      ? null
      : parseCanonicalInstant(record["deletedAt"], `${path}.deletedAt`);
  if (deletedAt !== null && deletedAt !== lastOccurredAt) {
    fail(`${path}.deletedAt`, "must equal the last deletion occurrence time");
  }
  return {
    schemaVersion: "hed74-discord-revision-v1",
    connectionId: parseIntegrationConnectionId(record["connectionId"], `${path}.connectionId`),
    stream: parseSafeId(record["stream"], `${path}.stream`),
    messageId: parseDiscordMessageId(record["messageId"], `${path}.messageId`),
    lastSourceEventVersion: parseSafeId(
      record["lastSourceEventVersion"],
      `${path}.lastSourceEventVersion`
    ),
    lastChecksum: checksum,
    lastOccurredAt,
    deletedAt,
    version
  };
}

export function reconcileDiscordMessageRevision(
  priorValue: unknown | null,
  event: NormalizedIntegrationEventContract
): DiscordRevisionDecision {
  if (event.provider !== "discord" || event.sourceDocumentId === null) {
    return fail("event", "expected a Discord message occurrence");
  }
  const messageId = parseDiscordMessageId(event.sourceDocumentId, "event.sourceDocumentId");
  const prior = priorValue === null ? null : parseDiscordMessageRevision(priorValue);
  if (
    prior !== null &&
    (prior.connectionId !== event.connectionId ||
      prior.stream !== event.stream ||
      prior.messageId !== messageId)
  ) {
    return fail("discordRevision", "revision scope does not match the event");
  }
  if (prior !== null && prior.lastSourceEventVersion === event.sourceEventVersion) {
    return prior.lastChecksum === event.checksum
      ? { outcome: "idempotentReplay", safeCode: null, nextRevision: null }
      : {
          outcome: "idempotencyConflict",
          safeCode: "DISCORD_REVISION_CHECKSUM_CONFLICT",
          nextRevision: null
        };
  }
  if (
    prior !== null &&
    (prior.deletedAt !== null || Date.parse(event.occurredAt) <= Date.parse(prior.lastOccurredAt))
  ) {
    return {
      outcome: "staleRevision",
      safeCode: "DISCORD_REVISION_STALE",
      nextRevision: null
    };
  }
  const deletedAt = event.type === "chat.message.deleted" ? event.occurredAt : null;
  return {
    outcome: "accepted",
    safeCode: null,
    nextRevision: {
      schemaVersion: "hed74-discord-revision-v1",
      connectionId: event.connectionId,
      stream: event.stream,
      messageId,
      lastSourceEventVersion: event.sourceEventVersion,
      lastChecksum: event.checksum,
      lastOccurredAt: event.occurredAt,
      deletedAt,
      version: (prior?.version ?? 0) + 1
    }
  };
}

export function parseDiscordBackfillCursor(value: unknown): DiscordBackfillCursorContract {
  const path = "discordBackfill";
  const record = expectRecord(value, path);
  expectExactKeys(
    record,
    [
      "schemaVersion",
      "connectionId",
      "targetChannelId",
      "afterMessageId",
      "state",
      "pagesCommitted",
      "version",
      "updatedAt"
    ],
    path
  );
  if (record["schemaVersion"] !== "hed74-discord-backfill-v1") {
    fail(`${path}.schemaVersion`, "unsupported backfill schema");
  }
  const pagesCommitted = expectInteger(record["pagesCommitted"], `${path}.pagesCommitted`);
  const version = expectInteger(record["version"], `${path}.version`);
  if (pagesCommitted < 0 || version < 0) fail(path, "cursor counters must not be negative");
  return {
    schemaVersion: "hed74-discord-backfill-v1",
    connectionId: parseIntegrationConnectionId(record["connectionId"], `${path}.connectionId`),
    targetChannelId: parseDiscordChannelId(record["targetChannelId"], `${path}.targetChannelId`),
    afterMessageId:
      record["afterMessageId"] === null
        ? null
        : parseDiscordMessageId(record["afterMessageId"], `${path}.afterMessageId`),
    state: expectEnum(record["state"], DISCORD_BACKFILL_STATES, `${path}.state`),
    pagesCommitted,
    version,
    updatedAt: parseCanonicalInstant(record["updatedAt"], `${path}.updatedAt`)
  };
}

export function planDiscordBackfillPage(
  cursorValue: unknown,
  scope: DiscordCaptureScopeContract
): DiscordBackfillRequestContract {
  const cursor = parseDiscordBackfillCursor(cursorValue);
  if (cursor.connectionId !== scope.connectionId) {
    fail("discordBackfill.connectionId", "cursor does not match the capture scope");
  }
  const target = scope.targets.find((candidate) => candidate.channelId === cursor.targetChannelId);
  if (!target) fail("discordBackfill.targetChannelId", "target is not configured");
  if (scope.state !== "active" || (cursor.state !== "pending" && cursor.state !== "running")) {
    fail("discordBackfill.state", "backfill is not runnable");
  }
  return {
    channelId: cursor.targetChannelId,
    afterMessageId: cursor.afterMessageId,
    limit: 100,
    orderAfterFetch: "oldestFirst"
  };
}

export function advanceDiscordBackfillCursor(
  cursorValue: unknown,
  committedMessageIds: readonly unknown[],
  pageWasFull: boolean,
  updatedAt: string
): DiscordBackfillCursorContract {
  const cursor = parseDiscordBackfillCursor(cursorValue);
  if (committedMessageIds.length > 100)
    fail("committedMessageIds", "page exceeds Discord limit 100");
  const ids = committedMessageIds.map((value, index) =>
    parseDiscordMessageId(value, `committedMessageIds[${index}]`)
  );
  if (
    cursor.afterMessageId !== null &&
    ids[0] !== undefined &&
    compareDiscordSnowflakes(ids[0], cursor.afterMessageId) <= 0
  ) {
    fail("committedMessageIds[0]", "must be newer than the committed after cursor");
  }
  for (let index = 1; index < ids.length; index += 1) {
    const current = ids[index];
    const previous = ids[index - 1];
    if (current && previous && compareDiscordSnowflakes(current, previous) <= 0) {
      fail(`committedMessageIds[${index}]`, "messages must be committed oldest-first and unique");
    }
  }
  if (pageWasFull !== (ids.length === 100)) {
    fail("pageWasFull", "must reflect the exact committed page length");
  }
  const afterMessageId = ids.at(-1) ?? cursor.afterMessageId;
  return {
    ...cursor,
    afterMessageId,
    state: pageWasFull ? "running" : "complete",
    pagesCommitted: cursor.pagesCommitted + 1,
    version: cursor.version + 1,
    updatedAt: parseCanonicalInstant(updatedAt, "updatedAt")
  };
}

export function parseDiscordRateLimit(value: unknown): DiscordRateLimitContract {
  const path = "discordRateLimit";
  const record = expectRecord(value, path);
  expectExactKeys(
    record,
    ["schemaVersion", "scope", "bucket", "retryAfterMs", "observedAt", "attempt"],
    path
  );
  if (record["schemaVersion"] !== "hed74-discord-rate-limit-v1") {
    fail(`${path}.schemaVersion`, "unsupported rate-limit schema");
  }
  const retryAfterMs = expectInteger(record["retryAfterMs"], `${path}.retryAfterMs`);
  const attempt = expectInteger(record["attempt"], `${path}.attempt`);
  if (retryAfterMs < 0 || retryAfterMs > MAX_RATE_LIMIT_DELAY_MS) {
    fail(`${path}.retryAfterMs`, `must be between 0 and ${MAX_RATE_LIMIT_DELAY_MS}`);
  }
  if (attempt < 1 || attempt > 10) fail(`${path}.attempt`, "must be between 1 and 10");
  return {
    schemaVersion: "hed74-discord-rate-limit-v1",
    scope: expectEnum(record["scope"], DISCORD_RATE_LIMIT_SCOPES, `${path}.scope`),
    bucket: parseNullableSafeId(record["bucket"], `${path}.bucket`),
    retryAfterMs,
    observedAt: parseCanonicalInstant(record["observedAt"], `${path}.observedAt`),
    attempt
  };
}
