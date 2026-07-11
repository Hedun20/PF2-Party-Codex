import assert from "node:assert/strict";
import { statSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  changeScopePath,
  clearScopePath,
  scopedPath,
  shellModeFromLocation
} from "../apps/web/src/utils/shellContext.js";
import { worldRoute } from "../apps/web/src/utils/worldContext.js";
import { localIpv4Addresses } from "../apps/server/src/utils/network.js";
import { chooseActiveMembership } from "../apps/server/src/repositories/identityRepository.js";
import { playerSafeEntry } from "../apps/server/src/repositories/entriesRepository.js";
import { entryToCampaignPage } from "../apps/server/src/services/campaignContentService.js";
import { archiveRouter } from "../apps/server/src/routes/archive.js";
import { assetsRouter } from "../apps/server/src/routes/assets.js";
import { authRouter } from "../apps/server/src/routes/auth.js";
import { categoriesRouter } from "../apps/server/src/routes/categories.js";
import { campaignsRouter } from "../apps/server/src/routes/campaigns.js";
import { charactersRouter } from "../apps/server/src/routes/characters.js";
import { entriesRouter } from "../apps/server/src/routes/entries.js";
import { foundryRouter } from "../apps/server/src/routes/foundry.js";
import { healthRouter } from "../apps/server/src/routes/health.js";
import { importRouter } from "../apps/server/src/routes/import.js";
import { invitationsRouter, membershipsRouter } from "../apps/server/src/routes/memberships.js";
import { notesRouter } from "../apps/server/src/routes/notes.js";
import { onboardingRouter } from "../apps/server/src/routes/onboarding.js";
import { pagesRouter } from "../apps/server/src/routes/pages.js";
import { pf2Router } from "../apps/server/src/routes/pf2.js";
import { revealRouter } from "../apps/server/src/routes/reveal.js";
import { searchRouter } from "../apps/server/src/routes/search.js";
import { toolsRouter } from "../apps/server/src/routes/tools.js";
import { worldSystemsRouter } from "../apps/server/src/routes/worldSystems.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("shell modes stay stable across shared tools and role areas", () => {
  assert.equal(shellModeFromLocation("/archive", ""), "archive");
  assert.equal(shellModeFromLocation("/notes", "?mode=table"), "table");
  assert.equal(shellModeFromLocation("/players", ""), "management");
  assert.equal(shellModeFromLocation("/world/valdran/reveal", ""), "table");
});

test("scope changes preserve mode params from normalized legacy routes", () => {
  const nextWorld = { title: "Second World", path: "worlds/second-world.md" };
  assert.equal(
    changeScopePath("/world/valdran/reveal", "", nextWorld),
    "/handouts?mode=table&world=second-world"
  );
  assert.equal(
    clearScopePath("/world/valdran/reveal", "?world=valdran&note=1"),
    "/handouts?mode=table&note=1"
  );
  assert.equal(
    scopedPath("/notes?mode=table", nextWorld),
    "/notes?mode=table&world=second-world"
  );
});

test("frontend route table includes every stabilization entry point and a 404 fallback", async () => {
  const source = await fs.readFile(path.join(rootDir, "apps/web/src/App.jsx"), "utf8");
  const routeList = [...source.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]);
  const routes = new Set(routeList);
  const requiredRoutes = [
    "/", "/login", "/invite/:token", "/campaigns", "/archive", "/session-desk", "/dice",
    "/players", "/profile", "/settings", "/notes", "/handouts", "/maps",
    "/timeline", "/characters", "/sessions", "/editor", "/edit/:path",
    "/page/:path", "/category/:category/*", "/world/:worldSlug", "/guide",
    "/gm-tools", "/health", "/foundry", "*"
  ];
  for (const route of requiredRoutes) assert.ok(routes.has(route), `Missing frontend route: ${route}`);
  assert.equal(routeList.length, 37, "Unexpected frontend route count");
  assert.equal(routes.size, routeList.length, "Frontend route paths must be unique");
});

function routePatternMatches(pattern, target) {
  const wildcard = pattern.endsWith("/*");
  const basePattern = wildcard ? pattern.slice(0, -2) : pattern;
  const escaped = basePattern
    .split("/")
    .map((segment) => segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("/");
  const suffix = wildcard ? "(?:/.*)?" : "";
  return new RegExp(`^${escaped}${suffix}$`).test(target);
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
      const candidates = [target, `${target}.js`, `${target}.jsx`, path.join(target, "index.js")];
      const resolved = candidates.find((candidate) => fsSyncExists(candidate));
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}

function fsSyncExists(file) {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

test("literal frontend transitions resolve to declared routes", async () => {
  const appSource = await fs.readFile(path.join(rootDir, "apps/web/src/App.jsx"), "utf8");
  const routes = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((route) => route !== "*");
  const files = await listSourceFiles(path.join(rootDir, "apps/web/src"));
  const targets = new Set();
  const literalPatterns = [
    /\bto\s*=\s*["'](\/[^"']*)["']/g,
    /\bnavigate\(\s*["'](\/[^"']*)["']/g,
    /\b(?:to|primaryTo|path)\s*:\s*["'](\/[^"']*)["']/g,
    /\bscopedPath\(\s*["'](\/[^"']*)["']/g
  ];

  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    for (const pattern of literalPatterns) {
      for (const match of source.matchAll(pattern)) targets.add(match[1]);
    }
    for (const match of source.matchAll(/\b(?:to\s*=\s*\{\s*|navigate\(\s*)`(\/[^`]*)`/g)) {
      targets.add(match[1].replace(/\$\{[^}]+\}/g, "sample"));
    }
  }

  targets.add(worldRoute({ title: "Sample World" }));
  targets.add(`${worldRoute({ title: "Sample World" })}/maps`);
  targets.add(`${worldRoute({ title: "Sample World" })}/timeline`);
  targets.add(`${worldRoute({ title: "Sample World" })}/session`);
  targets.add(`${worldRoute({ title: "Sample World" })}/reveal`);
  targets.add(`${worldRoute({ title: "Sample World" })}/player`);

  const invalid = [...targets]
    .filter((target) => !target.startsWith("/api"))
    .map((target) => target.split(/[?#]/)[0])
    .filter((target) => !routes.some((route) => routePatternMatches(route, target)));
  assert.deepEqual(invalid, []);
  assert.ok(targets.size >= 25, "Transition inventory is unexpectedly small");
});

test("source tree has one canonical implementation per page and no unreachable runtime modules", async () => {
  const webSource = path.join(rootDir, "apps/web/src");
  const serverSource = path.join(rootDir, "apps/server/src");
  const [webFiles, serverFiles, reachableWeb, reachableServer] = await Promise.all([
    listSourceFiles(webSource),
    listSourceFiles(serverSource),
    reachableJavaScript(path.join(webSource, "main.jsx")),
    reachableJavaScript(path.join(serverSource, "index.js"))
  ]);
  assert.deepEqual(webFiles.filter((file) => !reachableWeb.has(file)), [], "Unreachable web source files should be removed");
  assert.deepEqual(serverFiles.filter((file) => !reachableServer.has(file)), [], "Unreachable server source files should be removed");
  assert.deepEqual(webFiles.filter((file) => /V\d+\.jsx$/i.test(file)), [], "Versioned page implementations must be consolidated into canonical files");
  for (const staleRootFile of ["App.jsx", "index.js", "entriesRepository.js", "characterImportService.js", "reveal.js"]) {
    assert.equal(fsSyncExists(path.join(rootDir, staleRootFile)), false, `Stale root duplicate remains: ${staleRootFile}`);
  }
});

const routerMounts = [
  ["/api", "healthRouter", "health.js", healthRouter],
  ["/api", "authRouter", "auth.js", authRouter],
  ["/api", "onboardingRouter", "onboarding.js", onboardingRouter],
  ["/api", "campaignsRouter", "campaigns.js", campaignsRouter],
  ["/api", "membershipsRouter", "memberships.js", membershipsRouter],
  ["/api", "invitationsRouter", "memberships.js", invitationsRouter],
  ["/api", "notesRouter", "notes.js", notesRouter],
  ["/api", "charactersRouter", "characters.js", charactersRouter],
  ["/api", "entriesRouter", "entries.js", entriesRouter],
  ["/api", "worldSystemsRouter", "worldSystems.js", worldSystemsRouter],
  ["/api", "importRouter", "import.js", importRouter],
  ["/api", "pagesRouter", "pages.js", pagesRouter],
  ["/api", "pf2Router", "pf2.js", pf2Router],
  ["/api", "revealRouter", "reveal.js", revealRouter],
  ["/api", "categoriesRouter", "categories.js", categoriesRouter],
  ["/api", "searchRouter", "search.js", searchRouter],
  ["/api", "foundryRouter", "foundry.js", foundryRouter],
  ["/api", "toolsRouter", "tools.js", toolsRouter],
  ["/api/campaigns/:campaignId/archive", "archiveRouter", "archive.js", archiveRouter],
  ["/api/archive", "archiveRouter", "archive.js", archiveRouter],
  ["/api", "assetsRouter", "assets.js", assetsRouter]
];

function joinMountedPath(prefix, routePath) {
  const base = prefix.replace(/\/$/, "");
  const suffix = String(routePath) === "/" ? "" : `/${String(routePath).replace(/^\//, "")}`;
  return `${base}${suffix}` || "/";
}

test("all backend route modules are mounted and endpoint signatures stay unique", async () => {
  const appSource = await fs.readFile(path.join(rootDir, "apps/server/src/app.js"), "utf8");
  const signatures = ["GET /api/session"];

  for (const [prefix, exportName, , router] of routerMounts) {
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(appSource, new RegExp(`app\\.use\\(\\s*["']${escapedPrefix}["']\\s*,\\s*${exportName}\\s*\\)`));
    for (const layer of router.stack) {
      if (!layer.route) continue;
      const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      for (const routePath of paths) {
        for (const method of Object.keys(layer.route.methods).filter((key) => layer.route.methods[key])) {
          signatures.push(`${method.toUpperCase()} ${joinMountedPath(prefix, routePath)}`);
        }
      }
    }
  }

  const routeFiles = (await fs.readdir(path.join(rootDir, "apps/server/src/routes")))
    .filter((name) => name.endsWith(".js"))
    .sort();
  const mountedFiles = [...new Set(routerMounts.map(([, , file]) => file))].sort();
  assert.deepEqual(routeFiles, mountedFiles, "Every route module must be mounted exactly through the route table");
  assert.equal(signatures.length, 92, "Unexpected backend endpoint count");
  assert.equal(new Set(signatures).size, signatures.length, "Backend endpoint signatures must be unique");
});

test("campaign selection prefers the saved active membership and safely falls back", () => {
  const memberships = [
    { id: "m1", campaignId: "campaign-a", status: "active" },
    { id: "m2", campaignId: "campaign-b", status: "active" },
    { id: "m3", campaignId: "campaign-c", status: "removed" }
  ];
  assert.equal(chooseActiveMembership(memberships, "campaign-b")?.id, "m2");
  assert.equal(chooseActiveMembership(memberships, "missing")?.id, "m1");
  assert.equal(chooseActiveMembership([memberships[2]], "campaign-c"), null);
});

test("campaign context is explicit across API requests and multi-campaign creation stays enabled", async () => {
  const [clientSource, sessionSource, identitySource, invitationSource] = await Promise.all([
    fs.readFile(path.join(rootDir, "apps/web/src/api/client.js"), "utf8"),
    fs.readFile(path.join(rootDir, "apps/server/src/services/sessionService.js"), "utf8"),
    fs.readFile(path.join(rootDir, "apps/server/src/repositories/identityRepository.js"), "utf8"),
    fs.readFile(path.join(rootDir, "apps/server/src/repositories/invitationsRepository.js"), "utf8")
  ]);
  assert.match(clientSource, /"X-Campaign-Id"/);
  assert.match(sessionSource, /x-campaign-id/i);
  assert.doesNotMatch(identitySource, /already has an active campaign membership/i);
  assert.match(invitationSource, /setActiveCampaignForUser/);
});

test("timeline API response keeps the frontend contract and compatibility alias", async () => {
  const source = await fs.readFile(path.join(rootDir, "apps/server/src/routes/worldSystems.js"), "utf8");
  assert.match(source, /timelineEvents:\s*events,\s*events,/);
});

test("LAN URL discovery cannot crash server startup", () => {
  assert.deepEqual(localIpv4Addresses(() => { throw new Error("network interfaces unavailable"); }), []);
  assert.deepEqual(localIpv4Addresses(() => ({
    loopback: [{ family: "IPv4", internal: true, address: "127.0.0.1" }],
    lan: [{ family: "IPv4", internal: false, address: "192.168.1.10" }]
  })), ["192.168.1.10"]);
});

function middlewareNames(router, routePath, method = "get") {
  const layer = router.stack.find((item) => item.route?.path === routePath && item.route?.methods?.[method]);
  assert.ok(layer, `Missing ${method.toUpperCase()} ${routePath}`);
  return layer.route.stack.map((item) => item.name);
}

test("campaign content reads require membership and GM metadata stays restricted", () => {
  for (const [router, routePath] of [
    [pagesRouter, "/pages"],
    [pagesRouter, "/page"],
    [pagesRouter, "/preview"],
    [categoriesRouter, "/categories"],
    [searchRouter, "/search"],
    [revealRouter, "/reveal"],
    [assetsRouter, "/assets/:file(*)"]
  ]) {
    assert.ok(middlewareNames(router, routePath).includes("requireCampaignMember"), `${routePath} must require campaign membership`);
  }
  assert.ok(middlewareNames(toolsRouter, "/metadata").includes("requireGm"), "/metadata must require GM access");
  assert.ok(middlewareNames(toolsRouter, "/assets/list").includes("requireGm"), "/assets/list must require GM access");
});

test("player entry serialization removes GM content, private metadata and hidden map objects", () => {
  const raw = {
    _id: "entry-1",
    campaignId: "campaign-a",
    title: "Safe page",
    path: "lore/safe-page.md",
    publicContent: "Visible text",
    gmContent: "The hidden villain",
    visibility: "public",
    status: "active",
    source: { kind: "vaultImport", originalPath: "private/source.md" },
    createdBy: "gm-user",
    updatedBy: "gm-user",
    metadata: {
      gmNotes: "never expose",
      frontmatter: {
        title: "Safe page",
        gmSecrets: "never expose",
        customPrivatePayload: { password: "never expose" },
        pins: [
          { id: "public-pin", label: "Town", visibility: "public" },
          { id: "secret-pin", label: "Lair", visibility: "gmOnly", gmNotes: "trap" }
        ]
      },
      mapObjects: [
        { id: "public-object", label: "Bridge", visibility: "revealed" },
        { id: "secret-object", label: "Ambush", visibility: "hidden", secret: "bandits" }
      ]
    }
  };
  const safe = playerSafeEntry(raw);
  assert.ok(safe);
  assert.equal(safe.gmContent, "");
  assert.equal(safe.source, undefined);
  assert.equal(safe.createdBy, undefined);
  assert.equal(safe.metadata.gmNotes, undefined);
  assert.equal(safe.metadata.frontmatter.gmSecrets, undefined);
  assert.equal(safe.metadata.frontmatter.customPrivatePayload, undefined);
  assert.deepEqual(safe.metadata.pins.map((item) => item.id), ["public-pin"]);
  assert.deepEqual(safe.metadata.mapObjects.map((item) => item.id), ["public-object"]);

  const page = entryToCampaignPage(safe, "player");
  assert.doesNotMatch(JSON.stringify(page), /hidden villain|never expose|Ambush|bandits|private\/source/i);
  assert.deepEqual(page.pins.map((item) => item.id), ["public-pin"]);
  assert.deepEqual(page.mapObjects.map((item) => item.id), ["public-object"]);
});

test("Mongo is the only live campaign store and browser content fallbacks stay disabled", async () => {
  const [notesSource, charactersSource, sessionDeskSource, revealSource, serverSource, importSource, authStoreSource] = await Promise.all([
    fs.readFile(path.join(rootDir, "apps/web/src/utils/playerNotes.js"), "utf8"),
    fs.readFile(path.join(rootDir, "apps/web/src/utils/playerCharacters.js"), "utf8"),
    fs.readFile(path.join(rootDir, "apps/web/src/pages/SessionModePage.jsx"), "utf8"),
    fs.readFile(path.join(rootDir, "apps/server/src/services/revealService.js"), "utf8"),
    fs.readFile(path.join(rootDir, "apps/server/src/index.js"), "utf8"),
    fs.readFile(path.join(rootDir, "apps/server/src/routes/import.js"), "utf8"),
    fs.readFile(path.join(rootDir, "apps/server/src/services/authStore.js"), "utf8")
  ]);
  assert.doesNotMatch(notesSource, /localStorage|browser fallback/i);
  assert.doesNotMatch(charactersSource, /localStorage|browser fallback/i);
  assert.doesNotMatch(sessionDeskSource, /localStorage|browser fallback/i);
  assert.match(sessionDeskSource, /api\.(?:createSession|updateSession)/);
  assert.doesNotMatch(revealSource, /new Map\s*\(/);
  assert.match(revealSource, /collections\.handouts/);
  assert.match(serverSource, /if \(!databaseStatus\.connected\)/);
  assert.doesNotMatch(importSource, /Vault remains the source of truth/i);
  assert.doesNotMatch(authStoreSource, /readJson|writeJson|USERS_FILE|legacyPublicUser|fallbackOnMongoUnavailable/);
  assert.match(authStoreSource, /requireMongoIdentity/);
});

test("registration copy matches Identity v2 and has no dead player-preview loop", async () => {
  const source = await fs.readFile(path.join(rootDir, "apps/web/src/pages/AuthPage.jsx"), "utf8");
  assert.doesNotMatch(source, /first registered account becomes|Create GM|Create player|Continue as player preview/i);
  assert.match(source, /workspace creation or an invitation/i);
  assert.match(source, /to="\/guide"/);
});

test("dev owner seed contains no committed identity or password and preserves existing user data", async () => {
  const source = await fs.readFile(path.join(rootDir, "apps/server/scripts/dev-create-owner-user.mjs"), "utf8");
  assert.match(source, /process\.env\.DEV_OWNER_EMAIL/);
  assert.match(source, /process\.env\.DEV_OWNER_PASSWORD/);
  assert.match(source, /DEV_OWNER_SEED_CONFIRM/);
  assert.doesNotMatch(source, /const\s+(?:email|password)\s*=\s*["'][^"']+["']/i);
  assert.doesNotMatch(source, /memberships\.deleteMany|users\.deleteOne/);
  assert.match(source, /Existing dev owner updated without changing userId/);
});

test("async Express route handlers expose next for centralized error handling", async () => {
  const routesDir = path.join(rootDir, "apps/server/src/routes");
  const files = (await fs.readdir(routesDir)).filter((name) => name.endsWith(".js"));
  for (const file of files) {
    const source = await fs.readFile(path.join(routesDir, file), "utf8");
    for (const match of source.matchAll(/\w+Router\.(?:get|post|put|patch|delete)\([^\n]*?async\s*\(([^)]*)\)\s*=>/g)) {
      const parameters = match[1].split(",").map((value) => value.trim()).filter(Boolean);
      assert.ok(parameters.length >= 3, `${file} has an async route without next: ${match[0]}`);
    }
  }
});
