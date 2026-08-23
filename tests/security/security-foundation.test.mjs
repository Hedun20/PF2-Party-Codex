import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { HED_24_BOUNDARY_SPEC } from "./hed-24-boundaries.mjs";
import { createAdversarialFixtures } from "./support/adversarial-fixtures.mjs";
import {
  SecurityAssertionError,
  signSecurityBatch,
  validateSecurityFixture
} from "./support/security-assertions.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixtures = createAdversarialFixtures();

test("security scenario manifest covers every HED-24 boundary and W2/W3/W4 gate", () => {
  const ids = fixtures.map((fixture) => fixture.id);
  assert.deepEqual([...ids].sort(), Object.keys(HED_24_BOUNDARY_SPEC).sort());
  assert.equal(new Set(ids).size, ids.length, "Security scenario IDs must be unique");
  for (const fixture of fixtures) {
    assert.deepEqual(
      [...fixture.waves].sort(),
      [...HED_24_BOUNDARY_SPEC[fixture.id]].sort(),
      `${fixture.id} does not match the independent HED-24 wave assignment`
    );
    assert.ok(fixture.assertion, `${fixture.id} has no reusable assertion`);
    assert.ok(fixture.secure, `${fixture.id} has no secure control fixture`);
    assert.ok(fixture.insecure, `${fixture.id} has no intentionally insecure fixture`);
  }
});

test("reusable assertions accept every secure control fixture", async (t) => {
  for (const fixture of fixtures) {
    await t.test(fixture.id, () => {
      assert.doesNotThrow(() => validateSecurityFixture(fixture, fixture.secure));
    });
  }
});

test("every intentionally insecure fixture is rejected", async (t) => {
  for (const fixture of fixtures) {
    await t.test(fixture.id, () => {
      assert.throws(
        () => validateSecurityFixture(fixture, fixture.insecure),
        (error) => error instanceof SecurityAssertionError
          && error.code === "SECURITY_GATE_FAILED"
          && error.scenarioId === fixture.id
      );
    });
  }
});

test("security assertion failures redact credentials, private markers and PII", () => {
  for (const fixture of fixtures) {
    let failure;
    try {
      validateSecurityFixture(fixture, fixture.insecure);
    } catch (error) {
      failure = error;
    }
    assert.ok(failure instanceof SecurityAssertionError, `${fixture.id} did not produce the controlled error type`);
    for (const marker of fixture.forbiddenValues || []) {
      assert.ok(!failure.message.includes(marker), `${fixture.id} leaked a forbidden marker in its failure`);
    }
    assert.doesNotMatch(failure.message, /Bearer\s+(?!<redacted>)[^\s]+/i);
    assert.doesNotMatch(failure.message, /mongodb(?:\+srv)?:\/\/[^:@\s]+:[^<@\s][^@\s]*@/i);
    assert.doesNotMatch(failure.message, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  }
});

test("controlled errors redact every evidence leaf, including future ordinary fields", () => {
  const privateValues = [
    "PRIVATE_SUMMARY_VALUE",
    "SECRET_TITLE_VALUE",
    "diagnostic payload",
    "fixture-user",
    "fixture-password",
    "arbitrary-api-credential"
  ];
  const failure = new SecurityAssertionError("redaction.future-field", "future adapter rejected", {
    summary: privateValues[0],
    title: privateValues[1],
    diagnostic: privateValues[2],
    mongoUri: `mongodb://${privateValues[3]}:${privateValues[4]}@db.internal/codex`,
    nested: { apiCredential: privateValues[5], count: 42, enabled: true }
  });
  for (const value of privateValues) assert.ok(!failure.message.includes(value));
  assert.ok(!failure.message.includes("42"));
  assert.doesNotMatch(failure.message, /true/);
});

test("deep-link assertion rejects normalized traversal and non-local origins", () => {
  const scenario = fixtures.find((fixture) => fixture.id === "notifications.deep-link-scope");
  for (const url of [
    "https://attacker.invalid/campaigns/campaign-a/archive/entry-1",
    "/campaigns/campaign-a/../campaign-b/archive/entry-1",
    "/campaigns/campaign-a/%2e%2e/campaign-b/archive/entry-1",
    "/campaigns/campaign-a/%2f../campaign-b/archive/entry-1"
  ]) {
    assert.throws(() => validateSecurityFixture(scenario, { url }), SecurityAssertionError);
  }
});

test("analytics assertion rejects every field outside its explicit allowlist", () => {
  const scenario = fixtures.find((fixture) => fixture.id === "analytics.metadata-redaction");
  for (const extra of [
    { playerName: "private name" },
    { characterName: "private character" },
    { phoneNumber: "+1-555-0100" },
    { apiCredential: "credential" }
  ]) {
    assert.throws(
      () => validateSecurityFixture(scenario, { ...scenario.secure, ...extra }),
      SecurityAssertionError
    );
  }
  assert.throws(
    () => validateSecurityFixture(scenario, { ...scenario.secure, campaignBucket: { nested: true } }),
    SecurityAssertionError
  );
});

test("analytics assertion validates values inside every allowlisted field", () => {
  const scenario = fixtures.find((fixture) => fixture.id === "analytics.metadata-redaction");
  const unkeyedEmailDigest = crypto.createHash("sha256").update("alice@example.com").digest("hex");
  for (const override of [
    { event: "Bearer secret-credential" },
    { event: "archive.delete" },
    { campaignBucket: "alice@example.com" },
    { campaignBucket: "campaign-a" },
    { campaignBucket: `hmac-sha256:${unkeyedEmailDigest}` },
    { campaignBucket: `hmac-sha256:${"a".repeat(64)}` },
    { outcome: "private player name" },
    { durationMs: -1 },
    { durationMs: 1.5 },
    { durationMs: 120_001 }
  ]) {
    assert.throws(
      () => validateSecurityFixture(scenario, { ...scenario.secure, ...override }),
      SecurityAssertionError
    );
  }
  const { outcome: _omitted, ...missingOutcome } = scenario.secure;
  assert.throws(() => validateSecurityFixture(scenario, missingOutcome), SecurityAssertionError);
});

test("signed batches exercise exact campaign and connection checks after valid signatures", () => {
  const scenario = fixtures.find((fixture) => fixture.id === "connector.signed-batch-tampering");
  for (const patch of [
    { campaignId: "campaign-b" },
    { connectionId: "foundry-connection-b" }
  ]) {
    const batch = { ...scenario.secure.batch, ...patch };
    assert.throws(
      () => validateSecurityFixture(scenario, {
        batch,
        signature: signSecurityBatch(batch, scenario.signingSecret)
      }),
      SecurityAssertionError
    );
  }
});

test("malformed metadata candidates always use the controlled error type", () => {
  const scenario = fixtures.find((fixture) => fixture.id === "analytics.metadata-redaction");
  for (const candidate of [undefined, Symbol("malformed")]) {
    assert.throws(
      () => validateSecurityFixture(scenario, candidate),
      (error) => error instanceof SecurityAssertionError
        && error.code === "SECURITY_GATE_FAILED"
        && error.scenarioId === scenario.id
    );
  }
});

test("default test and CI commands keep the adversarial foundation mandatory", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
  const workflow = fs.readFileSync(path.join(rootDir, ".github/workflows/ci.yml"), "utf8");
  assert.match(packageJson.scripts["test:security"], /tests\/security\/security-foundation\.test\.mjs/);
  assert.match(packageJson.scripts.test, /tests\/security\/security-foundation\.test\.mjs/);
  assert.match(workflow, /Run adversarial security foundation/);
  assert.match(workflow, /npm run test:security/);
});
