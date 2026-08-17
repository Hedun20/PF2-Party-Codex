import {
  PLAYER_FORBIDDEN_KEYS,
  PLAYER_FRONTMATTER_KEYS,
  PLAYER_METADATA_KEYS,
  normalizeLegacyEntryVisibility,
  parseEntryStatus,
  parseGmArchiveEntryDto,
  type EntryStatus,
  type JsonObject,
  type JsonValue,
  type NormalizedEntryVisibility,
  type PlayerArchiveEntryDto
} from "@pf2-party-codex/contracts";

export type ArchiveReadDenialReason = "invalid_status" | "non_active" | "invalid_visibility" | "not_released";

export interface ArchiveReadAllowed {
  readonly allowed: true;
  readonly normalized: NormalizedEntryVisibility;
}

export interface ArchiveReadDenied {
  readonly allowed: false;
  readonly reason: ArchiveReadDenialReason;
}

export type ArchiveReadDecision = ArchiveReadAllowed | ArchiveReadDenied;

export interface ArchiveReadCandidate {
  readonly status: unknown;
  readonly visibility: unknown;
}

const PLAYER_VISIBILITIES: ReadonlySet<string> = new Set(["public", "revealed"]);

export function evaluatePlayerArchiveRead(candidate: ArchiveReadCandidate): ArchiveReadDecision {
  let status: EntryStatus;
  try {
    status = parseEntryStatus(candidate.status);
  } catch {
    return { allowed: false, reason: "invalid_status" };
  }
  if (status !== "active") return { allowed: false, reason: "non_active" };

  let normalized: NormalizedEntryVisibility;
  try {
    normalized = normalizeLegacyEntryVisibility(candidate.visibility);
  } catch {
    return { allowed: false, reason: "invalid_visibility" };
  }
  if (normalized.audience !== "party" || normalized.releaseState === "hidden") {
    return { allowed: false, reason: "not_released" };
  }
  return { allowed: true, normalized };
}

function isPrivateRecord(value: Record<string, unknown>): boolean {
  const visibility = value["visibility"];
  if (visibility !== undefined && (typeof visibility !== "string" || !PLAYER_VISIBILITIES.has(visibility))) return true;
  return value["type"] === "secret";
}

function sanitizePlayerJsonValue(value: JsonValue): JsonValue | undefined {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    const items: JsonValue[] = [];
    for (const item of value) {
      const sanitized = sanitizePlayerJsonValue(item);
      if (sanitized !== undefined) items.push(sanitized);
    }
    return items;
  }

  const source = value as Record<string, JsonValue>;
  if (isPrivateRecord(source)) return undefined;
  const result: Record<string, JsonValue> = {};
  for (const [key, item] of Object.entries(source)) {
    if (PLAYER_FORBIDDEN_KEYS.has(key)) continue;
    const sanitized = sanitizePlayerJsonValue(item);
    if (sanitized !== undefined) result[key] = sanitized;
  }
  return result;
}

function sanitizePlayerMetadata(value: JsonObject): JsonObject {
  const result: Record<string, JsonValue> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!PLAYER_METADATA_KEYS.has(key)) continue;
    if (key === "frontmatter") {
      if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
      const frontmatter: Record<string, JsonValue> = {};
      for (const [frontmatterKey, frontmatterItem] of Object.entries(item)) {
        if (!PLAYER_FRONTMATTER_KEYS.has(frontmatterKey)) continue;
        if (
          frontmatterKey === "visibility" &&
          (typeof frontmatterItem !== "string" || !PLAYER_VISIBILITIES.has(frontmatterItem))
        ) {
          continue;
        }
        const sanitized = sanitizePlayerJsonValue(frontmatterItem);
        if (sanitized !== undefined) frontmatter[frontmatterKey] = sanitized;
      }
      result[key] = frontmatter;
      continue;
    }
    const sanitized = sanitizePlayerJsonValue(item);
    if (sanitized !== undefined) result[key] = sanitized;
  }
  const frontmatter = result["frontmatter"];
  if (typeof frontmatter === "object" && frontmatter !== null && !Array.isArray(frontmatter)) {
    if (result["pins"] === undefined && Array.isArray(frontmatter["pins"])) {
      result["pins"] = [...frontmatter["pins"]];
    }
    if (result["mapObjects"] === undefined && Array.isArray(frontmatter["mapObjects"])) {
      result["mapObjects"] = [...frontmatter["mapObjects"]];
    }
  }
  return result;
}

export function toPlayerArchiveEntryDto(value: unknown): PlayerArchiveEntryDto | null {
  const entry = parseGmArchiveEntryDto(value);
  const decision = evaluatePlayerArchiveRead({ status: entry.status, visibility: entry.visibility });
  if (!decision.allowed) return null;
  if (entry.visibility !== "public" && entry.visibility !== "revealed") return null;

  return {
    id: entry.id,
    campaignId: entry.campaignId,
    worldId: entry.worldId,
    type: entry.type,
    category: entry.category,
    title: entry.title,
    slug: entry.slug,
    path: entry.path,
    summary: entry.summary,
    publicContent: entry.publicContent,
    status: "active",
    visibility: entry.visibility,
    tags: [...entry.tags],
    aliases: [...entry.aliases],
    metadata: sanitizePlayerMetadata(entry.metadata),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  };
}
