import {
  parseCampaignId,
  parseEntryId,
  parseUserId,
  parseWorldId,
  type CampaignId,
  type EntryId,
  type UserId,
  type WorldId
} from "./ids.js";
import {
  expectEnum,
  expectExactKeys,
  expectJsonObject,
  expectRecord,
  expectString,
  expectStringArray,
  fail,
  hasOwn,
  rejectForbiddenKeysDeep,
  type JsonObject
} from "./validation.js";

export const LEGACY_ENTRY_VISIBILITIES: readonly ["public", "revealed", "gmOnly", "hidden", "needsReview"] = [
  "public",
  "revealed",
  "gmOnly",
  "hidden",
  "needsReview"
];
export const ENTRY_STATUSES: readonly ["active", "draft", "archived"] = ["active", "draft", "archived"];
export const EDITORIAL_STATES: readonly ["draft", "needsReview", "active", "archived"] = [
  "draft",
  "needsReview",
  "active",
  "archived"
];
export const AUDIENCES: readonly ["gmOnly", "party", "specificPlayers"] = ["gmOnly", "party", "specificPlayers"];
export const RELEASE_STATES: readonly ["hidden", "public", "revealed"] = ["hidden", "public", "revealed"];

export type LegacyEntryVisibility = (typeof LEGACY_ENTRY_VISIBILITIES)[number];
export type EntryStatus = (typeof ENTRY_STATUSES)[number];
export type EditorialState = (typeof EDITORIAL_STATES)[number];
export type Audience = (typeof AUDIENCES)[number];
export type ReleaseState = (typeof RELEASE_STATES)[number];

export interface NormalizedEntryVisibility {
  readonly editorialState: EditorialState;
  readonly audience: Audience;
  readonly releaseState: ReleaseState;
}

export const LEGACY_VISIBILITY_MAPPING: Readonly<Record<LegacyEntryVisibility, NormalizedEntryVisibility>> = {
  public: { editorialState: "active", audience: "party", releaseState: "public" },
  revealed: { editorialState: "active", audience: "party", releaseState: "revealed" },
  gmOnly: { editorialState: "active", audience: "gmOnly", releaseState: "hidden" },
  hidden: { editorialState: "active", audience: "gmOnly", releaseState: "hidden" },
  needsReview: { editorialState: "needsReview", audience: "gmOnly", releaseState: "hidden" }
};

export const PLAYER_FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
  "gmContent",
  "gmNotes",
  "gmSecrets",
  "privateNotes",
  "rawImport",
  "secret",
  "secrets",
  "source",
  "createdBy",
  "updatedBy"
]);

export const PLAYER_METADATA_KEYS: ReadonlySet<string> = new Set([
  "sourceCategory",
  "originalType",
  "related",
  "world",
  "country",
  "city",
  "parent",
  "mapImage",
  "avatarImage",
  "tokenImage",
  "handoutImage",
  "image",
  "pins",
  "mapObjects",
  "frontmatter"
]);

export const PLAYER_FRONTMATTER_KEYS: ReadonlySet<string> = new Set([
  "title",
  "name",
  "type",
  "category",
  "summary",
  "visibility",
  "tags",
  "aliases",
  "related",
  "world",
  "country",
  "city",
  "parent",
  "mapImage",
  "avatarImage",
  "tokenImage",
  "handoutImage",
  "image",
  "pins",
  "mapObjects"
]);

export interface GmArchiveEntryDto {
  readonly id: EntryId;
  readonly campaignId: CampaignId;
  readonly worldId: WorldId | "";
  readonly type: string;
  readonly category: string;
  readonly title: string;
  readonly slug: string;
  readonly path: string;
  readonly summary: string;
  readonly publicContent: string;
  readonly gmContent: string;
  readonly status: EntryStatus;
  readonly visibility: LegacyEntryVisibility;
  readonly tags: string[];
  readonly aliases: string[];
  readonly metadata: JsonObject;
  readonly source: JsonObject;
  readonly createdBy: UserId | "";
  readonly updatedBy: UserId | "";
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PlayerArchiveEntryDto {
  readonly id: EntryId;
  readonly campaignId: CampaignId;
  readonly worldId: WorldId | "";
  readonly type: string;
  readonly category: string;
  readonly title: string;
  readonly slug: string;
  readonly path: string;
  readonly summary: string;
  readonly publicContent: string;
  readonly status: "active";
  readonly visibility: "public" | "revealed";
  readonly tags: string[];
  readonly aliases: string[];
  readonly metadata: JsonObject;
  readonly createdAt: string;
  readonly updatedAt: string;
}

const GM_ENTRY_KEYS: readonly string[] = [
  "id",
  "campaignId",
  "worldId",
  "type",
  "category",
  "title",
  "slug",
  "path",
  "summary",
  "publicContent",
  "gmContent",
  "status",
  "visibility",
  "tags",
  "aliases",
  "metadata",
  "source",
  "createdBy",
  "updatedBy",
  "createdAt",
  "updatedAt"
];

const PLAYER_ENTRY_KEYS: readonly string[] = [
  "id",
  "campaignId",
  "worldId",
  "type",
  "category",
  "title",
  "slug",
  "path",
  "summary",
  "publicContent",
  "status",
  "visibility",
  "tags",
  "aliases",
  "metadata",
  "createdAt",
  "updatedAt"
];

function parseWorldIdOrEmpty(value: unknown, path: string): WorldId | "" {
  const parsed = expectString(value, path, true);
  return parsed === "" ? "" : parseWorldId(parsed, path);
}

function parseUserIdOrEmpty(value: unknown, path: string): UserId | "" {
  const parsed = expectString(value, path, true);
  return parsed === "" ? "" : parseUserId(parsed, path);
}

export function parseLegacyEntryVisibility(value: unknown, path = "visibility"): LegacyEntryVisibility {
  return expectEnum(value, LEGACY_ENTRY_VISIBILITIES, path);
}

export function normalizeLegacyEntryVisibility(
  value: unknown,
  path = "visibility"
): NormalizedEntryVisibility {
  const visibility = parseLegacyEntryVisibility(value, path);
  return LEGACY_VISIBILITY_MAPPING[visibility];
}

export function parseEntryStatus(value: unknown, path = "status"): EntryStatus {
  return expectEnum(value, ENTRY_STATUSES, path);
}

function rejectPrivatePlayerRecordsDeep(value: unknown, path: string): void {
  const seen = new WeakSet<object>();

  function visit(item: unknown, itemPath: string): void {
    if (typeof item !== "object" || item === null) return;
    if (seen.has(item)) return;
    seen.add(item);
    if (Array.isArray(item)) {
      item.forEach((child, index) => visit(child, `${itemPath}[${index}]`));
      return;
    }
    const record = item as Record<string, unknown>;
    if (record["type"] === "secret") fail(`${itemPath}.type`, "secret records are forbidden in a player DTO");
    if (hasOwn(record, "visibility")) {
      const visibility = parseLegacyEntryVisibility(record["visibility"], `${itemPath}.visibility`);
      if (visibility !== "public" && visibility !== "revealed") {
        fail(`${itemPath}.visibility`, "private records are forbidden in a player DTO");
      }
    }
    for (const [key, child] of Object.entries(record)) visit(child, `${itemPath}.${key}`);
  }

  visit(value, path);
}

export function parsePlayerArchiveMetadata(value: unknown, path = "metadata"): JsonObject {
  rejectForbiddenKeysDeep(value, PLAYER_FORBIDDEN_KEYS, path);
  rejectPrivatePlayerRecordsDeep(value, path);
  const item = expectRecord(value, path);
  expectExactKeys(item, [...PLAYER_METADATA_KEYS], path);
  if (hasOwn(item, "frontmatter")) {
    const frontmatter = expectRecord(item["frontmatter"], `${path}.frontmatter`);
    expectExactKeys(frontmatter, [...PLAYER_FRONTMATTER_KEYS], `${path}.frontmatter`);
  }
  return expectJsonObject(item, path);
}

export function parseGmArchiveEntryDto(value: unknown, path = "entry"): GmArchiveEntryDto {
  const item = expectRecord(value, path);
  expectExactKeys(item, GM_ENTRY_KEYS, path);
  return {
    id: parseEntryId(item["id"], `${path}.id`),
    campaignId: parseCampaignId(item["campaignId"], `${path}.campaignId`),
    worldId: parseWorldIdOrEmpty(item["worldId"], `${path}.worldId`),
    type: expectString(item["type"], `${path}.type`),
    category: expectString(item["category"], `${path}.category`),
    title: expectString(item["title"], `${path}.title`),
    slug: expectString(item["slug"], `${path}.slug`, true),
    path: expectString(item["path"], `${path}.path`, true),
    summary: expectString(item["summary"], `${path}.summary`, true),
    publicContent: expectString(item["publicContent"], `${path}.publicContent`, true),
    gmContent: expectString(item["gmContent"], `${path}.gmContent`, true),
    status: parseEntryStatus(item["status"], `${path}.status`),
    visibility: parseLegacyEntryVisibility(item["visibility"], `${path}.visibility`),
    tags: expectStringArray(item["tags"], `${path}.tags`),
    aliases: expectStringArray(item["aliases"], `${path}.aliases`),
    metadata: expectJsonObject(item["metadata"], `${path}.metadata`),
    source: expectJsonObject(item["source"], `${path}.source`),
    createdBy: parseUserIdOrEmpty(item["createdBy"], `${path}.createdBy`),
    updatedBy: parseUserIdOrEmpty(item["updatedBy"], `${path}.updatedBy`),
    createdAt: expectString(item["createdAt"], `${path}.createdAt`),
    updatedAt: expectString(item["updatedAt"], `${path}.updatedAt`)
  };
}

export function parsePlayerArchiveEntryDto(value: unknown, path = "entry"): PlayerArchiveEntryDto {
  rejectForbiddenKeysDeep(value, PLAYER_FORBIDDEN_KEYS, path);
  const item = expectRecord(value, path);
  expectExactKeys(item, PLAYER_ENTRY_KEYS, path);
  const status = parseEntryStatus(item["status"], `${path}.status`);
  if (status !== "active") fail(`${path}.status`, "player entries must be active");
  const visibility = parseLegacyEntryVisibility(item["visibility"], `${path}.visibility`);
  if (visibility !== "public" && visibility !== "revealed") {
    fail(`${path}.visibility`, "player entries must be public or revealed");
  }
  return {
    id: parseEntryId(item["id"], `${path}.id`),
    campaignId: parseCampaignId(item["campaignId"], `${path}.campaignId`),
    worldId: parseWorldIdOrEmpty(item["worldId"], `${path}.worldId`),
    type: expectString(item["type"], `${path}.type`),
    category: expectString(item["category"], `${path}.category`),
    title: expectString(item["title"], `${path}.title`),
    slug: expectString(item["slug"], `${path}.slug`, true),
    path: expectString(item["path"], `${path}.path`, true),
    summary: expectString(item["summary"], `${path}.summary`, true),
    publicContent: expectString(item["publicContent"], `${path}.publicContent`, true),
    status,
    visibility,
    tags: expectStringArray(item["tags"], `${path}.tags`),
    aliases: expectStringArray(item["aliases"], `${path}.aliases`),
    metadata: parsePlayerArchiveMetadata(item["metadata"], `${path}.metadata`),
    createdAt: expectString(item["createdAt"], `${path}.createdAt`),
    updatedAt: expectString(item["updatedAt"], `${path}.updatedAt`)
  };
}
