import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function source(relativePath) {
  return fs.readFile(path.join(rootDir, relativePath), "utf8");
}

test("authenticated shell uses one neutral application foundation", async () => {
  const [shell, indexCss, fantasyCss, themeCss, appCss] = await Promise.all([
    source("apps/web/src/components/FantasyShell.jsx"),
    source("apps/web/src/styles/index.css"),
    source("apps/web/src/styles/fantasy.css"),
    source("apps/web/src/styles/theme.css"),
    source("apps/web/src/styles/app.css")
  ]);

  assert.match(shell, /data-ui-foundation="neutral"/);
  assert.doesNotMatch(shell, /CinematicWorldBackground|getWorldTheme|worldTheme/);

  assert.match(indexCss, /@import "\.\/app\.css" layer\(app\);/);
  assert.doesNotMatch(indexCss, /stage20-native-selects\.css/);

  assert.match(themeCss, /--gold-strong:/);
  assert.match(themeCss, /--focus-ring:/);
  assert.match(themeCss, /--content-max:/);

  assert.match(fantasyCss, /\.app-shell::before/);
  assert.doesNotMatch(fantasyCss, /\.world-bg-(fire|frost|arcane|celestial|infernal|midgard|death|storm|desert|dungeon|city)/);

  assert.match(appCss, /Canonical application foundation/);
  assert.match(appCss, /\.codex-card-grid:has\(\.codex-card:hover\)/);
  assert.match(appCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(appCss, /\.world-bg-(fire|frost|arcane|celestial|infernal|midgard|death|storm|desert|dungeon|city)/);
});
