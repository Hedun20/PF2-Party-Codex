import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  APP_ROUTE_LIST,
  APP_ROUTES,
  LEGACY_ROUTE_REDIRECTS,
  breadcrumbsFor,
  buildAppPath,
  campaignHomePath,
  campaignIdFromPath,
  legacyTargetPath,
  navigationGroupsFor,
  parentPathFor,
  replaceCampaignIdInPath,
  routeForPath
} from "../apps/web/src/routing/appRoutes.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("canonical registry has unique route ownership", () => {
  const ids = APP_ROUTE_LIST.map((item) => item.id);
  const patterns = APP_ROUTE_LIST.map((item) => item.pattern);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(patterns).size, patterns.length);
  assert.equal(APP_ROUTES.campaignHome.scope, "campaign");
  assert.equal(APP_ROUTES.managePlayers.access, "manager");
  assert.equal(APP_ROUTES.login.scope, "public");
  assert.equal(APP_ROUTES.accountProfile.scope, "account");
});

test("campaign path builders encode and replace exact campaign context", () => {
  assert.equal(campaignHomePath("campaign/with space"), "/app/campaigns/campaign%2Fwith%20space/home");
  assert.equal(buildAppPath("archiveEntry", { campaignId: "c1", path: "lore/old road.md" }), "/app/campaigns/c1/archive/entries/lore%2Fold%20road.md");
  assert.equal(campaignIdFromPath("/app/campaigns/c1/archive/maps"), "c1");
  assert.equal(replaceCampaignIdInPath("/app/campaigns/c1/archive/maps", "c2"), "/app/campaigns/c2/archive/maps");
  assert.equal(replaceCampaignIdInPath("/app/account/profile", "c2"), "/app/campaigns/c2/home");
});

test("registry resolves deterministic parents and breadcrumbs", () => {
  const target = "/app/campaigns/c1/manage/archive-health/missing-links";
  assert.equal(routeForPath(target).definition.id, "manageMissingLinks");
  assert.equal(parentPathFor(target), "/app/campaigns/c1/manage/archive-health");
  assert.deepEqual(
    breadcrumbsFor(target, { campaignName: "Valdran" }).map((item) => item.id),
    ["campaignHome", "manageArchiveHealth", "manageMissingLinks"]
  );
});

test("navigation derives from role policy", () => {
  const guest = navigationGroupsFor({ signedIn: false });
  const account = navigationGroupsFor({ signedIn: true, hasCampaign: false });
  const player = navigationGroupsFor({ signedIn: true, hasCampaign: true, canManage: false });
  const manager = navigationGroupsFor({ signedIn: true, hasCampaign: true, canManage: true });
  assert.deepEqual(guest.flatMap((group) => group.routes.map((route) => route.id)), ["login", "help"]);
  assert.deepEqual(account.flatMap((group) => group.routes.map((route) => route.id)), ["campaignSelect", "accountProfile"]);
  assert.ok(!player.some((group) => group.id === "management"));
  assert.ok(manager.some((group) => group.id === "management"));
});

test("legacy URLs resolve only through explicit redirect contracts", () => {
  const patterns = LEGACY_ROUTE_REDIRECTS.map((item) => item.path);
  assert.equal(new Set(patterns).size, patterns.length);
  const maps = LEGACY_ROUTE_REDIRECTS.find((item) => item.path === "/maps");
  const worldTimeline = LEGACY_ROUTE_REDIRECTS.find((item) => item.path === "/world/:worldSlug/timeline");
  const characters = LEGACY_ROUTE_REDIRECTS.find((item) => item.path === "/characters");
  assert.equal(legacyTargetPath(maps, { campaignId: "c1", canManage: true }), "/app/campaigns/c1/archive/maps");
  assert.equal(legacyTargetPath(worldTimeline, { campaignId: "c1", canManage: true, params: { worldSlug: "valdran" } }), "/app/campaigns/c1/archive/timeline?world=valdran");
  assert.equal(legacyTargetPath(characters, { campaignId: "c1", canManage: false }), "/app/campaigns/c1/my-character");
  assert.equal(legacyTargetPath(characters, { campaignId: "c1", canManage: true }), "/app/campaigns/c1/manage/characters");
});

test("runtime mounts one application shell and registry-driven navigation", () => {
  const app = read("apps/web/src/App.jsx");
  const shell = read("apps/web/src/components/ApplicationShell.jsx");
  const sidebar = read("apps/web/src/components/CodexSidebar.jsx");
  const topbar = read("apps/web/src/components/CodexTopbar.jsx");
  const back = read("apps/web/src/components/PageBackButton.jsx");
  assert.match(app, /import ApplicationShell/);
  assert.match(app, /<ApplicationShell/);
  assert.doesNotMatch(app, /FantasyShell|<AppShell/);
  assert.equal(fs.existsSync(path.join(root, "apps/web/src/components/FantasyShell.jsx")), false);
  assert.equal(fs.existsSync(path.join(root, "apps/web/src/components/AppShell.jsx")), false);
  assert.match(shell, /routeScopeFromPath/);
  assert.match(shell, /RouteBreadcrumbs/);
  assert.match(sidebar, /navigationGroupsFor/);
  assert.match(sidebar, /routeForPath/);
  assert.match(topbar, /replaceCampaignIdInPath/);
  assert.match(back, /parentPathFor/);
  assert.doesNotMatch(sidebar, /const codexSections|shellModeFromLocation|modeHome/);
  assert.doesNotMatch(topbar, /shellModeFromLocation|changeMode/);
});

test("campaign scope gate blocks stale campaign rendering while activation runs", () => {
  const gate = read("apps/web/src/routing/CampaignScopeGate.jsx");
  assert.match(gate, /requestedCampaignId !== activeCampaignId/);
  assert.match(gate, /hasRequestedCampaign/);
  assert.match(gate, /<RouteLoading/);
  assert.match(gate, /return denied/);
});
