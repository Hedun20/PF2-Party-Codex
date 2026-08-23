import { parseCampaignId, parseWorkspaceId, type CampaignId, type WorkspaceId } from "./ids.js";
import {
  expectBoolean,
  expectEnum,
  expectExactKeys,
  expectInteger,
  expectNullableString,
  expectRecord,
  expectString,
  fail
} from "./validation.js";

export const MIGRATION_COMMANDS = ["inventory", "dryRun", "commit", "verify", "rollback"] as const;
export const MIGRATION_REPORT_STATUSES = ["planned", "running", "succeeded", "failed", "rolledBack"] as const;
export const MIGRATION_INVARIANT_STATUSES = ["pass", "warning", "fail"] as const;
export const REQUIRED_RESTORE_INVARIANT_CODES = [
  "BACKUP_ARTIFACT_CHECKSUM_VERIFIED",
  "BACKUP_ENCRYPTION_VERIFIED",
  "SNAPSHOT_CONSISTENCY_VERIFIED",
  "RESTORE_TARGET_ISOLATED",
  "PRODUCTION_ROUTING_BLOCKED",
  "RESTORED_COUNTS_MATCH",
  "RESTORED_INDEXES_MATCH"
] as const;
export const MIGRATION_COLLECTIONS = [
  "users",
  "profiles",
  "workspaces",
  "campaigns",
  "memberships",
  "entries",
  "entryRelations",
  "notes",
  "characters",
  "maps",
  "mapObjects",
  "timelineEvents",
  "sessions",
  "handouts",
  "assets",
  "invitations",
  "emailOutbox",
  "passwordResetTokens",
  "auditLogs",
  "importJobs",
  "webSessions",
  "externalIdentities",
  "connectorPairings",
  "connectorCredentials",
  "serviceCredentials",
  "migrationRuns",
  "migrationItems",
  "migrationReports",
  "evidenceRecords",
  "entryRevisions",
  "integrationConnections",
  "ingestionCursors",
  "ingestionReceipts",
  "characterKnowledgeGrants",
  "achievementDefinitions",
  "achievementAwards"
] as const;

export type MigrationCommand = (typeof MIGRATION_COMMANDS)[number];
export type MigrationReportStatus = (typeof MIGRATION_REPORT_STATUSES)[number];
export type MigrationInvariantStatus = (typeof MIGRATION_INVARIANT_STATUSES)[number];
export type MigrationCollectionName = (typeof MIGRATION_COLLECTIONS)[number];

export interface MigrationScopeContract {
  readonly workspaceIds: readonly WorkspaceId[];
  readonly campaignIds: readonly CampaignId[];
  readonly collections: readonly MigrationCollectionName[];
}

export interface MigrationBatchPlanContract {
  readonly sequence: number;
  readonly batchId: string;
  readonly sourceCollection: MigrationCollectionName;
  readonly sourceStartId: string | null;
  readonly sourceEndId: string | null;
  readonly expectedCount: number;
  readonly sourceRangeHash: string;
}

export interface MigrationManifestContract {
  readonly schemaVersion: "hed19-manifest-v1";
  readonly migrationId: string;
  readonly migrationVersion: number;
  readonly codeCommit: string;
  readonly sourceSnapshotId: string;
  readonly sourceDatabaseFingerprint: string;
  readonly targetDatabaseFingerprint: string;
  readonly scope: MigrationScopeContract;
  readonly collectionMappingVersion: string;
  readonly normalizationVersion: string;
  readonly policyVersion: string;
  readonly batches: readonly MigrationBatchPlanContract[];
  readonly requiredIndexes: readonly string[];
  readonly fatalIssueCodes: readonly string[];
  readonly warningIssueCodes: readonly string[];
}

export interface MigrationRestoreDrillContract {
  readonly schemaVersion: "hed19-restore-drill-v1";
  readonly restoreRef: string;
  readonly migrationId: string;
  readonly migrationVersion: number;
  readonly sourceSnapshotId: string;
  readonly sourceDatabaseFingerprint: string;
  readonly manifestHash: string;
  readonly backupArtifactHash: string;
  readonly sourceMongoVersion: string;
  readonly databaseToolVersion: string;
  readonly backupEncrypted: true;
  readonly encryptionKeyVersion: string;
  readonly consistencyBoundaryKind: "oplog" | "coordinatedSnapshot" | "pointInTime";
  readonly consistencyBoundaryRef: string;
  readonly restoredDatabaseFingerprint: string;
  readonly restoreEnvironment: "isolated";
  readonly productionRoutingDisabled: true;
  readonly operatorId: string;
  readonly status: "succeeded";
  readonly startedAt: string;
  readonly completedAt: string;
  readonly restorationDurationMs: number;
  readonly restoreTargetExpiresAt: string;
  readonly validUntil: string;
  readonly collectionCount: number;
  readonly indexCount: number;
  readonly invariants: readonly MigrationInvariantContract[];
  readonly fatalIssueCount: 0;
}

export interface MigrationVerificationContext {
  readonly manifest: unknown;
  readonly restoreDrill: unknown;
  readonly evaluatedAt: string;
  readonly sha256: (canonicalUtf8: string) => string;
}

export interface MigrationReportVerificationContext {
  readonly manifest: unknown;
  readonly restoreDrill: unknown | null;
  readonly evaluatedAt: string;
  readonly sha256: (canonicalUtf8: string) => string;
}

export interface VerifiedMigrationCommandContract {
  readonly request: MigrationCommandRequestContract;
  readonly manifest: MigrationManifestContract;
  readonly manifestHash: string;
  readonly restoreDrill: MigrationRestoreDrillContract;
  readonly evaluatedAt: string;
}

export interface MigrationCommandRequestContract {
  readonly schemaVersion: "hed19-command-v1";
  readonly migrationId: string;
  readonly migrationVersion: number;
  readonly runId: string;
  readonly command: MigrationCommand;
  readonly sourceSnapshotId: string;
  readonly sourceDatabaseFingerprint: string;
  readonly targetDatabaseFingerprint: string;
  readonly manifestHash: string | null;
  readonly scope: MigrationScopeContract;
  readonly backupRestoreRef: string | null;
  readonly confirmation: string | null;
  readonly requestedAt: string;
}

export interface MigrationCollectionCountContract {
  readonly collection: MigrationCollectionName;
  readonly scanned: number;
  readonly planned: number;
  readonly written: number;
  readonly skipped: number;
  readonly quarantined: number;
  readonly failed: number;
}

export interface MigrationInvariantContract {
  readonly code: string;
  readonly status: MigrationInvariantStatus;
  readonly expectedCount: number | null;
  readonly actualCount: number | null;
}

export interface MigrationCheckpointContract {
  readonly batchId: string | null;
  readonly processed: number;
  readonly total: number;
}

export interface MigrationRollbackContract {
  readonly routingProfile: "legacy";
  readonly writerProfile: "legacy";
  readonly dataDeleted: false;
}

export interface MigrationReportContract {
  readonly schemaVersion: "hed19-report-v1";
  readonly migrationId: string;
  readonly migrationVersion: number;
  readonly runId: string;
  readonly command: MigrationCommand;
  readonly sourceSnapshotId: string;
  readonly manifestHash: string;
  readonly status: MigrationReportStatus;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly backupRestoreRef: string | null;
  readonly counts: readonly MigrationCollectionCountContract[];
  readonly invariants: readonly MigrationInvariantContract[];
  readonly fatalIssueCount: number;
  readonly warningIssueCount: number;
  readonly checkpoint: MigrationCheckpointContract;
  readonly rollback: MigrationRollbackContract | null;
}

const SHA256_HEX = /^[a-f0-9]{64}$/;
const GIT_COMMIT = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const MIGRATION_ID = /^[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])?$/;
const SAFE_CODE = /^[A-Z][A-Z0-9_]{1,127}$/;
const STABLE_VERSION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CANONICAL_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

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

function parseSha256(value: unknown, path: string): string {
  const hash = expectString(value, path);
  return SHA256_HEX.test(hash) ? hash : fail(path, "expected a lowercase SHA-256 hex digest");
}

function parseMigrationId(value: unknown, path: string): string {
  const id = expectString(value, path);
  return MIGRATION_ID.test(id) ? id : fail(path, "expected a stable lowercase migration identifier");
}

function parseStableVersion(value: unknown, path: string): string {
  const version = expectString(value, path);
  return STABLE_VERSION.test(version) ? version : fail(path, "expected a stable bounded version identifier");
}

function parseSafeCode(value: unknown, path: string): string {
  const code = expectString(value, path);
  return SAFE_CODE.test(code) ? code : fail(path, "expected a stable safe issue code");
}

function parseGitCommit(value: unknown, path: string): string {
  const commit = expectString(value, path);
  return GIT_COMMIT.test(commit) ? commit : fail(path, "expected a full lowercase Git commit digest");
}

function parseNonNegativeInteger(value: unknown, path: string): number {
  const integer = expectInteger(value, path);
  return integer >= 0 ? integer : fail(path, "must be non-negative");
}

function parseNullableNonNegativeInteger(value: unknown, path: string): number | null {
  return value === null ? null : parseNonNegativeInteger(value, path);
}

function parseDenseUniqueArray<T>(
  value: unknown,
  path: string,
  parser: (item: unknown, itemPath: string) => T,
  keyOf: (item: T) => string = (item) => String(item)
): T[] {
  if (!Array.isArray(value)) return fail(path, "expected an array");
  const parsed: T[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) {
      return fail(`${path}[${index}]`, "sparse arrays are forbidden");
    }
    const item = parser(value[index], `${path}[${index}]`);
    const key = keyOf(item);
    if (seen.has(key)) return fail(`${path}[${index}]`, "duplicate values are forbidden");
    seen.add(key);
    parsed.push(item);
  }
  return parsed;
}

function parseMigrationScope(value: unknown, path: string): MigrationScopeContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, ["workspaceIds", "campaignIds", "collections"], path);
  const workspaceIds = parseDenseUniqueArray(record["workspaceIds"], `${path}.workspaceIds`, parseWorkspaceId);
  const campaignIds = parseDenseUniqueArray(record["campaignIds"], `${path}.campaignIds`, parseCampaignId);
  const collections = parseDenseUniqueArray(
    record["collections"],
    `${path}.collections`,
    (item, itemPath) => expectEnum(item, MIGRATION_COLLECTIONS, itemPath)
  );
  if (workspaceIds.length === 0 && campaignIds.length === 0) {
    fail(path, "at least one explicit workspace or campaign is required");
  }
  if (collections.length === 0) fail(`${path}.collections`, "at least one collection is required");
  return {
    workspaceIds: workspaceIds.sort(),
    campaignIds: campaignIds.sort(),
    collections: collections.sort()
  };
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameMigrationScope(left: MigrationScopeContract, right: MigrationScopeContract): boolean {
  return sameStringArray(left.workspaceIds, right.workspaceIds)
    && sameStringArray(left.campaignIds, right.campaignIds)
    && sameStringArray(left.collections, right.collections);
}

function parseNullableStableReference(value: unknown, path: string): string | null {
  return value === null ? null : parseStableVersion(value, path);
}

function parseSortedUniqueStrings(
  value: unknown,
  path: string,
  parser: (item: unknown, itemPath: string) => string
): string[] {
  return parseDenseUniqueArray(value, path, parser).sort();
}

function parseMigrationBatch(value: unknown, path: string): MigrationBatchPlanContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "sequence",
    "batchId",
    "sourceCollection",
    "sourceStartId",
    "sourceEndId",
    "expectedCount",
    "sourceRangeHash"
  ], path);
  return {
    sequence: parseNonNegativeInteger(record["sequence"], `${path}.sequence`),
    batchId: parseStableVersion(record["batchId"], `${path}.batchId`),
    sourceCollection: expectEnum(record["sourceCollection"], MIGRATION_COLLECTIONS, `${path}.sourceCollection`),
    sourceStartId: parseNullableStableReference(record["sourceStartId"], `${path}.sourceStartId`),
    sourceEndId: parseNullableStableReference(record["sourceEndId"], `${path}.sourceEndId`),
    expectedCount: parseNonNegativeInteger(record["expectedCount"], `${path}.expectedCount`),
    sourceRangeHash: parseSha256(record["sourceRangeHash"], `${path}.sourceRangeHash`)
  };
}

export function parseMigrationManifest(
  value: unknown,
  path = "migrationManifest"
): MigrationManifestContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "migrationId",
    "migrationVersion",
    "codeCommit",
    "sourceSnapshotId",
    "sourceDatabaseFingerprint",
    "targetDatabaseFingerprint",
    "scope",
    "collectionMappingVersion",
    "normalizationVersion",
    "policyVersion",
    "batches",
    "requiredIndexes",
    "fatalIssueCodes",
    "warningIssueCodes"
  ], path);

  const migrationVersion = parseNonNegativeInteger(record["migrationVersion"], `${path}.migrationVersion`);
  if (migrationVersion === 0) fail(`${path}.migrationVersion`, "must be greater than zero");
  const scope = parseMigrationScope(record["scope"], `${path}.scope`);
  const batches = parseDenseUniqueArray(
    record["batches"],
    `${path}.batches`,
    parseMigrationBatch,
    (batch) => batch.batchId
  ).sort((left, right) => left.sequence - right.sequence);
  if (batches.length === 0) fail(`${path}.batches`, "at least one deterministic batch is required");
  for (const [index, batch] of batches.entries()) {
    if (batch.sequence !== index) {
      fail(`${path}.batches[${index}].sequence`, "must form a contiguous zero-based order");
    }
    if (!scope.collections.includes(batch.sourceCollection)) {
      fail(`${path}.batches[${index}].sourceCollection`, "must be included in the manifest scope");
    }
  }
  for (const collection of scope.collections) {
    if (!batches.some((batch) => batch.sourceCollection === collection)) {
      fail(`${path}.scope.collections`, `${collection} requires at least one deterministic batch`);
    }
  }
  const requiredIndexes = parseSortedUniqueStrings(
    record["requiredIndexes"],
    `${path}.requiredIndexes`,
    parseStableVersion
  );
  if (requiredIndexes.length === 0) {
    fail(`${path}.requiredIndexes`, "at least one verified index is required");
  }

  return {
    schemaVersion: expectEnum(record["schemaVersion"], ["hed19-manifest-v1"] as const, `${path}.schemaVersion`),
    migrationId: parseMigrationId(record["migrationId"], `${path}.migrationId`),
    migrationVersion,
    codeCommit: parseGitCommit(record["codeCommit"], `${path}.codeCommit`),
    sourceSnapshotId: parseStableVersion(record["sourceSnapshotId"], `${path}.sourceSnapshotId`),
    sourceDatabaseFingerprint: parseSha256(
      record["sourceDatabaseFingerprint"],
      `${path}.sourceDatabaseFingerprint`
    ),
    targetDatabaseFingerprint: parseSha256(
      record["targetDatabaseFingerprint"],
      `${path}.targetDatabaseFingerprint`
    ),
    scope,
    collectionMappingVersion: parseStableVersion(
      record["collectionMappingVersion"],
      `${path}.collectionMappingVersion`
    ),
    normalizationVersion: parseStableVersion(record["normalizationVersion"], `${path}.normalizationVersion`),
    policyVersion: parseStableVersion(record["policyVersion"], `${path}.policyVersion`),
    batches,
    requiredIndexes,
    fatalIssueCodes: parseSortedUniqueStrings(
      record["fatalIssueCodes"],
      `${path}.fatalIssueCodes`,
      parseSafeCode
    ),
    warningIssueCodes: parseSortedUniqueStrings(
      record["warningIssueCodes"],
      `${path}.warningIssueCodes`,
      parseSafeCode
    )
  };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("migrationManifest", "canonical numbers must be safe integers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = expectRecord(value, "migrationManifest");
  return `{${Object.keys(record).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  )).join(",")}}`;
}

export function canonicalizeMigrationManifest(value: unknown): string {
  return canonicalJson(parseMigrationManifest(value));
}

export function computeMigrationManifestHash(
  value: unknown,
  sha256: (canonicalUtf8: string) => string
): string {
  if (typeof sha256 !== "function") fail("migrationManifest.sha256", "trusted SHA-256 function is required");
  return parseSha256(sha256(canonicalizeMigrationManifest(value)), "migrationManifest.hash");
}

export function parseMigrationRestoreDrill(
  value: unknown,
  path = "restoreDrill"
): MigrationRestoreDrillContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "restoreRef",
    "migrationId",
    "migrationVersion",
    "sourceSnapshotId",
    "sourceDatabaseFingerprint",
    "manifestHash",
    "backupArtifactHash",
    "sourceMongoVersion",
    "databaseToolVersion",
    "backupEncrypted",
    "encryptionKeyVersion",
    "consistencyBoundaryKind",
    "consistencyBoundaryRef",
    "restoredDatabaseFingerprint",
    "restoreEnvironment",
    "productionRoutingDisabled",
    "operatorId",
    "status",
    "startedAt",
    "completedAt",
    "restorationDurationMs",
    "restoreTargetExpiresAt",
    "validUntil",
    "collectionCount",
    "indexCount",
    "invariants",
    "fatalIssueCount"
  ], path);
  const migrationVersion = parseNonNegativeInteger(record["migrationVersion"], `${path}.migrationVersion`);
  if (migrationVersion === 0) fail(`${path}.migrationVersion`, "must be greater than zero");
  const startedAt = parseCanonicalInstant(record["startedAt"], `${path}.startedAt`);
  const completedAt = parseCanonicalInstant(record["completedAt"], `${path}.completedAt`);
  const restorationDurationMs = parseNonNegativeInteger(
    record["restorationDurationMs"],
    `${path}.restorationDurationMs`
  );
  const restoreTargetExpiresAt = parseCanonicalInstant(
    record["restoreTargetExpiresAt"],
    `${path}.restoreTargetExpiresAt`
  );
  const validUntil = parseCanonicalInstant(record["validUntil"], `${path}.validUntil`);
  if (Date.parse(completedAt) < Date.parse(startedAt)) {
    fail(`${path}.completedAt`, "cannot precede startedAt");
  }
  if (Date.parse(completedAt) - Date.parse(startedAt) !== restorationDurationMs) {
    fail(`${path}.restorationDurationMs`, "must equal the measured restore interval");
  }
  if (Date.parse(restoreTargetExpiresAt) <= Date.parse(completedAt)) {
    fail(`${path}.restoreTargetExpiresAt`, "must be later than completedAt");
  }
  if (Date.parse(validUntil) < Date.parse(completedAt)) {
    fail(`${path}.validUntil`, "cannot precede completedAt");
  }
  const invariants = parseDenseUniqueArray(
    record["invariants"],
    `${path}.invariants`,
    parseInvariant,
    (invariant) => invariant.code
  );
  if (invariants.length === 0) fail(`${path}.invariants`, "at least one restore invariant is required");
  if (invariants.some((invariant) => invariant.status === "fail")) {
    fail(`${path}.invariants`, "a verified restore drill cannot contain failed invariants");
  }
  for (const requiredCode of REQUIRED_RESTORE_INVARIANT_CODES) {
    const requiredInvariant = invariants.find((invariant) => invariant.code === requiredCode);
    if (requiredInvariant?.status !== "pass") {
      fail(`${path}.invariants`, `${requiredCode} must be present with pass status`);
    }
  }
  const fatalIssueCount = parseNonNegativeInteger(record["fatalIssueCount"], `${path}.fatalIssueCount`);
  if (fatalIssueCount !== 0) fail(`${path}.fatalIssueCount`, "a verified restore drill cannot be fatal");

  const collectionCount = parseNonNegativeInteger(record["collectionCount"], `${path}.collectionCount`);
  const indexCount = parseNonNegativeInteger(record["indexCount"], `${path}.indexCount`);
  if (collectionCount === 0) fail(`${path}.collectionCount`, "verified restore must contain collections");
  if (indexCount === 0) fail(`${path}.indexCount`, "verified restore must contain indexes");
  const backupEncrypted = expectBoolean(record["backupEncrypted"], `${path}.backupEncrypted`);
  if (!backupEncrypted) fail(`${path}.backupEncrypted`, "verified backup must be encrypted");
  const productionRoutingDisabled = expectBoolean(
    record["productionRoutingDisabled"],
    `${path}.productionRoutingDisabled`
  );
  if (!productionRoutingDisabled) {
    fail(`${path}.productionRoutingDisabled`, "production routing to the restore must be disabled");
  }

  return {
    schemaVersion: expectEnum(
      record["schemaVersion"],
      ["hed19-restore-drill-v1"] as const,
      `${path}.schemaVersion`
    ),
    restoreRef: parseStableVersion(record["restoreRef"], `${path}.restoreRef`),
    migrationId: parseMigrationId(record["migrationId"], `${path}.migrationId`),
    migrationVersion,
    sourceSnapshotId: parseStableVersion(record["sourceSnapshotId"], `${path}.sourceSnapshotId`),
    sourceDatabaseFingerprint: parseSha256(
      record["sourceDatabaseFingerprint"],
      `${path}.sourceDatabaseFingerprint`
    ),
    manifestHash: parseSha256(record["manifestHash"], `${path}.manifestHash`),
    backupArtifactHash: parseSha256(record["backupArtifactHash"], `${path}.backupArtifactHash`),
    sourceMongoVersion: parseStableVersion(record["sourceMongoVersion"], `${path}.sourceMongoVersion`),
    databaseToolVersion: parseStableVersion(record["databaseToolVersion"], `${path}.databaseToolVersion`),
    backupEncrypted: true,
    encryptionKeyVersion: parseStableVersion(
      record["encryptionKeyVersion"],
      `${path}.encryptionKeyVersion`
    ),
    consistencyBoundaryKind: expectEnum(
      record["consistencyBoundaryKind"],
      ["oplog", "coordinatedSnapshot", "pointInTime"] as const,
      `${path}.consistencyBoundaryKind`
    ),
    consistencyBoundaryRef: parseStableVersion(
      record["consistencyBoundaryRef"],
      `${path}.consistencyBoundaryRef`
    ),
    restoredDatabaseFingerprint: parseSha256(
      record["restoredDatabaseFingerprint"],
      `${path}.restoredDatabaseFingerprint`
    ),
    restoreEnvironment: expectEnum(record["restoreEnvironment"], ["isolated"] as const, `${path}.restoreEnvironment`),
    productionRoutingDisabled: true,
    operatorId: parseStableVersion(record["operatorId"], `${path}.operatorId`),
    status: expectEnum(record["status"], ["succeeded"] as const, `${path}.status`),
    startedAt,
    completedAt,
    restorationDurationMs,
    restoreTargetExpiresAt,
    validUntil,
    collectionCount,
    indexCount,
    invariants,
    fatalIssueCount: 0
  };
}

interface MigrationRestoreDrillBinding {
  readonly restoreRef: string | null;
  readonly migrationId: string;
  readonly migrationVersion: number;
  readonly sourceSnapshotId: string;
  readonly sourceDatabaseFingerprint: string;
  readonly manifestHash: string;
  readonly evaluatedAt: string;
}

function parseVerifiedMigrationRestoreDrill(
  value: unknown,
  binding: MigrationRestoreDrillBinding,
  path: string
): MigrationRestoreDrillContract {
  const restoreDrill = parseMigrationRestoreDrill(value, path);
  if (restoreDrill.restoreRef !== binding.restoreRef
    || restoreDrill.migrationId !== binding.migrationId
    || restoreDrill.migrationVersion !== binding.migrationVersion
    || restoreDrill.sourceSnapshotId !== binding.sourceSnapshotId
    || restoreDrill.sourceDatabaseFingerprint !== binding.sourceDatabaseFingerprint
    || restoreDrill.manifestHash !== binding.manifestHash) {
    fail(
      path,
      "does not match the exact restore reference, migration, snapshot, source database and manifest"
    );
  }
  if (Date.parse(restoreDrill.completedAt) > Date.parse(binding.evaluatedAt)) {
    fail(`${path}.completedAt`, "cannot be later than trusted gate evaluation time");
  }
  if (Date.parse(restoreDrill.validUntil) < Date.parse(binding.evaluatedAt)) {
    fail(`${path}.validUntil`, "verified restore drill has expired");
  }
  return restoreDrill;
}

export function expectedMigrationConfirmation(
  command: MigrationCommand,
  migrationId: string,
  manifestHash: string
): string | null {
  if (command === "commit") return `COMMIT:${migrationId}:${manifestHash}`;
  if (command === "rollback") return `ROLLBACK_ROUTING:${migrationId}:${manifestHash}`;
  return null;
}

function parseMigrationCommandRequestInternal(
  value: unknown,
  path: string,
  allowVerifiedCommands: boolean
): MigrationCommandRequestContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "migrationId",
    "migrationVersion",
    "runId",
    "command",
    "sourceSnapshotId",
    "sourceDatabaseFingerprint",
    "targetDatabaseFingerprint",
    "manifestHash",
    "scope",
    "backupRestoreRef",
    "confirmation",
    "requestedAt"
  ], path);

  const schemaVersion = expectEnum(record["schemaVersion"], ["hed19-command-v1"] as const, `${path}.schemaVersion`);
  const migrationId = parseMigrationId(record["migrationId"], `${path}.migrationId`);
  const migrationVersion = parseNonNegativeInteger(record["migrationVersion"], `${path}.migrationVersion`);
  if (migrationVersion === 0) fail(`${path}.migrationVersion`, "must be greater than zero");
  const runId = parseStableVersion(record["runId"], `${path}.runId`);
  const command = expectEnum(record["command"], MIGRATION_COMMANDS, `${path}.command`);
  const sourceSnapshotId = parseStableVersion(record["sourceSnapshotId"], `${path}.sourceSnapshotId`);
  const sourceDatabaseFingerprint = parseSha256(record["sourceDatabaseFingerprint"], `${path}.sourceDatabaseFingerprint`);
  const targetDatabaseFingerprint = parseSha256(record["targetDatabaseFingerprint"], `${path}.targetDatabaseFingerprint`);
  const manifestHash = record["manifestHash"] === null
    ? null
    : parseSha256(record["manifestHash"], `${path}.manifestHash`);
  const scope = parseMigrationScope(record["scope"], `${path}.scope`);
  const backupRestoreRef = expectNullableString(record["backupRestoreRef"], `${path}.backupRestoreRef`);
  const confirmation = expectNullableString(record["confirmation"], `${path}.confirmation`);
  const requestedAt = parseCanonicalInstant(record["requestedAt"], `${path}.requestedAt`);

  const mutatingOrPostCommit = command === "commit" || command === "verify" || command === "rollback";
  if (mutatingOrPostCommit && !allowVerifiedCommands) {
    fail(`${path}.command`, "commit, verify and rollback require parseVerifiedMigrationCommandRequest");
  }
  if ((command === "inventory" || command === "dryRun") && manifestHash !== null) {
    fail(`${path}.manifestHash`, "inventory and dry-run generate a manifest rather than accept one");
  }
  if (mutatingOrPostCommit && manifestHash === null) {
    fail(`${path}.manifestHash`, "commit, verify and rollback require an approved manifest hash");
  }
  if (mutatingOrPostCommit && backupRestoreRef === null) {
    fail(`${path}.backupRestoreRef`, "commit, verify and rollback require a verified restore reference");
  }
  if (!mutatingOrPostCommit && backupRestoreRef !== null) {
    fail(`${path}.backupRestoreRef`, "inventory and dry-run must not claim a restore gate");
  }
  const expectedConfirmation = manifestHash === null
    ? null
    : expectedMigrationConfirmation(command, migrationId, manifestHash);
  if (confirmation !== expectedConfirmation) {
    fail(`${path}.confirmation`, expectedConfirmation === null
      ? "this command must not carry a write confirmation"
      : `expected exact confirmation ${expectedConfirmation}`);
  }

  return {
    schemaVersion,
    migrationId,
    migrationVersion,
    runId,
    command,
    sourceSnapshotId,
    sourceDatabaseFingerprint,
    targetDatabaseFingerprint,
    manifestHash,
    scope,
    backupRestoreRef,
    confirmation,
    requestedAt
  };
}

export function parseMigrationCommandRequest(
  value: unknown,
  path = "migrationCommand"
): MigrationCommandRequestContract {
  return parseMigrationCommandRequestInternal(value, path, false);
}

export function parseVerifiedMigrationCommandRequest(
  value: unknown,
  verification: MigrationVerificationContext,
  path = "migrationCommand"
): VerifiedMigrationCommandContract {
  const request = parseMigrationCommandRequestInternal(value, path, true);
  if (!["commit", "verify", "rollback"].includes(request.command)) {
    fail(`${path}.command`, "verified command parsing is reserved for commit, verify and rollback");
  }
  if (!verification || typeof verification !== "object") {
    fail(`${path}.verification`, "trusted manifest and restore verification context is required");
  }
  const evaluatedAt = parseCanonicalInstant(verification.evaluatedAt, `${path}.verification.evaluatedAt`);
  if (Date.parse(request.requestedAt) > Date.parse(evaluatedAt)) {
    fail(`${path}.requestedAt`, "cannot be later than trusted gate evaluation time");
  }
  const manifest = parseMigrationManifest(verification.manifest, `${path}.verification.manifest`);
  const manifestHash = computeMigrationManifestHash(manifest, verification.sha256);
  if (manifest.fatalIssueCodes.length !== 0) {
    fail(`${path}.verification.manifest.fatalIssueCodes`, "verified commands cannot use a manifest with fatal issues");
  }
  if (request.manifestHash !== manifestHash) {
    fail(`${path}.manifestHash`, "does not match the canonical approved manifest");
  }
  if (manifest.migrationId !== request.migrationId
    || manifest.migrationVersion !== request.migrationVersion
    || manifest.sourceSnapshotId !== request.sourceSnapshotId
    || manifest.sourceDatabaseFingerprint !== request.sourceDatabaseFingerprint
    || manifest.targetDatabaseFingerprint !== request.targetDatabaseFingerprint
    || !sameMigrationScope(manifest.scope, request.scope)) {
    fail(`${path}.verification.manifest`, "does not match the exact command migration, snapshot, databases and scope");
  }

  const restoreDrill = parseVerifiedMigrationRestoreDrill(
    verification.restoreDrill,
    {
      restoreRef: request.backupRestoreRef,
      migrationId: request.migrationId,
      migrationVersion: request.migrationVersion,
      sourceSnapshotId: request.sourceSnapshotId,
      sourceDatabaseFingerprint: request.sourceDatabaseFingerprint,
      manifestHash,
      evaluatedAt
    },
    `${path}.verification.restoreDrill`
  );

  return { request, manifest, manifestHash, restoreDrill, evaluatedAt };
}

function parseCollectionCount(value: unknown, path: string): MigrationCollectionCountContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, ["collection", "scanned", "planned", "written", "skipped", "quarantined", "failed"], path);
  const parsed = {
    collection: expectEnum(record["collection"], MIGRATION_COLLECTIONS, `${path}.collection`),
    scanned: parseNonNegativeInteger(record["scanned"], `${path}.scanned`),
    planned: parseNonNegativeInteger(record["planned"], `${path}.planned`),
    written: parseNonNegativeInteger(record["written"], `${path}.written`),
    skipped: parseNonNegativeInteger(record["skipped"], `${path}.skipped`),
    quarantined: parseNonNegativeInteger(record["quarantined"], `${path}.quarantined`),
    failed: parseNonNegativeInteger(record["failed"], `${path}.failed`)
  };
  if (parsed.planned > parsed.scanned) fail(`${path}.planned`, "cannot exceed scanned");
  if (parsed.written + parsed.skipped + parsed.quarantined + parsed.failed > parsed.planned) {
    fail(path, "item outcomes cannot exceed planned writes");
  }
  return parsed;
}

function parseInvariant(value: unknown, path: string): MigrationInvariantContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, ["code", "status", "expectedCount", "actualCount"], path);
  const status = expectEnum(record["status"], MIGRATION_INVARIANT_STATUSES, `${path}.status`);
  const expectedCount = parseNullableNonNegativeInteger(record["expectedCount"], `${path}.expectedCount`);
  const actualCount = parseNullableNonNegativeInteger(record["actualCount"], `${path}.actualCount`);
  if ((expectedCount === null) !== (actualCount === null)) {
    fail(path, "expectedCount and actualCount must be present or absent together");
  }
  if (status === "pass" && expectedCount !== null && expectedCount !== actualCount) {
    fail(path, "a passing invariant cannot contain mismatched counts");
  }
  return {
    code: parseSafeCode(record["code"], `${path}.code`),
    status,
    expectedCount,
    actualCount
  };
}

function parseCheckpoint(value: unknown, path: string): MigrationCheckpointContract {
  const record = expectRecord(value, path);
  expectExactKeys(record, ["batchId", "processed", "total"], path);
  const processed = parseNonNegativeInteger(record["processed"], `${path}.processed`);
  const total = parseNonNegativeInteger(record["total"], `${path}.total`);
  if (processed > total) fail(`${path}.processed`, "cannot exceed total");
  return {
    batchId: parseNullableStableReference(record["batchId"], `${path}.batchId`),
    processed,
    total
  };
}

function parseRollback(value: unknown, path: string): MigrationRollbackContract | null {
  if (value === null) return null;
  const record = expectRecord(value, path);
  expectExactKeys(record, ["routingProfile", "writerProfile", "dataDeleted"], path);
  const dataDeleted = expectBoolean(record["dataDeleted"], `${path}.dataDeleted`);
  if (dataDeleted) fail(`${path}.dataDeleted`, "routing rollback must preserve migrated data");
  return {
    routingProfile: expectEnum(record["routingProfile"], ["legacy"] as const, `${path}.routingProfile`),
    writerProfile: expectEnum(record["writerProfile"], ["legacy"] as const, `${path}.writerProfile`),
    dataDeleted: false
  };
}

export function parseMigrationReport(
  value: unknown,
  verification: MigrationReportVerificationContext,
  path = "migrationReport"
): MigrationReportContract {
  const verificationRecord = expectRecord(verification, `${path}.verification`);
  expectExactKeys(
    verificationRecord,
    ["manifest", "restoreDrill", "evaluatedAt", "sha256"],
    `${path}.verification`
  );
  const evaluatedAt = parseCanonicalInstant(
    verificationRecord["evaluatedAt"],
    `${path}.verification.evaluatedAt`
  );
  const sha256Candidate = verificationRecord["sha256"];
  if (typeof sha256Candidate !== "function") {
    fail(`${path}.verification.sha256`, "trusted SHA-256 function is required");
  }
  const sha256 = sha256Candidate as (canonicalUtf8: string) => string;
  const manifest = parseMigrationManifest(
    verificationRecord["manifest"],
    `${path}.verification.manifest`
  );
  const approvedManifestHash = computeMigrationManifestHash(manifest, sha256);
  const record = expectRecord(value, path);
  expectExactKeys(record, [
    "schemaVersion",
    "migrationId",
    "migrationVersion",
    "runId",
    "command",
    "sourceSnapshotId",
    "manifestHash",
    "status",
    "startedAt",
    "completedAt",
    "backupRestoreRef",
    "counts",
    "invariants",
    "fatalIssueCount",
    "warningIssueCount",
    "checkpoint",
    "rollback"
  ], path);
  const command = expectEnum(record["command"], MIGRATION_COMMANDS, `${path}.command`);
  const status = expectEnum(record["status"], MIGRATION_REPORT_STATUSES, `${path}.status`);
  const counts = parseDenseUniqueArray(
    record["counts"],
    `${path}.counts`,
    parseCollectionCount,
    (item) => item.collection
  );
  const invariants = parseDenseUniqueArray(
    record["invariants"],
    `${path}.invariants`,
    parseInvariant,
    (item) => item.code
  );
  const rollback = parseRollback(record["rollback"], `${path}.rollback`);
  if (status === "rolledBack" && command !== "rollback") {
    fail(`${path}.status`, "rolledBack is valid only for the rollback command");
  }
  if (command === "rollback" && status === "succeeded") {
    fail(`${path}.status`, "a successful rollback must use the rolledBack status");
  }
  if (command === "rollback" && status === "rolledBack" && rollback === null) {
    fail(`${path}.rollback`, "a completed routing rollback requires rollback evidence");
  }
  if (rollback !== null && (command !== "rollback" || status !== "rolledBack")) {
    fail(`${path}.rollback`, "rollback evidence is valid only for a completed routing rollback");
  }
  const startedAt = parseCanonicalInstant(record["startedAt"], `${path}.startedAt`);
  const completedAt = record["completedAt"] === null
    ? null
    : parseCanonicalInstant(record["completedAt"], `${path}.completedAt`);
  if (["succeeded", "failed", "rolledBack"].includes(status) && completedAt === null) {
    fail(`${path}.completedAt`, "terminal reports require a completion instant");
  }
  if (["planned", "running"].includes(status) && completedAt !== null) {
    fail(`${path}.completedAt`, "non-terminal reports cannot be complete");
  }
  if (completedAt !== null && Date.parse(completedAt) < Date.parse(startedAt)) {
    fail(`${path}.completedAt`, "cannot precede startedAt");
  }
  if (Date.parse(startedAt) > Date.parse(evaluatedAt)) {
    fail(`${path}.startedAt`, "cannot be later than trusted report evaluation time");
  }
  if (completedAt !== null && Date.parse(completedAt) > Date.parse(evaluatedAt)) {
    fail(`${path}.completedAt`, "cannot be later than trusted report evaluation time");
  }

  const migrationVersion = parseNonNegativeInteger(record["migrationVersion"], `${path}.migrationVersion`);
  if (migrationVersion === 0) fail(`${path}.migrationVersion`, "must be greater than zero");
  const migrationId = parseMigrationId(record["migrationId"], `${path}.migrationId`);
  const runId = parseStableVersion(record["runId"], `${path}.runId`);
  const sourceSnapshotId = parseStableVersion(record["sourceSnapshotId"], `${path}.sourceSnapshotId`);
  const manifestHash = parseSha256(record["manifestHash"], `${path}.manifestHash`);
  if (migrationId !== manifest.migrationId
    || migrationVersion !== manifest.migrationVersion
    || sourceSnapshotId !== manifest.sourceSnapshotId
    || manifestHash !== approvedManifestHash) {
    fail(
      `${path}.verification.manifest`,
      "must match the report migration, version, source snapshot and canonical manifest hash"
    );
  }
  const backupRestoreRef = parseNullableStableReference(
    record["backupRestoreRef"],
    `${path}.backupRestoreRef`
  );
  const postDryRun = ["commit", "verify", "rollback"].includes(command);
  if (postDryRun && backupRestoreRef === null) {
    fail(`${path}.backupRestoreRef`, "post-dry-run reports require a verified restore reference");
  }
  if (!postDryRun && backupRestoreRef !== null) {
    fail(`${path}.backupRestoreRef`, "read-only reports must not claim a restore gate");
  }
  if (postDryRun) {
    if (verificationRecord["restoreDrill"] === null) {
      fail(`${path}.verification.restoreDrill`, "post-dry-run reports require trusted restore evidence");
    }
    parseVerifiedMigrationRestoreDrill(
      verificationRecord["restoreDrill"],
      {
        restoreRef: backupRestoreRef,
        migrationId,
        migrationVersion,
        sourceSnapshotId,
        sourceDatabaseFingerprint: manifest.sourceDatabaseFingerprint,
        manifestHash,
        evaluatedAt
      },
      `${path}.verification.restoreDrill`
    );
  } else if (verificationRecord["restoreDrill"] !== null) {
    fail(`${path}.verification.restoreDrill`, "read-only reports must not receive restore evidence");
  }
  if (["inventory", "dryRun", "verify"].includes(command) && counts.some((count) => count.written !== 0)) {
    fail(`${path}.counts`, "inventory, dry-run and verify reports cannot claim writes");
  }
  const rollbackWriteCollections = new Set<MigrationCollectionName>([
    "auditLogs",
    "migrationRuns",
    "migrationItems",
    "migrationReports"
  ]);
  if (command === "rollback" && counts.some((count) => (
    count.written !== 0 && !rollbackWriteCollections.has(count.collection)
  ))) {
    fail(`${path}.counts`, "rollback reports can claim writes only to migration control and audit collections");
  }

  const fatalIssueCount = parseNonNegativeInteger(record["fatalIssueCount"], `${path}.fatalIssueCount`);
  const warningIssueCount = parseNonNegativeInteger(record["warningIssueCount"], `${path}.warningIssueCount`);
  const checkpoint = parseCheckpoint(record["checkpoint"], `${path}.checkpoint`);
  const successfulTerminal = status === "succeeded" || status === "rolledBack";
  if (successfulTerminal) {
    if (counts.length === 0) fail(`${path}.counts`, "successful reports require collection evidence");
    if (invariants.length === 0) fail(`${path}.invariants`, "successful reports require invariant evidence");
    if (fatalIssueCount !== 0) fail(`${path}.fatalIssueCount`, "successful reports cannot be fatal");
    if (invariants.some((invariant) => invariant.status === "fail")) {
      fail(`${path}.invariants`, "successful reports cannot contain failed invariants");
    }
    if (counts.some((count) => count.failed !== 0)) {
      fail(`${path}.counts`, "successful reports cannot contain failed items");
    }
    const plannedTotal = counts.reduce((total, count) => total + count.planned, 0);
    const processedTotal = counts.reduce((total, count) => (
      total + count.written + count.skipped + count.quarantined + count.failed
    ), 0);
    if (!Number.isSafeInteger(plannedTotal) || !Number.isSafeInteger(processedTotal)) {
      fail(`${path}.counts`, "aggregate report counts must be safe integers");
    }
    if (counts.some((count) => (
      count.written + count.skipped + count.quarantined + count.failed !== count.planned
    ))) {
      fail(`${path}.counts`, "successful outcomes must account for every planned item");
    }
    if (plannedTotal > 0 && checkpoint.batchId === null) {
      fail(`${path}.checkpoint.batchId`, "successful work requires a nonempty checkpoint batch");
    }
    if (checkpoint.total !== plannedTotal || checkpoint.processed !== processedTotal) {
      fail(`${path}.checkpoint`, "must reconcile exactly with planned and processed report evidence");
    }
    if (["dryRun", "commit", "verify"].includes(command)) {
      const expectedByCollection = new Map<MigrationCollectionName, number>();
      for (const batch of manifest.batches) {
        const nextExpected = (expectedByCollection.get(batch.sourceCollection) ?? 0) + batch.expectedCount;
        if (!Number.isSafeInteger(nextExpected)) {
          fail(`${path}.verification.manifest.batches`, "aggregate batch counts must be safe integers");
        }
        expectedByCollection.set(batch.sourceCollection, nextExpected);
      }
      if (counts.length !== expectedByCollection.size) {
        fail(`${path}.counts`, "must cover every and only approved manifest collection");
      }
      for (const count of counts) {
        if (expectedByCollection.get(count.collection) !== count.planned) {
          fail(
            `${path}.counts`,
            `${count.collection} planned count must equal the approved manifest batch total`
          );
        }
      }
      const finalBatch = manifest.batches[manifest.batches.length - 1];
      if (finalBatch === undefined || checkpoint.batchId !== finalBatch.batchId) {
        fail(`${path}.checkpoint.batchId`, "must identify the final approved manifest batch");
      }
    }
  }

  return {
    schemaVersion: expectEnum(record["schemaVersion"], ["hed19-report-v1"] as const, `${path}.schemaVersion`),
    migrationId,
    migrationVersion,
    runId,
    command,
    sourceSnapshotId,
    manifestHash,
    status,
    startedAt,
    completedAt,
    backupRestoreRef,
    counts,
    invariants,
    fatalIssueCount,
    warningIssueCount,
    checkpoint,
    rollback
  };
}
