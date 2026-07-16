import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("API errors expose HTTP status for access reconciliation", () => {
  const client = read("apps/web/src/api/client.js");

  assert.match(client, /error\.status = response\.status/);
  assert.match(client, /error\.requestId = payload\.requestId/);
});

test("app reconciles expired sessions, removed memberships and role changes", () => {
  const app = read("apps/web/src/App.jsx");

  assert.match(app, /function shouldReconcileCampaign\(error\)/);
  assert.match(app, /status === 401 \|\| status === 403/);
  assert.match(app, /const reconcileCampaignContext = async/);
  assert.match(app, /await reconcileCampaignContext\(sessionOverride\)/);
  assert.match(app, /navigate\("\/login", \{ replace: true \}\)/);
  assert.match(app, /navigate\("\/campaigns", \{ replace: true \}\)/);
  assert.match(app, /previousCampaignId && nextCampaignId !== previousCampaignId/);
  assert.match(app, /previousRole && nextRole !== previousRole/);
  assert.match(app, /campaignNotice=\{campaignNotice\}/);
});

test("campaign switching reports failures instead of silently swallowing them", () => {
  const app = read("apps/web/src/App.jsx");
  const topbar = read("apps/web/src/components/CodexTopbar.jsx");
  const shell = read("apps/web/src/components/FantasyShell.jsx");

  assert.match(app, /Не удалось переключить кампанию/);
  assert.match(app, /setCampaignSwitching\(false\)/);
  assert.match(shell, /props\.campaignNotice\?\.message/);
  assert.match(shell, /StatusMessage/);
  assert.match(topbar, /currentCampaignListed/);
  assert.match(topbar, /hasAlternativeCampaign/);
  assert.match(topbar, /aria-busy=\{campaignSwitching\}/);
  assert.match(topbar, /Нет доступных кампаний/);
});

test("deep campaign routes still fall through to the SPA entry", () => {
  const server = read("apps/server/src/app.js");

  assert.match(server, /app\.get\("\*"/);
  assert.match(server, /sendFile\(path\.join\(webDist, "index\.html"\)/);
});
