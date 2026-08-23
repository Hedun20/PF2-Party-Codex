import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { JOB_TYPES, MIGRATION_COLLECTIONS } from "../../packages/contracts/dist/index.js";

const manifestUrl = new URL("../../docs/architecture/module-boundaries.v1.json", import.meta.url);

async function loadManifest() {
  return JSON.parse(await readFile(manifestUrl, "utf8"));
}

function assertDenseUniqueStrings(values, path) {
  assert.equal(Array.isArray(values), true, `${path} must be an array`);
  const seen = new Set();
  for (let index = 0; index < values.length; index += 1) {
    assert.equal(Object.hasOwn(values, index), true, `${path} must be dense`);
    assert.equal(typeof values[index], "string", `${path}[${index}] must be a string`);
    assert.notEqual(values[index].trim(), "", `${path}[${index}] must not be empty`);
    assert.equal(seen.has(values[index]), false, `${path} contains duplicate ${values[index]}`);
    seen.add(values[index]);
  }
}

test("HED-18 manifest owns every domain collection exactly once", async () => {
  const manifest = await loadManifest();
  assert.equal(manifest.schemaVersion, "hed18-module-boundaries-v1");
  assert.equal(
    manifest.directionRule,
    "process -> adapter -> application module public port -> core/contracts"
  );
  assert.deepEqual(manifest.jobTypes, JOB_TYPES);

  const expectedModules = [
    "audit",
    "jobs",
    "identity",
    "entitlements",
    "campaigns",
    "archive",
    "evidence",
    "integrations",
    "ai",
    "achievements",
    "notifications",
    "operations",
    "workflows"
  ];
  assert.deepEqual(manifest.modules.map((module) => module.id), expectedModules);

  const collectionOwner = new Map();
  const portOwner = new Map();
  for (const module of manifest.modules) {
    assertDenseUniqueStrings(module.ownsCollections, `${module.id}.ownsCollections`);
    assertDenseUniqueStrings(module.dependsOn, `${module.id}.dependsOn`);
    assertDenseUniqueStrings(module.commandPorts, `${module.id}.commandPorts`);
    assertDenseUniqueStrings(module.queryPorts, `${module.id}.queryPorts`);
    assertDenseUniqueStrings(module.eventPorts, `${module.id}.eventPorts`);
    for (const collection of module.ownsCollections) {
      assert.equal(
        collectionOwner.has(collection),
        false,
        `${collection} is owned by both ${collectionOwner.get(collection)} and ${module.id}`
      );
      collectionOwner.set(collection, module.id);
    }
    for (const port of [...module.commandPorts, ...module.queryPorts, ...module.eventPorts]) {
      assert.equal(
        portOwner.has(port),
        false,
        `${port} is public from both ${portOwner.get(port)} and ${module.id}`
      );
      portOwner.set(port, module.id);
    }
  }
  assert.equal(manifest.modules.find((module) => module.id === "workflows").ownsCollections.length, 0);
  assert.equal(collectionOwner.get("memberships"), "identity");
  assert.equal(collectionOwner.get("campaigns"), "campaigns");
  assert.equal(collectionOwner.get("entryRevisions"), "archive");
  assert.equal(collectionOwner.get("evidenceRecords"), "evidence");
  assert.equal(collectionOwner.get("ingestionReceipts"), "integrations");
  assert.equal(collectionOwner.get("achievementAwards"), "achievements");
  assert.equal(collectionOwner.get("emailOutbox"), "notifications");
  assert.equal(collectionOwner.get("serviceCredentials"), "integrations");
  assert.equal(collectionOwner.get("migrationRuns"), "operations");
  assert.equal(collectionOwner.get("migrationItems"), "operations");
  assert.equal(collectionOwner.get("migrationReports"), "operations");
  for (const collection of MIGRATION_COLLECTIONS) {
    assert.equal(
      collectionOwner.has(collection),
      true,
      `HED-19 collection ${collection} must have one HED-18 owner`
    );
  }
});

test("module dependencies form one explicit acyclic public-port graph", async () => {
  const manifest = await loadManifest();
  const modules = new Map(manifest.modules.map((module) => [module.id, module]));
  const visiting = new Set();
  const visited = new Set();

  function visit(moduleId, trail = []) {
    assert.equal(modules.has(moduleId), true, `unknown dependency ${moduleId}`);
    assert.equal(visiting.has(moduleId), false, `dependency cycle: ${[...trail, moduleId].join(" -> ")}`);
    if (visited.has(moduleId)) return;
    visiting.add(moduleId);
    const module = modules.get(moduleId);
    for (const dependency of module.dependsOn) {
      assert.notEqual(dependency, moduleId, `${moduleId} cannot depend on itself`);
      visit(dependency, [...trail, moduleId]);
    }
    visiting.delete(moduleId);
    visited.add(moduleId);
  }

  for (const moduleId of modules.keys()) visit(moduleId);
  assert.equal(visited.size, manifest.modules.length);
  assert.deepEqual(modules.get("audit").dependsOn, []);
  assert.equal(
    manifest.modules.some((module) => module.id !== "workflows" && module.dependsOn.includes("workflows")),
    false,
    "domain modules must never depend back on the workflow orchestrator"
  );
});

test("processes receive exact public-port grants and only the worker controls leases", async () => {
  const manifest = await loadManifest();
  const processById = new Map(manifest.processes.map((process) => [process.id, process]));
  assert.equal(processById.size, manifest.processes.length, "process IDs must be unique");
  assert.deepEqual(
    manifest.processes.map((process) => process.id),
    [
      "web-next",
      "legacy-api",
      "worker",
      "discord-bot",
      "foundry-module",
      "migration-command",
      "index-command"
    ]
  );

  const publicPortOwner = new Map();
  for (const module of manifest.modules) {
    for (const port of [...module.commandPorts, ...module.queryPorts]) {
      publicPortOwner.set(`${module.id}.${port}`, module.id);
    }
  }
  for (const process of manifest.processes) {
    assert.equal(Object.hasOwn(process, "invokesModules"), false, "module-wide grants are forbidden");
    assertDenseUniqueStrings(process.invokesPorts, `${process.id}.invokesPorts`);
    for (const qualifiedPort of process.invokesPorts) {
      assert.equal(
        publicPortOwner.has(qualifiedPort),
        true,
        `${process.id} invokes unknown or non-callable port ${qualifiedPort}`
      );
    }
  }

  for (const connectorId of ["discord-bot", "foundry-module"]) {
    const connector = processById.get(connectorId);
    assert.equal(connector.mongoAccess, "none");
    assert.deepEqual(connector.invokesPorts, []);
    assert.equal(connector.ownsQueueLeases, false);
  }
  assert.deepEqual(
    manifest.processes.filter((process) => process.ownsQueueLeases).map((process) => process.id),
    ["worker"]
  );
  const workerOnlyJobPorts = [
    "jobs.claimJobLease",
    "jobs.recordJobResult",
    "jobs.listDeadLetterJobs"
  ];
  for (const port of workerOnlyJobPorts) {
    assert.equal(processById.get("worker").invokesPorts.includes(port), true);
    assert.deepEqual(
      manifest.processes.filter((process) => (
        process.id !== "worker" && process.invokesPorts.includes(port)
      )),
      [],
      `${port} must be worker-only`
    );
  }
  assert.deepEqual(
    processById.get("web-next").invokesPorts.filter((port) => port.startsWith("jobs.")),
    ["jobs.enqueueJob", "jobs.cancelJob", "jobs.getJobStatus"]
  );
  assert.equal(processById.get("web-next").invokesPorts.some((port) => port.startsWith("operations.")), false);
  assert.deepEqual(processById.get("migration-command").invokesPorts, [
    "operations.inventoryMigration",
    "operations.dryRunMigration",
    "operations.commitMigration",
    "operations.verifyMigration",
    "operations.rollbackMigrationRouting",
    "operations.getMigrationReport"
  ]);
  assert.deepEqual(processById.get("index-command").invokesPorts, [
    "operations.applyIndexManifest",
    "operations.verifyIndexManifest"
  ]);
  assert.equal(
    processById.get("migration-command").mongoAccess,
    "through-approved-operator-adapters"
  );
  assert.equal(
    processById.get("index-command").mongoAccess,
    "through-approved-operator-adapters"
  );
});
