import assert from "node:assert/strict";
import { statSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { APP_ROUTE_LIST, LEGACY_ROUTE_REDIRECTS } from "../apps/web/src/routing/appRoutes.js";
import { worldRoute } from "../apps/web/src/utils/worldContext.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function exists(file) {
  try { return statSync(file).isFile(); } catch { return false; }
}

function routePatternMatches(pattern, target) {
  const wildcard = pattern.endsWith("/*");
  const base = wildcard ? pattern.slice(0, -2) : pattern;
  const escaped = base.split("/")
    .map((segment) => segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("/");
  return new RegExp(`^${escaped}${wildcard ? "(?:/.*)?" : ""}$`).test(target);
}

async function listSourceFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(target);
    return /\.(?:js|jsx)$/.test(entry.name) ? [target] : [];
  }));
  return nested.flat();
}

async function reachableJavaScript(entryFile) {
  const seen = new Set();
  const queue = [entryFile];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const source = await fs.readFile(file, "utf8");
    const imports = [
      ...source.matchAll(/(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["']([^"']+)["']/g),
      ...source.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)
    ].map((match) => match[1]).filter((value) => value.startsWith("."));
    for (const specifier of imports) {
      const target = path.resolve(path.dirname(file), specifier);
      const resolved = [target, `${target}.js`, `${target}.jsx`, path.join(target, "index.js")].find(exists);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}

test("literal frontend transitions resolve to canonical routes or explicit legacy redirects", async () => {
  const routePatterns = [...APP_ROUTE_LIST.map((route) => route.pattern), ...LEGACY_ROUTE_REDIRECTS.map((route) => route.path)].filter((route) => route !== "*");
  const files = await listSourceFiles(path.join(root, "apps/web/src"));
  const targets = new Set();
  const patterns = [/\bto\s*=\s*["'](\/[^"']*)["']/g, /\bnavigate\(\s*["'](\/[^"']*)["']/g, /\b(?:to|primaryTo|path)\s*:\s*["'](\/[^"']*)["']/g, /\bscopedPath\(\s*["'](\/[^"']*)["']/g];
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    for (const pattern of patterns) for (const match of source.matchAll(pattern)) targets.add(match[1]);
    for (const match of source.matchAll(/\b(?:to\s*=\s*\{\s*|navigate\(\s*)`(\/[^`]*)`/g)) targets.add(match[1].replace(/\$\{[^}]+\}/g, "sample"));
  }
  const sampleWorld = worldRoute({ title: "Sample World" });
  for (const suffix of ["", "/maps", "/timeline", "/session", "/reveal", "/player"]) targets.add(`${sampleWorld}${suffix}`);
  const invalid = [...targets].filter((target) => !target.startsWith("/api")).map((target) => target.split(/[?#]/)[0]).filter((target) => !routePatterns.some((pattern) => routePatternMatches(pattern, target)));
  assert.deepEqual(invalid, []);
  assert.ok(targets.size >= 25, "transition inventory is unexpectedly small");
});

test("runtime source tree has no unreachable or versioned page implementation", async () => {
  const webSource = path.join(root, "apps/web/src");
  const serverSource = path.join(root, "apps/server/src");
  const [webFiles, serverFiles, reachableWeb, reachableServer] = await Promise.all([listSourceFiles(webSource), listSourceFiles(serverSource), reachableJavaScript(path.join(webSource, "main.jsx")), reachableJavaScript(path.join(serverSource, "index.js"))]);
  assert.deepEqual(webFiles.filter((file) => !reachableWeb.has(file)), []);
  assert.deepEqual(serverFiles.filter((file) => !reachableServer.has(file)), []);
  assert.deepEqual(webFiles.filter((file) => /V\d+\.jsx$/i.test(file)), []);
  for (const stale of ["App.jsx", "index.js", "entriesRepository.js", "characterImportService.js", "reveal.js"]) assert.equal(exists(path.join(root, stale)), false, `stale root duplicate remains: ${stale}`);
});

test("frontend performance and baseline accessibility contracts remain active", async () => {
  const webSource = path.join(root, "apps/web/src");
  const files = (await listSourceFiles(webSource)).filter((file) => file.endsWith(".jsx"));
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    for (const match of source.matchAll(/<button\b[\s\S]*?>/g)) assert.match(match[0], /\btype\s*=/, `${path.relative(root, file)} button needs type`);
    for (const match of source.matchAll(/<img\b[\s\S]*?>/g)) assert.match(match[0], /\balt\s*=/, `${path.relative(root, file)} image needs alt`);
  }
  const [app, shell, topbar, accessibility, vite] = await Promise.all([fs.readFile(path.join(webSource, "App.jsx"), "utf8"), fs.readFile(path.join(webSource, "components/ApplicationShell.jsx"), "utf8"), fs.readFile(path.join(webSource, "components/CodexTopbar.jsx"), "utf8"), fs.readFile(path.join(webSource, "styles/accessibility.css"), "utf8"), fs.readFile(path.join(root, "apps/web/vite.config.js"), "utf8")]);
  assert.match(app, /lazy\(\(\) => import\(/);
  assert.match(app, /<Suspense\b/);
  assert.doesNotMatch(app, /^import\s+\w+\s+from\s+["']\.\/pages\//m);
  assert.match(shell, /className="skip-link"/);
  assert.match(topbar, /aria-controls="campaign-sidebar"/);
  assert.match(accessibility, /prefers-reduced-motion/);
  assert.match(accessibility, /:focus-visible/);
  assert.match(vite, /react-vendor/);
});
