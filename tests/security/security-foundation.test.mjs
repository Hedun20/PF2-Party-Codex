import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createAdversarialFixtures,
  REQUIRED_SECURITY_SCENARIOS
} from "./support/adversarial-fixtures.mjs";
import {
  SecurityAssertionError,
  validateSecurityFixture
} from "./support/security-assertions.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixtures = createAdversarialFixtures();

test("security scenario manifest covers every HED-24 boundary and W2/W3/W4 gate", () => {
  const ids = fixtures.map((fixture) => fixture.id);
  assert.deepEqual([...ids].sort(), [...REQUIRED_SECURITY_SCENARIOS].sort());
  assert.equal(new Set(ids).size, ids.length, "Security scenario IDs must be unique");
  for (const wave of ["W2", "W3", "W4"]) {
    assert.ok(fixtures.some((fixture) => fixture.waves.includes(wave)), `${wave} has no adversarial gate`);
  }
  for (const fixture of fixtures) {
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

test("default test and CI commands keep the adversarial foundation mandatory", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
  const workflow = fs.readFileSync(path.join(rootDir, ".github/workflows/ci.yml"), "utf8");
  assert.match(packageJson.scripts["test:security"], /tests\/security\/security-foundation\.test\.mjs/);
  assert.match(packageJson.scripts.test, /tests\/security\/security-foundation\.test\.mjs/);
  assert.match(workflow, /Run adversarial security foundation/);
  assert.match(workflow, /npm run test:security/);
});
