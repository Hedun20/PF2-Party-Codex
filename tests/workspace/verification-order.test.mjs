import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const rootPackage = JSON.parse(
  await fs.readFile(new URL("../../package.json", import.meta.url), "utf8")
);
const workflow = await fs.readFile(
  new URL("../../.github/workflows/ci.yml", import.meta.url),
  "utf8"
);

function commandIndex(commands, command) {
  return commands.indexOf(command);
}

test("root verify builds the rollback app before its server smoke test", () => {
  const commands = rootPackage.scripts.verify.split("&&").map((command) => command.trim());
  const legacyBuildIndex = commandIndex(commands, "npm run build");
  const legacyTestsIndex = commandIndex(commands, "npm test");

  assert.notEqual(legacyBuildIndex, -1, "verify must retain the legacy production build gate");
  assert.notEqual(legacyTestsIndex, -1, "verify must retain the legacy test gate");
  assert.ok(
    legacyBuildIndex < legacyTestsIndex,
    "the legacy build must exist before server-smoke runs via npm test"
  );
  assert.equal(commands.filter((command) => command === "npm run build").length, 1);
});

test("expanded CI builds the rollback app before the server smoke step", () => {
  const legacyBuildIndex = workflow.indexOf(
    "- name: Build production web bundle and enforce budgets"
  );
  const serverSmokeIndex = workflow.indexOf("- name: Run server smoke tests");

  assert.notEqual(legacyBuildIndex, -1, "CI must retain the legacy production build step");
  assert.notEqual(serverSmokeIndex, -1, "CI must retain the server smoke step");
  assert.ok(
    legacyBuildIndex < serverSmokeIndex,
    "CI must build apps/web/dist before the server smoke step"
  );
  assert.match(
    workflow,
    /- name: Build production web bundle and enforce budgets\n\s+run: npm run build/
  );
  assert.equal(
    workflow.match(/- name: Build production web bundle and enforce budgets/g)?.length,
    1
  );
});
