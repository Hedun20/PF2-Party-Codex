import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("campaign exit is exact-scoped, idempotent, concurrency-aware, and owner-safe", () => {
  const repository = read("apps/server/src/repositories/membershipManagementRepository.js");
  const start = repository.indexOf("export async function leaveCampaignMembership");
  const end = repository.indexOf("export async function revokeCampaignInvitation", start);
  const leave = repository.slice(start, end);

  assert.ok(start >= 0, "leaveCampaignMembership must exist");
  assert.match(leave, /campaignId: campaignObjectId, userId: userObjectId/);
  assert.match(leave, /target\.status === "removed"/);
  assert.match(leave, /idempotent: true/);
  assert.match(leave, /target\.role === "owner"/);
  assert.match(leave, /Transfer campaign ownership before leaving this campaign/);
  assert.match(leave, /OWNERSHIP_TRANSFER_REQUIRED/);
  assert.match(leave, /status: "active"/);
  assert.match(leave, /role: \{ \$ne: "owner" \}/);
  assert.match(leave, /removedReason: "left"/);
  assert.match(leave, /activeCampaignId: campaignObjectId/);
  assert.match(leave, /\$unset: \{ activeCampaignId: "", activeCampaignUpdatedAt: "" \}/);
  assert.match(leave, /Campaign membership changed before it could be left\. Refresh and retry/);
});

test("leave route returns a repaired campaign context and audits only the real transition", () => {
  const routes = read("apps/server/src/routes/memberships.js");
  const start = routes.indexOf('membershipsRouter.post("/campaigns/:campaignId/leave"');
  const end = routes.indexOf('invitationsRouter.get("/campaigns/:campaignId/invitations"', start);
  const leaveRoute = routes.slice(start, end);

  assert.ok(start >= 0, "dedicated leave route must exist");
  assert.match(leaveRoute, /requireUser\(req\)/);
  assert.match(leaveRoute, /leaveCampaignMembership\(/);
  assert.match(leaveRoute, /userId: req\.user\?\._id \|\| req\.user\?\.id/);
  assert.match(leaveRoute, /if \(!left\.idempotent\)/);
  assert.match(leaveRoute, /action: "memberships\.leave"/);
  assert.match(leaveRoute, /identityContextForUser\(req\.user\)/);
  assert.match(leaveRoute, /listUserCampaigns\(req\.user\)/);
  assert.match(leaveRoute, /activeCampaign: nextContext\.activeCampaign \|\| null/);
  assert.match(leaveRoute, /activeMembership: nextContext\.activeMembership \|\| null/);
});

test("browser client treats server campaign context as authoritative after leaving", () => {
  const client = read("apps/web/src/api/client.js");
  const start = client.indexOf("leaveCampaign: async");
  const end = client.indexOf("pages:", start);
  const leaveClient = client.slice(start, end);

  assert.ok(start >= 0, "client leaveCampaign action must exist");
  assert.match(leaveClient, /\/campaigns\/\$\{encodeURIComponent\(campaignId\)\}\/leave/);
  assert.match(leaveClient, /method: "POST"/);
  assert.match(leaveClient, /setActiveCampaignId\(data\.activeCampaign\?\.id \|\| ""\)/);
});

test("settings gives non-owner members explicit confirmation, failure recovery, and a safe destination", () => {
  const settings = read("apps/web/src/pages/SettingsPage.jsx");

  assert.match(settings, /role !== "owner"/);
  assert.match(settings, /setLeaveConfirming\(true\)/);
  assert.match(settings, /Подтвердите выход/);
  assert.match(settings, /api\.leaveCampaign\(campaignId\)/);
  assert.match(settings, /window\.location\.assign\(result\.activeCampaign\?\.id \? "\/" : "\/campaigns"\)/);
  assert.match(settings, /Ваш доступ считается сохранённым, пока сервер не подтвердит выход/);
  assert.match(settings, /Владелец не может просто покинуть кампанию/);
  assert.match(settings, /Сначала необходимо передать владение другому активному участнику/);
  assert.match(settings, /disabled=\{leaving \|\| leaveCommitted\}/);
});

test("campaign selection still rejects a campaign without an exact active membership", () => {
  const identity = read("apps/server/src/repositories/identityRepository.js");
  const start = identity.indexOf("export async function setActiveCampaignForUser");
  const end = identity.indexOf("export async function activateMembershipForInvitation", start);
  const activate = identity.slice(start, end);

  assert.match(activate, /identityContextForCampaign\(user, campaignId\)/);
  assert.match(activate, /if \(!context\.activeMembership\?\.id\)/);
  assert.match(activate, /No active membership found for the requested campaign/);
  assert.match(activate, /activeCampaignId: selectedCampaignId/);
});
