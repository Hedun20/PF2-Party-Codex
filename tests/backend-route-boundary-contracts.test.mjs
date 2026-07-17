import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chooseActiveMembership } from "../apps/server/src/repositories/identityRepository.js";
import { archiveRouter } from "../apps/server/src/routes/archive.js";
import { assetsRouter } from "../apps/server/src/routes/assets.js";
import { authRouter } from "../apps/server/src/routes/auth.js";
import { campaignsRouter } from "../apps/server/src/routes/campaigns.js";
import { categoriesRouter } from "../apps/server/src/routes/categories.js";
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
import { platformRouter } from "../apps/server/src/routes/platform.js";
import { revealRouter } from "../apps/server/src/routes/reveal.js";
import { searchRouter } from "../apps/server/src/routes/search.js";
import { subscriptionRouter } from "../apps/server/src/routes/subscription.js";
import { toolsRouter } from "../apps/server/src/routes/tools.js";
import { worldSystemsRouter } from "../apps/server/src/routes/worldSystems.js";
import { localIpv4Addresses } from "../apps/server/src/utils/network.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routerMounts = [
  ["/api", "healthRouter", "health.js", healthRouter], ["/api", "authRouter", "auth.js", authRouter],
  ["/api", "onboardingRouter", "onboarding.js", onboardingRouter], ["/api", "campaignsRouter", "campaigns.js", campaignsRouter],
  ["/api", "membershipsRouter", "memberships.js", membershipsRouter], ["/api", "invitationsRouter", "memberships.js", invitationsRouter],
  ["/api", "notesRouter", "notes.js", notesRouter], ["/api", "charactersRouter", "characters.js", charactersRouter],
  ["/api", "entriesRouter", "entries.js", entriesRouter], ["/api", "worldSystemsRouter", "worldSystems.js", worldSystemsRouter],
  ["/api", "importRouter", "import.js", importRouter], ["/api", "pagesRouter", "pages.js", pagesRouter],
  ["/api", "pf2Router", "pf2.js", pf2Router], ["/api", "subscriptionRouter", "subscription.js", subscriptionRouter],
  ["/api", "platformRouter", "platform.js", platformRouter], ["/api", "revealRouter", "reveal.js", revealRouter],
  ["/api", "categoriesRouter", "categories.js", categoriesRouter], ["/api", "searchRouter", "search.js", searchRouter],
  ["/api", "foundryRouter", "foundry.js", foundryRouter], ["/api", "toolsRouter", "tools.js", toolsRouter],
  ["/api/campaigns/:campaignId/archive", "archiveRouter", "archive.js", archiveRouter], ["/api/archive", "archiveRouter", "archive.js", archiveRouter],
  ["/api", "assetsRouter", "assets.js", assetsRouter]
];

function joined(prefix, routePath) {
  const base = prefix.replace(/\/$/, "");
  const suffix = String(routePath) === "/" ? "" : `/${String(routePath).replace(/^\//, "")}`;
  return `${base}${suffix}` || "/";
}

function middlewareNames(router, routePath, method = "get") {
  const layer = router.stack.find((item) => item.route?.path === routePath && item.route?.methods?.[method]);
  assert.ok(layer, `missing ${method.toUpperCase()} ${routePath}`);
  return layer.route.stack.map((item) => item.name);
}

test("all backend route modules are mounted and endpoint signatures remain unique", async () => {
  const app = await fs.readFile(path.join(root, "apps/server/src/app.js"), "utf8");
  const signatures = ["GET /api/session"];
  for (const [prefix, exportName, , router] of routerMounts) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(app, new RegExp(`app\\.use\\(\\s*["']${escaped}["']\\s*,\\s*${exportName}\\s*\\)`));
    for (const layer of router.stack) {
      if (!layer.route) continue;
      for (const routePath of Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path]) {
        for (const method of Object.keys(layer.route.methods).filter((key) => layer.route.methods[key])) signatures.push(`${method.toUpperCase()} ${joined(prefix, routePath)}`);
      }
    }
  }
  const routeFiles = (await fs.readdir(path.join(root, "apps/server/src/routes"))).filter((name) => name.endsWith(".js")).sort();
  const mountedFiles = [...new Set(routerMounts.map(([, , file]) => file))].sort();
  assert.deepEqual(routeFiles, mountedFiles);
  assert.equal(signatures.length, 97);
  assert.equal(new Set(signatures).size, signatures.length);
});

test("campaign selection prefers saved active membership and safely falls back", () => {
  const memberships = [
    { id: "m1", campaignId: "campaign-a", status: "active" },
    { id: "m2", campaignId: "campaign-b", status: "active" },
    { id: "m3", campaignId: "campaign-c", status: "removed" }
  ];
  assert.equal(chooseActiveMembership(memberships, "campaign-b")?.id, "m2");
  assert.equal(chooseActiveMembership(memberships, "missing")?.id, "m1");
  assert.equal(chooseActiveMembership([memberships[2]], "campaign-c"), null);
});

test("campaign content reads and platform routes keep their middleware boundaries", () => {
  for (const [router, routePath] of [
    [pagesRouter, "/pages"], [pagesRouter, "/page"], [pagesRouter, "/preview"],
    [categoriesRouter, "/categories"], [searchRouter, "/search"], [revealRouter, "/reveal"], [assetsRouter, "/assets/:file(*)"]
  ]) assert.ok(middlewareNames(router, routePath).includes("requireCampaignMember"), `${routePath} must require membership`);
  assert.ok(middlewareNames(toolsRouter, "/metadata").includes("requireGm"));
  assert.ok(middlewareNames(toolsRouter, "/assets/list").includes("requireGm"));
  assert.ok(middlewareNames(subscriptionRouter, "/subscription").includes("requireCampaignMember"));
  assert.ok(middlewareNames(platformRouter, "/platform/status").includes("requirePlatformAdmin"));
  assert.ok(middlewareNames(healthRouter, "/health/identity").includes("requirePlatformAdmin"));
});

test("timeline compatibility, LAN discovery and centralized async errors remain protected", async () => {
  const timeline = await fs.readFile(path.join(root, "apps/server/src/routes/worldSystems.js"), "utf8");
  assert.match(timeline, /timelineEvents:\s*events,\s*events,/);
  assert.deepEqual(localIpv4Addresses(() => { throw new Error("unavailable"); }), []);
  assert.deepEqual(localIpv4Addresses(() => ({ lan: [{ family: "IPv4", internal: false, address: "192.168.1.10" }] })), ["192.168.1.10"]);
  for (const file of (await fs.readdir(path.join(root, "apps/server/src/routes"))).filter((name) => name.endsWith(".js"))) {
    const source = await fs.readFile(path.join(root, "apps/server/src/routes", file), "utf8");
    for (const match of source.matchAll(/\w+Router\.(?:get|post|put|patch|delete)\([^\n]*?async\s*\(([^)]*)\)\s*=>/g)) {
      assert.ok(match[1].split(",").map((value) => value.trim()).filter(Boolean).length >= 3, `${file} async route needs next`);
    }
  }
});
