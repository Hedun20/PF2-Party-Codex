import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { APP_ROUTE_LIST, LEGACY_ROUTE_REDIRECTS } from "../apps/web/src/routing/appRoutes.js";

const root = path.resolve(import.meta.dirname, "..");
const pagesDir = path.join(root, "apps", "web", "src", "pages");
const componentsDir = path.join(root, "apps", "web", "src", "components");
const stylesDir = path.join(root, "apps", "web", "src", "styles");
const migrationMatrix = fs.readFileSync(path.join(root, "docs", "ss-stage1", "MIGRATION_MATRIX.md"), "utf8");
const cssMatrix = fs.readFileSync(path.join(root, "docs", "ss-stage1", "CSS_MIGRATION_MATRIX.md"), "utf8");
const productMap = fs.readFileSync(path.join(root, "docs", "ss-stage1", "PRODUCT_MAP.md"), "utf8");
const stage2Architecture = fs.readFileSync(path.join(root, "docs", "ss-stage2", "ROUTING_AND_SHELL.md"), "utf8");
const componentDecisions = `${migrationMatrix}\n${stage2Architecture}`;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

test("every legacy runtime route has an explicit migration decision", () => {
  assert.ok(LEGACY_ROUTE_REDIRECTS.length >= 30, "legacy redirect inventory unexpectedly small");
  for (const route of LEGACY_ROUTE_REDIRECTS) {
    assert.ok(migrationMatrix.includes(`| \`${route.path}\` |`), `missing route decision for ${route.path}`);
  }
  assert.ok(migrationMatrix.includes("| `*` |"), "missing fallback route decision");
});

test("canonical runtime routes are unique and documented by the product map", () => {
  const routeIds = APP_ROUTE_LIST.map((route) => route.id);
  const patterns = APP_ROUTE_LIST.map((route) => route.pattern);
  assert.equal(new Set(routeIds).size, routeIds.length);
  assert.equal(new Set(patterns).size, patterns.length);
  for (const required of [
    "/app/campaigns/:campaignId/home",
    "/app/campaigns/:campaignId/archive",
    "/app/campaigns/:campaignId/session",
    "/app/campaigns/:campaignId/manage/players",
    "/app/account/profile"
  ]) {
    assert.ok(productMap.includes(required), `canonical product map is missing ${required}`);
  }
});

test("every current page module has an explicit migration decision", () => {
  const pages = fs.readdirSync(pagesDir).filter((name) => name.endsWith(".jsx"));
  assert.ok(pages.length >= 30, "page inventory unexpectedly small");
  for (const page of pages) {
    assert.ok(migrationMatrix.includes(`\`${page}\``), `missing page decision for ${page}`);
  }
});

test("every current component module has an explicit migration decision", () => {
  const components = walk(componentsDir)
    .filter((file) => /\.(jsx|js)$/.test(file))
    .map((file) => path.relative(componentsDir, file).replaceAll(path.sep, "/"));
  assert.ok(components.length >= 30, "component inventory unexpectedly small");
  for (const component of components) {
    const basename = path.basename(component);
    const documentedName = basename === "index.js" ? "components/ui/index.js" : basename;
    assert.ok(componentDecisions.includes(`\`${documentedName}\``), `missing component decision for ${component}`);
  }
});

test("every current stylesheet has an explicit migration decision", () => {
  const styles = fs.readdirSync(stylesDir).filter((name) => name.endsWith(".css"));
  assert.ok(styles.length >= 20, "stylesheet inventory unexpectedly small");
  for (const style of styles) {
    assert.ok(cssMatrix.includes(`\`${style}\``), `missing CSS decision for ${style}`);
  }
});

test("canonical product map preserves account, campaign and editor ownership", () => {
  assert.match(productMap, /Unauthenticated users never see the campaign shell/i);
  assert.match(productMap, /Archive Entry Editor/i);
  assert.match(productMap, /one canonical/i);
});
