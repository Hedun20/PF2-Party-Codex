import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const rootDir = path.resolve(import.meta.dirname, "../..");
const packageSourceDirs = [
  path.join(rootDir, "packages/contracts/src"),
  path.join(rootDir, "packages/core/src")
];
const forbiddenPackage = /^(?:express|next|mongodb|react)(?:\/|$)|(?:foundry|pathbuilder|pf2e)/i;
const browserGlobal = /\b(?:window|document|localStorage|sessionStorage|navigator|HTMLElement)\b/;

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => path.join(directory, entry.name));
}

function importedSpecifiers(source) {
  const specifiers = [];
  const pattern = /(?:\bfrom\s*|\bimport\s*\()\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  return specifiers;
}

test("contracts and core remain framework, storage, browser and game-system neutral", async () => {
  for (const directory of packageSourceDirs) {
    for (const file of await sourceFiles(directory)) {
      const source = await readFile(file, "utf8");
      for (const specifier of importedSpecifiers(source)) {
        assert.doesNotMatch(specifier, forbiddenPackage, `${path.relative(rootDir, file)} imports ${specifier}`);
      }
      assert.doesNotMatch(source, browserGlobal, `${path.relative(rootDir, file)} references a browser global`);
    }
  }
});
