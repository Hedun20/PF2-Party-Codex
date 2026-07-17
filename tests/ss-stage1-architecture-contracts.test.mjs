import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const appPath = path.join(root, "apps", "web", "src", "App.jsx");
const pagesDir = path.join(root, "apps", "web", "src", "pages");
const componentsDir = path.join(root, "apps", "web", "src", "components");
const stylesDir = path.join(root, "apps", "web", "src", "styles");
const migrationMatrix = fs.readFileSync(path.join(root, "docs", "ss-stage1", "MIGRATION_MATRIX.md"), "utf8");
const cssMatrix = fs.readFileSync(path.join(root, "docs", "ss-stage1", "CSS_MIGRATION_MATRIX.md"), "utf8");
const productMap = fs.readFileSync(path.join(root, "docs", "ss-stage1", "PRODUCT_MAP.md"), "utf8");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

test("every current runtime route has an explicit migration decision", () => {
  const app = fs.readFileSync(appPath, "utf8");
  const routes = [...app.matchAll(/<Route\s+path=["']([^"']+)["']/g)].map((match) => match[1]);
  assert.ok(routes.length >= 30, "route inventory unexpectedly small");
  for (const route of routes) {
    assert.ok(migrationMatrix.includes("| `" + route + "` |"), `missing route decision for ${route}`);
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
    assert.ok(migrationMatrix.includes(`\`${documentedName}\``), `missing component decision for ${component}`);
  }
});

test("every current stylesheet has an explicit migration decision", () => {
  const styles = fs.readdirSync(stylesDir).filter((name) => name.endsWith(".css"));
  assert.ok(styles.length >= 20, "stylesheet inventory unexpectedly small");
  for (const style of styles) {
    assert.ok(cssMatrix.includes(`\`${style}\``), `missing CSS decision for ${style}`);
  }
});

test("canonical product map is campaign-scoped and separates product areas", () => {
  assert.ok(productMap.includes("/app/campaigns/:campaignId/home"));
  assert.ok(productMap.includes("/app/campaigns/:campaignId/archive"));
  assert.ok(productMap.includes("/app/campaigns/:campaignId/session"));
  assert.ok(productMap.includes("/app/campaigns/:campaignId/manage/players"));
  assert.ok(productMap.includes("/app/account/profile"));
  assert.match(productMap, /Unauthenticated users never see the campaign shell/i);
  assert.match(productMap, /Archive Entry Editor/i);
});
