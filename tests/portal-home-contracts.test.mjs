import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("GM and player homes share the live campaign portal implementation", () => {
  const gm = read("apps/web/src/pages/GmHomePage.jsx");
  const player = read("apps/web/src/pages/PlayerHomePage.jsx");

  assert.match(gm, /CampaignPortalHome/);
  assert.match(gm, /variant="gm"/);
  assert.match(player, /CampaignPortalHome/);
  assert.match(player, /variant="player"/);
  assert.doesNotMatch(gm, /placeholder-page/);
  assert.doesNotMatch(player, /placeholder-page/);
});

test("portal homes load role-filtered archive data and expose resilient states", () => {
  const portal = read("apps/web/src/components/CampaignPortalHome.jsx");

  assert.match(portal, /api\.campaignArchive\(campaignId\)/);
  assert.match(portal, /state\.loading/);
  assert.match(portal, /state\.error/);
  assert.match(portal, /EmptyState/);
  assert.match(portal, /setReloadKey/);
  assert.match(portal, /Выбрать кампанию/);
  assert.match(portal, /Повторить/);
});

test("portal homes separate GM operations from player-safe destinations", () => {
  const portal = read("apps/web/src/components/CampaignPortalHome.jsx");

  assert.match(portal, /const gmActions = \[/);
  assert.match(portal, /to: "\/players"/);
  assert.match(portal, /to: "\/editor"/);
  assert.match(portal, /const playerActions = \[/);
  assert.match(portal, /title: "Мой персонаж"/);
  assert.match(portal, /title: "Мои заметки"/);
  assert.match(portal, /visibleRecentSections/);
  assert.match(portal, /archive\.counts/);
  assert.match(portal, /archive\.recent/);
});

test("recent archive entries keep direct article navigation", () => {
  const portal = read("apps/web/src/components/CampaignPortalHome.jsx");

  assert.match(portal, /if \(section === "entries" && item\.path\)/);
  assert.match(portal, /`\/page\/\$\{encodeURIComponent\(item\.path\)\}`/);
  assert.match(portal, /items\.slice\(0, 3\)/);
});
