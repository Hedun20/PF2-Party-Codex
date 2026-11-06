import {
  parseCampaignId,
  parseCharacterId,
  parseMembershipId,
  parseSessionId,
  parseWorkspaceId,
  type CampaignId,
  type CharacterId,
  type MembershipId,
  type SessionId,
  type WorkspaceId
} from "./ids.js";
import {
  expectEnum,
  expectExactKeys,
  expectInteger,
  expectRecord,
  expectString,
  fail
} from "./validation.js";

export const EVIDENCE_SEARCH_MODES = [
  "sourceList",
  "groundedAnswer",
  "authoringEvidenceBundle"
] as const;
export const EVIDENCE_SEARCH_SOURCE_KINDS = [
  "approvedCanon",
  "foundry",
  "discord",
  "manualNote",
  "transcriptSegment"
] as const;
export const EVIDENCE_SEARCH_STATUSES = ["ok", "notFound", "ambiguous"] as const;
export const EVIDENCE_SEARCH_VISIBILITIES = [
  "party",
  "specificPlayers",
  "restricted",
  "managerOnly",
  "participantScoped"
] as const;
export const EVIDENCE_SEARCH_RELEASE_STATES = ["public", "revealed", "hidden"] as const;
export const EVIDENCE_SEARCH_CONTENT_CLASSES = ["approvedCanon", "rawEvidence"] as const;
export const EVIDENCE_SEARCH_SOURCE_STATES = ["active", "ended"] as const;
export const EVIDENCE_SEARCH_APPROVAL_STATES = ["approvedCanon", "reviewableRaw"] as const;
export const EVIDENCE_SEARCH_AMBIGUITY_CODES = [
  "MULTIPLE_TOP_MATCHES",
  "QUERY_TOO_BROAD",
  "ENTITY_REFERENCE_AMBIGUOUS"
] as const;

export type EvidenceSearchMode = (typeof EVIDENCE_SEARCH_MODES)[number];
export type EvidenceSearchSourceKind = (typeof EVIDENCE_SEARCH_SOURCE_KINDS)[number];
export type EvidenceSearchStatus = (typeof EVIDENCE_SEARCH_STATUSES)[number];
export type EvidenceSearchVisibility = (typeof EVIDENCE_SEARCH_VISIBILITIES)[number];
export type EvidenceSearchReleaseState = (typeof EVIDENCE_SEARCH_RELEASE_STATES)[number];
export type EvidenceSearchContentClass = (typeof EVIDENCE_SEARCH_CONTENT_CLASSES)[number];
export type EvidenceSearchSourceState = (typeof EVIDENCE_SEARCH_SOURCE_STATES)[number];
export type EvidenceSearchApprovalState = (typeof EVIDENCE_SEARCH_APPROVAL_STATES)[number];
export type EvidenceSearchAmbiguityCode = (typeof EVIDENCE_SEARCH_AMBIGUITY_CODES)[number];

export interface EvidenceSearchFiltersContract {
  readonly sessionIds: readonly SessionId[];
  readonly sourceKinds: readonly EvidenceSearchSourceKind[];
  readonly entityIds: readonly string[];
  readonly occurredFrom: string | null;
  readonly occurredTo: string | null;
}

export interface EvidenceSearchContextBudgetContract {
  readonly maxItems: number;
  readonly maxUtf8Bytes: number;
}

export interface EvidenceSearchRequestContract {
  readonly schemaVersion: "hed28-evidence-search-request-v1";
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly requestingMembershipId: MembershipId;
  readonly requestingCharacterId: CharacterId | null;
  readonly query: string;
  readonly mode: EvidenceSearchMode;
  readonly filters: EvidenceSearchFiltersContract;
  readonly limit: number;
  readonly contextBudget: EvidenceSearchContextBudgetContract;
  readonly requestedAt: string;
}

export interface EvidenceSearchSpeakerContract {
  readonly sourceActorId: string | null;
  readonly displayName: string | null;
}

export interface EvidenceSearchReferenceContract {
  readonly providerObjectId: string | null;
  readonly providerEventId: string | null;
  readonly sourceDocumentId: string | null;
  readonly foundryRollId: string | null;
  readonly discordMessageId: string | null;
}

export interface EvidenceSearchItemContract {
  readonly resultId: string;
  readonly kind: EvidenceSearchSourceKind;
  readonly recordId: string;
  readonly sourceId: string;
  readonly sessionId: SessionId | null;
  readonly entityId: string | null;
  readonly occurredAt: string;
  readonly snippet: string;
  readonly speaker: EvidenceSearchSpeakerContract | null;
  readonly visibility: EvidenceSearchVisibility;
  readonly releaseState: EvidenceSearchReleaseState | null;
  readonly contentClass: EvidenceSearchContentClass;
  readonly sourceState: EvidenceSearchSourceState;
  readonly approvalState: EvidenceSearchApprovalState;
  readonly confidencePermille: number;
  readonly references: EvidenceSearchReferenceContract;
  readonly deepLink: string | null;
  readonly policyVersion: string;
  readonly contentDisposition: "dataOnlyUntrusted";
}

export interface EvidenceSearchBudgetUsageContract extends EvidenceSearchContextBudgetContract {
  readonly usedItems: number;
  readonly usedUtf8Bytes: number;
  readonly truncated: boolean;
}

export interface EvidenceBundleContract {
  readonly schemaVersion: "hed28-evidence-bundle-v1";
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly requestingMembershipId: MembershipId;
  readonly requestingCharacterId: CharacterId | null;
  readonly mode: EvidenceSearchMode;
  readonly status: EvidenceSearchStatus;
  readonly ambiguityCode: EvidenceSearchAmbiguityCode | null;
  readonly items: readonly EvidenceSearchItemContract[];
  readonly budget: EvidenceSearchBudgetUsageContract;
  readonly policyVersion: string;
  readonly generatedAt: string;
}

const CANONICAL_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;
const SAFE_POLICY_VERSION = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;
const MAX_QUERY_BYTES = 2_048;
const MAX_ENTITY_FILTERS = 32;
const MAX_SESSION_FILTERS = 16;
const MAX_SOURCE_FILTERS = EVIDENCE_SEARCH_SOURCE_KINDS.length;
const MAX_RESULT_ITEMS = 100;
const MIN_CONTEXT_BYTES = 1_024;
const MAX_CONTEXT_BYTES = 262_144;
const MAX_SNIPPET_BYTES = 8_192;
const MAX_DEEP_LINK_LENGTH = 1_024;

export function evidenceUtf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x7f) bytes += 1;
    else if (codePoint <= 0x7ff) bytes += 2;
    else if (codePoint <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

function parseCanonicalInstant(value: unknown, path: string): string {
  const instant = expectString(value, path);
  const parsed = Date.parse(instant);
  if (!CANONICAL_INSTANT.test(instant)
    || !Number.isFinite(parsed)
    || new Date(parsed).toISOString() !== instant) {
    return fail(path, "expected a canonical UTC instant");
  }
  return instant;
}

function parseNullableInstant(value: unknown, path: string): string | null {
  return value === null ? null : parseCanonicalInstant(value, path);
}

function parseStableId(value: unknown, path: string): string {
  const id = expectString(value, path);
  return STABLE_ID.test(id) ? id : fail(path, "expected a bounded stable identifier");
}

function parseNullableStableId(value: unknown, path: string): string | null {
  return value === null ? null : parseStableId(value, path);
}

function parsePolicyVersion(value: unknown, path: string): string {
  const version = expectString(value, path);
  return SAFE_POLICY_VERSION.test(version)
    ? version
    : fail(path, "expected a bounded policy version");
}

function parseIntegerRange(value: unknown, path: string, minimum: number, maximum: number): number {
  const parsed = expectInteger(value, path);
  if (parsed < minimum || parsed > maximum) {
    fail(path, `must be between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function parseUniqueStableIds(
  value: unknown,
  path: string,
  maximum: number
): readonly string[] {
  if (!Array.isArray(value) || value.length > maximum) {
    fail(path, `expected an array with at most ${maximum} items`);
  }
  const result = value.map((item, index) => parseStableId(item, `${path}[${index}]`));
  if (new Set(result).size !== result.length) fail(path, "duplicate values are not allowed");
  return result;
}

function parseSessionIds(value: unknown, path: string): readonly SessionId[] {
  if (!Array.isArray(value) || value.length > MAX_SESSION_FILTERS) {
    fail(path, `expected an array with at most ${MAX_SESSION_FILTERS} session ids`);
  }
  const result = value.map((item, index) => parseSessionId(item, `${path}[${index}]`));
  if (new Set(result).size !== result.length) fail(path, "duplicate session ids are not allowed");
  return result;
}

function parseSourceKinds(value: unknown, path: string): readonly EvidenceSearchSourceKind[] {
  if (!Array.isArray(value) || value.length > MAX_SOURCE_FILTERS) {
    fail(path, `expected an array with at most ${MAX_SOURCE_FILTERS} source kinds`);
  }
  const result = value.map((item, index) =>
    expectEnum(item, EVIDENCE_SEARCH_SOURCE_KINDS, `${path}[${index}]`)
  );
  if (new Set(result).size !== result.length) fail(path, "duplicate source kinds are not allowed");
  return result;
}

function parseFilters(value: unknown, path: string): EvidenceSearchFiltersContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "sessionIds",
    "sourceKinds",
    "entityIds",
    "occurredFrom",
    "occurredTo"
  ], path);
  const occurredFrom = parseNullableInstant(record["occurredFrom"], `${path}.occurredFrom`);
  const occurredTo = parseNullableInstant(record["occurredTo"], `${path}.occurredTo`);
  if (occurredFrom && occurredTo && Date.parse(occurredTo) < Date.parse(occurredFrom)) {
    fail(`${path}.occurredTo`, "cannot precede occurredFrom");
  }
  return {
    sessionIds: parseSessionIds(record["sessionIds"], `${path}.sessionIds`),
    sourceKinds: parseSourceKinds(record["sourceKinds"], `${path}.sourceKinds`),
    entityIds: parseUniqueStableIds(record["entityIds"], `${path}.entityIds`, MAX_ENTITY_FILTERS),
    occurredFrom,
    occurredTo
  };
}

function parseContextBudget(value: unknown, path: string): EvidenceSearchContextBudgetContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, ["maxItems", "maxUtf8Bytes"], path);
  return {
    maxItems: parseIntegerRange(record["maxItems"], `${path}.maxItems`, 1, MAX_RESULT_ITEMS),
    maxUtf8Bytes: parseIntegerRange(
      record["maxUtf8Bytes"],
      `${path}.maxUtf8Bytes`,
      MIN_CONTEXT_BYTES,
      MAX_CONTEXT_BYTES
    )
  };
}

export function parseEvidenceSearchRequestContract(
  value: unknown,
  path = "evidenceSearchRequest"
): EvidenceSearchRequestContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "workspaceId",
    "campaignId",
    "requestingMembershipId",
    "requestingCharacterId",
    "query",
    "mode",
    "filters",
    "limit",
    "contextBudget",
    "requestedAt"
  ], path);

  const query = expectString(record["query"], `${path}.query`).trim();
  if (evidenceUtf8ByteLength(query) > MAX_QUERY_BYTES) {
    fail(`${path}.query`, `must not exceed ${MAX_QUERY_BYTES} UTF-8 bytes`);
  }
  const limit = parseIntegerRange(record["limit"], `${path}.limit`, 1, MAX_RESULT_ITEMS);
  const contextBudget = parseContextBudget(record["contextBudget"], `${path}.contextBudget`);
  if (limit > contextBudget.maxItems) {
    fail(`${path}.limit`, "cannot exceed contextBudget.maxItems");
  }

  return {
    schemaVersion: expectEnum(
      record["schemaVersion"],
      ["hed28-evidence-search-request-v1"] as const,
      `${path}.schemaVersion`
    ),
    workspaceId: parseWorkspaceId(record["workspaceId"], `${path}.workspaceId`),
    campaignId: parseCampaignId(record["campaignId"], `${path}.campaignId`),
    requestingMembershipId: parseMembershipId(
      record["requestingMembershipId"],
      `${path}.requestingMembershipId`
    ),
    requestingCharacterId: record["requestingCharacterId"] === null
      ? null
      : parseCharacterId(record["requestingCharacterId"], `${path}.requestingCharacterId`),
    query,
    mode: expectEnum(record["mode"], EVIDENCE_SEARCH_MODES, `${path}.mode`),
    filters: parseFilters(record["filters"], `${path}.filters`),
    limit,
    contextBudget,
    requestedAt: parseCanonicalInstant(record["requestedAt"], `${path}.requestedAt`)
  };
}

function parseSpeaker(value: unknown, path: string): EvidenceSearchSpeakerContract | null {
  if (value === null) return null;
  const record = expectRecord(value, path);
  expectExactKeys(record, ["sourceActorId", "displayName"], path);
  const sourceActorId = parseNullableStableId(record["sourceActorId"], `${path}.sourceActorId`);
  const displayName = record["displayName"] === null
    ? null
    : expectString(record["displayName"], `${path}.displayName`);
  if (displayName !== null && evidenceUtf8ByteLength(displayName) > 512) {
    fail(`${path}.displayName`, "must not exceed 512 UTF-8 bytes");
  }
  if (sourceActorId === null && displayName === null) {
    fail(path, "speaker must carry a source actor id or display name");
  }
  return { sourceActorId, displayName };
}

function parseReferences(value: unknown, path: string): EvidenceSearchReferenceContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "providerObjectId",
    "providerEventId",
    "sourceDocumentId",
    "foundryRollId",
    "discordMessageId"
  ], path);
  return {
    providerObjectId: parseNullableStableId(record["providerObjectId"], `${path}.providerObjectId`),
    providerEventId: parseNullableStableId(record["providerEventId"], `${path}.providerEventId`),
    sourceDocumentId: parseNullableStableId(record["sourceDocumentId"], `${path}.sourceDocumentId`),
    foundryRollId: parseNullableStableId(record["foundryRollId"], `${path}.foundryRollId`),
    discordMessageId: parseNullableStableId(record["discordMessageId"], `${path}.discordMessageId`)
  };
}

function parseDeepLink(value: unknown, path: string): string | null {
  if (value === null) return null;
  const link = expectString(value, path);
  if (link.length > MAX_DEEP_LINK_LENGTH
    || !link.startsWith("/")
    || link.startsWith("//")
    || /[\u0000-\u001f\u007f\s]/.test(link)
    || /^[a-z][a-z0-9+.-]*:/i.test(link)) {
    fail(path, "expected a bounded internal application path");
  }
  return link;
}

function parseEvidenceItem(value: unknown, path: string): EvidenceSearchItemContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "resultId",
    "kind",
    "recordId",
    "sourceId",
    "sessionId",
    "entityId",
    "occurredAt",
    "snippet",
    "speaker",
    "visibility",
    "releaseState",
    "contentClass",
    "sourceState",
    "approvalState",
    "confidencePermille",
    "references",
    "deepLink",
    "policyVersion",
    "contentDisposition"
  ], path);

  const kind = expectEnum(record["kind"], EVIDENCE_SEARCH_SOURCE_KINDS, `${path}.kind`);
  const contentClass = expectEnum(
    record["contentClass"],
    EVIDENCE_SEARCH_CONTENT_CLASSES,
    `${path}.contentClass`
  );
  const approvalState = expectEnum(
    record["approvalState"],
    EVIDENCE_SEARCH_APPROVAL_STATES,
    `${path}.approvalState`
  );
  const releaseState = record["releaseState"] === null
    ? null
    : expectEnum(record["releaseState"], EVIDENCE_SEARCH_RELEASE_STATES, `${path}.releaseState`);
  const snippet = expectString(record["snippet"], `${path}.snippet`).trim();
  if (evidenceUtf8ByteLength(snippet) > MAX_SNIPPET_BYTES) {
    fail(`${path}.snippet`, `must not exceed ${MAX_SNIPPET_BYTES} UTF-8 bytes`);
  }

  if (kind === "approvedCanon") {
    if (contentClass !== "approvedCanon" || approvalState !== "approvedCanon" || releaseState === null) {
      fail(path, "approved canon results require approved canon class/state and release state");
    }
  } else if (contentClass !== "rawEvidence" || approvalState !== "reviewableRaw" || releaseState !== null) {
    fail(path, "raw evidence results require reviewable raw state and no canon release state");
  }

  return {
    resultId: parseStableId(record["resultId"], `${path}.resultId`),
    kind,
    recordId: parseStableId(record["recordId"], `${path}.recordId`),
    sourceId: parseStableId(record["sourceId"], `${path}.sourceId`),
    sessionId: record["sessionId"] === null
      ? null
      : parseSessionId(record["sessionId"], `${path}.sessionId`),
    entityId: parseNullableStableId(record["entityId"], `${path}.entityId`),
    occurredAt: parseCanonicalInstant(record["occurredAt"], `${path}.occurredAt`),
    snippet,
    speaker: parseSpeaker(record["speaker"], `${path}.speaker`),
    visibility: expectEnum(record["visibility"], EVIDENCE_SEARCH_VISIBILITIES, `${path}.visibility`),
    releaseState,
    contentClass,
    sourceState: expectEnum(record["sourceState"], EVIDENCE_SEARCH_SOURCE_STATES, `${path}.sourceState`),
    approvalState,
    confidencePermille: parseIntegerRange(
      record["confidencePermille"],
      `${path}.confidencePermille`,
      0,
      1000
    ),
    references: parseReferences(record["references"], `${path}.references`),
    deepLink: parseDeepLink(record["deepLink"], `${path}.deepLink`),
    policyVersion: parsePolicyVersion(record["policyVersion"], `${path}.policyVersion`),
    contentDisposition: expectEnum(
      record["contentDisposition"],
      ["dataOnlyUntrusted"] as const,
      `${path}.contentDisposition`
    )
  };
}

function parseBudgetUsage(
  value: unknown,
  path: string,
  items: readonly EvidenceSearchItemContract[]
): EvidenceSearchBudgetUsageContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "maxItems",
    "maxUtf8Bytes",
    "usedItems",
    "usedUtf8Bytes",
    "truncated"
  ], path);
  const maxItems = parseIntegerRange(record["maxItems"], `${path}.maxItems`, 1, MAX_RESULT_ITEMS);
  const maxUtf8Bytes = parseIntegerRange(
    record["maxUtf8Bytes"],
    `${path}.maxUtf8Bytes`,
    MIN_CONTEXT_BYTES,
    MAX_CONTEXT_BYTES
  );
  const usedItems = parseIntegerRange(record["usedItems"], `${path}.usedItems`, 0, maxItems);
  const usedUtf8Bytes = parseIntegerRange(record["usedUtf8Bytes"], `${path}.usedUtf8Bytes`, 0, maxUtf8Bytes);
  if (usedItems !== items.length) fail(`${path}.usedItems`, "must equal the number of returned items");
  const measuredBytes = items.reduce((sum, item) => sum + evidenceUtf8ByteLength(item.snippet), 0);
  if (usedUtf8Bytes !== measuredBytes) {
    fail(`${path}.usedUtf8Bytes`, "must equal the UTF-8 byte length of returned snippets");
  }
  return {
    maxItems,
    maxUtf8Bytes,
    usedItems,
    usedUtf8Bytes,
    truncated: record["truncated"] === true
      ? true
      : record["truncated"] === false
        ? false
        : fail(`${path}.truncated`, "expected a boolean")
  };
}

export function parseEvidenceBundleContract(
  value: unknown,
  path = "evidenceBundle"
): EvidenceBundleContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "workspaceId",
    "campaignId",
    "requestingMembershipId",
    "requestingCharacterId",
    "mode",
    "status",
    "ambiguityCode",
    "items",
    "budget",
    "policyVersion",
    "generatedAt"
  ], path);
  if (!Array.isArray(record["items"]) || record["items"].length > MAX_RESULT_ITEMS) {
    fail(`${path}.items`, `expected an array with at most ${MAX_RESULT_ITEMS} items`);
  }
  const items = record["items"].map((item, index) => parseEvidenceItem(item, `${path}.items[${index}]`));
  const resultIds = items.map((item) => item.resultId);
  if (new Set(resultIds).size !== resultIds.length) fail(`${path}.items`, "duplicate result ids are not allowed");
  const status = expectEnum(record["status"], EVIDENCE_SEARCH_STATUSES, `${path}.status`);
  const ambiguityCode = record["ambiguityCode"] === null
    ? null
    : expectEnum(record["ambiguityCode"], EVIDENCE_SEARCH_AMBIGUITY_CODES, `${path}.ambiguityCode`);
  if (status === "notFound" && items.length !== 0) fail(`${path}.items`, "notFound bundles must be empty");
  if (status === "ambiguous" && (items.length < 2 || ambiguityCode === null)) {
    fail(path, "ambiguous bundles require at least two items and an ambiguity code");
  }
  if (status !== "ambiguous" && ambiguityCode !== null) {
    fail(`${path}.ambiguityCode`, "only ambiguous bundles may carry an ambiguity code");
  }
  if (status === "ok" && items.length === 0) fail(`${path}.items`, "ok bundles require at least one item");

  const budget = parseBudgetUsage(record["budget"], `${path}.budget`, items);
  if (items.length > budget.maxItems) fail(`${path}.items`, "items exceed the declared budget");

  return {
    schemaVersion: expectEnum(
      record["schemaVersion"],
      ["hed28-evidence-bundle-v1"] as const,
      `${path}.schemaVersion`
    ),
    workspaceId: parseWorkspaceId(record["workspaceId"], `${path}.workspaceId`),
    campaignId: parseCampaignId(record["campaignId"], `${path}.campaignId`),
    requestingMembershipId: parseMembershipId(
      record["requestingMembershipId"],
      `${path}.requestingMembershipId`
    ),
    requestingCharacterId: record["requestingCharacterId"] === null
      ? null
      : parseCharacterId(record["requestingCharacterId"], `${path}.requestingCharacterId`),
    mode: expectEnum(record["mode"], EVIDENCE_SEARCH_MODES, `${path}.mode`),
    status,
    ambiguityCode,
    items,
    budget,
    policyVersion: parsePolicyVersion(record["policyVersion"], `${path}.policyVersion`),
    generatedAt: parseCanonicalInstant(record["generatedAt"], `${path}.generatedAt`)
  };
}
