import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  ContractValidationError,
  canonicalizeMigrationManifest,
  computeMigrationManifestHash,
  expectedMigrationConfirmation,
  parseMigrationCommandRequest,
  parseMigrationManifest,
  parseMigrationReport,
  parseVerifiedMigrationCommandRequest
} from "../../packages/contracts/dist/index.js";

const sourceDatabaseFingerprint = "b".repeat(64);
const targetDatabaseFingerprint = "c".repeat(64);
const backupArtifactHash = "d".repeat(64);
const restoredDatabaseFingerprint = "e".repeat(64);

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function scope(overrides = {}) {
  return {
    workspaceIds: ["workspace-redacted-001"],
    campaignIds: ["campaign-redacted-001"],
    collections: ["campaigns", "entries"],
    ...overrides
  };
}

function manifest(overrides = {}) {
  return {
    schemaVersion: "hed19-manifest-v1",
    migrationId: "hed19-legacy-to-canon-v1",
    migrationVersion: 1,
    codeCommit: "f".repeat(40),
    sourceSnapshotId: "snapshot-redacted-001",
    sourceDatabaseFingerprint,
    targetDatabaseFingerprint,
    scope: scope(),
    collectionMappingVersion: "collection-map-v1",
    normalizationVersion: "normalization-v1",
    policyVersion: "campaign-policy-v1",
    batches: [
      {
        sequence: 0,
        batchId: "campaigns-0001",
        sourceCollection: "campaigns",
        sourceStartId: "campaign-redacted-001",
        sourceEndId: "campaign-redacted-001",
        expectedCount: 1,
        sourceRangeHash: "1".repeat(64)
      },
      {
        sequence: 1,
        batchId: "entries-0001",
        sourceCollection: "entries",
        sourceStartId: "entry-redacted-001",
        sourceEndId: "entry-redacted-002",
        expectedCount: 2,
        sourceRangeHash: "2".repeat(64)
      }
    ],
    requiredIndexes: ["entries.campaign_slug", "entries.campaign_revision"],
    fatalIssueCodes: [],
    warningIssueCodes: ["LEGACY_OPTIONAL_DATE_MISSING", "LEGACY_UNKNOWN_FIELD_RETAINED"],
    ...overrides
  };
}

const manifestHash = computeMigrationManifestHash(manifest(), sha256);

function restoreDrill(overrides = {}) {
  return {
    schemaVersion: "hed19-restore-drill-v1",
    restoreRef: "restore-drill-redacted-001",
    migrationId: "hed19-legacy-to-canon-v1",
    migrationVersion: 1,
    sourceSnapshotId: "snapshot-redacted-001",
    sourceDatabaseFingerprint,
    manifestHash,
    backupArtifactHash,
    restoredDatabaseFingerprint,
    status: "succeeded",
    startedAt: "2026-08-23T15:00:00.000Z",
    completedAt: "2026-08-23T15:30:00.000Z",
    validUntil: "2026-08-30T15:30:00.000Z",
    collectionCount: 2,
    indexCount: 2,
    invariants: [{
      code: "RESTORED_COUNTS_MATCH",
      status: "pass",
      expectedCount: 3,
      actualCount: 3
    }],
    fatalIssueCount: 0,
    ...overrides
  };
}

function verification(overrides = {}) {
  return {
    manifest: manifest(),
    restoreDrill: restoreDrill(),
    evaluatedAt: "2026-08-23T16:01:00.000Z",
    sha256,
    ...overrides
  };
}

function command(overrides = {}) {
  return {
    schemaVersion: "hed19-command-v1",
    migrationId: "hed19-legacy-to-canon-v1",
    migrationVersion: 1,
    runId: "migration-run-redacted-001",
    command: "inventory",
    sourceSnapshotId: "snapshot-redacted-001",
    sourceDatabaseFingerprint,
    targetDatabaseFingerprint,
    manifestHash: null,
    scope: scope(),
    backupRestoreRef: null,
    confirmation: null,
    requestedAt: "2026-08-23T16:00:00.000Z",
    ...overrides
  };
}

function gatedCommand(commandName, overrides = {}) {
  const migrationId = "hed19-legacy-to-canon-v1";
  return command({
    command: commandName,
    manifestHash,
    backupRestoreRef: "restore-drill-redacted-001",
    confirmation: expectedMigrationConfirmation(commandName, migrationId, manifestHash),
    ...overrides
  });
}

function report(overrides = {}) {
  return {
    schemaVersion: "hed19-report-v1",
    migrationId: "hed19-legacy-to-canon-v1",
    migrationVersion: 1,
    runId: "migration-run-redacted-001",
    command: "commit",
    sourceSnapshotId: "snapshot-redacted-001",
    manifestHash,
    status: "succeeded",
    startedAt: "2026-08-23T16:00:00.000Z",
    completedAt: "2026-08-23T16:05:00.000Z",
    backupRestoreRef: "restore-drill-redacted-001",
    counts: [{
      collection: "entries",
      scanned: 2,
      planned: 2,
      written: 2,
      skipped: 0,
      quarantined: 0,
      failed: 0
    }],
    invariants: [{
      code: "ENTRY_CAMPAIGN_SCOPE_EXACT",
      status: "pass",
      expectedCount: 2,
      actualCount: 2
    }],
    fatalIssueCount: 0,
    warningIssueCount: 0,
    checkpoint: { batchId: "entries-0001", processed: 2, total: 2 },
    rollback: null,
    ...overrides
  };
}

test("inventory and dry-run commands are provably read-only", () => {
  assert.equal(parseMigrationCommandRequest(command()).command, "inventory");
  assert.equal(parseMigrationCommandRequest(command({ command: "dryRun" })).command, "dryRun");
  for (const request of [
    command({ manifestHash }),
    command({ command: "dryRun", backupRestoreRef: "unearned-restore-ref" }),
    command({ command: "dryRun", confirmation: "COMMIT:anything" })
  ]) {
    assert.throws(() => parseMigrationCommandRequest(request), ContractValidationError);
  }
});

test("manifest canonicalization removes set and input-order nondeterminism", () => {
  const reordered = manifest({
    scope: scope({ collections: ["entries", "campaigns"] }),
    batches: [...manifest().batches].reverse(),
    requiredIndexes: [...manifest().requiredIndexes].reverse(),
    warningIssueCodes: [...manifest().warningIssueCodes].reverse()
  });
  assert.equal(computeMigrationManifestHash(reordered, sha256), manifestHash);
  assert.equal(canonicalizeMigrationManifest(reordered), canonicalizeMigrationManifest(manifest()));
  assert.notEqual(
    computeMigrationManifestHash(manifest({
      batches: manifest().batches.map((batch) => (
        batch.sequence === 1 ? { ...batch, expectedCount: 3 } : batch
      ))
    }), sha256),
    manifestHash
  );
  assert.throws(
    () => parseMigrationManifest({ ...manifest(), generatedAt: "2026-08-23T16:00:00.000Z" }),
    ContractValidationError
  );
});

test("commit requires a canonically hashed manifest and matching valid restore drill", () => {
  const request = gatedCommand("commit");
  assert.throws(() => parseMigrationCommandRequest(request), ContractValidationError);
  const parsed = parseVerifiedMigrationCommandRequest(request, verification());
  assert.equal(parsed.manifestHash, manifestHash);
  assert.equal(parsed.restoreDrill.restoreRef, "restore-drill-redacted-001");
  assert.equal(parsed.request.confirmation, `COMMIT:hed19-legacy-to-canon-v1:${manifestHash}`);

  const changedManifest = manifest({ policyVersion: "campaign-policy-v2" });
  for (const context of [
    verification({ manifest: changedManifest }),
    verification({ restoreDrill: restoreDrill({ restoreRef: "anything" }) }),
    verification({ restoreDrill: restoreDrill({ sourceSnapshotId: "another-snapshot" }) }),
    verification({ restoreDrill: restoreDrill({ sourceDatabaseFingerprint: "9".repeat(64) }) }),
    verification({ restoreDrill: restoreDrill({ manifestHash: "8".repeat(64) }) }),
    verification({ restoreDrill: restoreDrill({ validUntil: "2026-08-23T16:00:59.999Z" }) }),
    verification({ manifest: manifest({ requiredIndexes: [] }) }),
    verification({ manifest: manifest({ fatalIssueCodes: ["TENANT_AMBIGUITY"] }) }),
    verification({ restoreDrill: restoreDrill({ collectionCount: 0 }) }),
    verification({ restoreDrill: restoreDrill({ indexCount: 0 }) }),
    verification({ restoreDrill: restoreDrill({ invariants: [] }) }),
    verification({ restoreDrill: restoreDrill({ fatalIssueCount: 1 }) }),
    verification({
      restoreDrill: restoreDrill({
        invariants: [{
          code: "RESTORED_COUNTS_MATCH",
          status: "fail",
          expectedCount: 3,
          actualCount: 2
        }]
      })
    })
  ]) {
    assert.throws(() => parseVerifiedMigrationCommandRequest(request, context), ContractValidationError);
  }
});

test("verify is non-mutating and rollback confirmation names routing explicitly", () => {
  assert.equal(
    parseVerifiedMigrationCommandRequest(gatedCommand("verify"), verification()).request.confirmation,
    null
  );
  assert.equal(
    parseVerifiedMigrationCommandRequest(gatedCommand("rollback"), verification()).request.confirmation,
    `ROLLBACK_ROUTING:hed19-legacy-to-canon-v1:${manifestHash}`
  );
});

test("migration commands reject ambiguous time, scope, arrays, hashes and secret-shaped extras", () => {
  const sparseCollections = new Array(1);
  for (const request of [
    command({ requestedAt: "0" }),
    command({ sourceDatabaseFingerprint: "not-a-hash" }),
    command({ scope: { workspaceIds: [], campaignIds: [], collections: ["entries"] } }),
    command({ scope: { workspaceIds: ["workspace-redacted-001"], campaignIds: [], collections: [] } }),
    command({ scope: { workspaceIds: ["workspace-redacted-001"], campaignIds: [], collections: sparseCollections } }),
    command({ scope: { workspaceIds: ["workspace-redacted-001"], campaignIds: [], collections: ["entries", "entries"] } }),
    { ...command(), mongoUri: "mongodb://private.example.invalid" }
  ]) {
    assert.throws(() => parseMigrationCommandRequest(request), ContractValidationError);
  }
});

test("migration reports expose bounded counts and invariants without raw records", () => {
  const parsed = parseMigrationReport(report());
  assert.equal(parsed.status, "succeeded");
  assert.equal(parsed.counts[0].written, 2);
  assert.equal(parsed.invariants[0].status, "pass");
  assert.throws(
    () => parseMigrationReport({ ...report(), rawPayload: { private: "must not enter reports" } }),
    ContractValidationError
  );
});

test("read-only reports reject every claimed domain write", () => {
  const baseCount = report().counts[0];
  const safeDryRun = report({
    command: "dryRun",
    backupRestoreRef: null,
    counts: [{ ...baseCount, written: 0, skipped: 2 }]
  });
  assert.equal(parseMigrationReport(safeDryRun).counts[0].written, 0);
  assert.throws(
    () => parseMigrationReport(report({ command: "dryRun", backupRestoreRef: null })),
    ContractValidationError
  );
});

test("successful reports reject failed invariants, fatal issues, failures and incomplete work", () => {
  const baseInvariant = report().invariants[0];
  const baseCount = report().counts[0];
  for (const candidate of [
    report({ invariants: [{ ...baseInvariant, status: "fail" }] }),
    report({ fatalIssueCount: 1 }),
    report({ counts: [] }),
    report({ invariants: [] }),
    report({ counts: [{ ...baseCount, written: 1, failed: 1 }] }),
    report({ checkpoint: { batchId: "entries-0001", processed: 1, total: 2 } }),
    report({ counts: [{ ...baseCount, written: 1 }] })
  ]) {
    assert.throws(() => parseMigrationReport(candidate), ContractValidationError);
  }
});

test("migration reports reject impossible counts, duplicate rows and completion states", () => {
  const baseCount = report().counts[0];
  for (const candidate of [
    report({ counts: [{ ...baseCount, planned: 3 }] }),
    report({ counts: [{ ...baseCount, written: 2, skipped: 1 }] }),
    report({ counts: [baseCount, { ...baseCount }] }),
    report({ status: "running", completedAt: "2026-08-23T16:05:00.000Z" }),
    report({ status: "succeeded", completedAt: null }),
    report({ status: "rolledBack" }),
    report({ command: "rollback", status: "succeeded", rollback: null }),
    report({ completedAt: "2026-08-23T15:59:59.999Z" }),
    report({ backupRestoreRef: null })
  ]) {
    assert.throws(() => parseMigrationReport(candidate), ContractValidationError);
  }
});

test("rollback reports prove route and writer rollback without deleting migrated data", () => {
  const rollback = {
    routingProfile: "legacy",
    writerProfile: "legacy",
    dataDeleted: false
  };
  assert.deepEqual(parseMigrationReport(report({
    command: "rollback",
    status: "rolledBack",
    rollback
  })).rollback, rollback);
  for (const candidate of [
    report({
      command: "rollback",
      status: "rolledBack",
      rollback: { ...rollback, dataDeleted: true }
    }),
    report({ command: "rollback", status: "succeeded", rollback }),
    report({ command: "rollback", status: "rolledBack", rollback: null })
  ]) {
    assert.throws(() => parseMigrationReport(candidate), ContractValidationError);
  }
});
