import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("ownership transfer is exact-campaign scoped and rejects self or unlinked targets", () => {
  const repository = read("apps/server/src/repositories/membershipManagementRepository.js");
  const start = repository.indexOf("export async function transferCampaignOwnership");
  const end = repository.indexOf("export async function leaveCampaignMembership", start);
  const transfer = repository.slice(start, end);

  assert.ok(start >= 0, "transferCampaignOwnership must exist");
  assert.match(transfer, /campaignId: campaignObjectId, userId: currentUserObjectId, status: "active"/);
  assert.match(transfer, /_id: targetMembershipObjectId, campaignId: campaignObjectId, status: "active"/);
  assert.match(transfer, /Choose an active campaign member with a linked account/);
  assert.match(transfer, /Choose another campaign member as the new owner/);
  assert.match(transfer, /currentMembership\.role !== "owner"/);
  assert.match(transfer, /Only the current campaign owner can transfer ownership/);
});

test("ownership transfer uses compare-and-set campaign pointer and records retry identity", () => {
  const repository = read("apps/server/src/repositories/membershipManagementRepository.js");
  const start = repository.indexOf("export async function transferCampaignOwnership");
  const end = repository.indexOf("export async function leaveCampaignMembership", start);
  const transfer = repository.slice(start, end);

  assert.match(transfer, /role: "owner"/);
  assert.match(transfer, /ownerUserId: currentUserObjectId/);
  assert.match(transfer, /ownerUserId: targetMembership\.userId/);
  assert.match(transfer, /ownershipTransferLast:/);
  assert.match(transfer, /fromUserId: currentUserObjectId/);
  assert.match(transfer, /toMembershipId: targetMembership\._id/);
  assert.match(transfer, /Campaign ownership changed in another request\. Refresh before trying again/);
  assert.match(transfer, /OWNERSHIP_CHANGED/);
});

test("losing ownership race compensates target role and completed retry reconciles old owner", () => {
  const repository = read("apps/server/src/repositories/membershipManagementRepository.js");
  const start = repository.indexOf("export async function transferCampaignOwnership");
  const end = repository.indexOf("export async function leaveCampaignMembership", start);
  const transfer = repository.slice(start, end);

  assert.match(transfer, /previousTargetRole/);
  assert.match(transfer, /role: previousTargetRole/);
  assert.match(transfer, /retryOfCompletedTransfer/);
  assert.match(transfer, /role: "gm"/);
  assert.match(transfer, /idempotent: true/);
  assert.match(transfer, /OWNERSHIP_RECONCILE_REQUIRED/);
});

test("ownership transfer route audits only the first completed transfer", () => {
  const routes = read("apps/server/src/routes/campaigns.js");
  const start = routes.indexOf('campaignsRouter.post("/campaigns/:campaignId/ownership/transfer"');
  const route = routes.slice(start);

  assert.ok(start >= 0, "ownership transfer route must exist");
  assert.match(route, /targetMembershipId/);
  assert.match(route, /transferCampaignOwnership\(/);
  assert.match(route, /currentUserId: userId\(req\)/);
  assert.match(route, /if \(!transfer\.idempotent\)/);
  assert.match(route, /action: "campaigns\.ownership\.transfer"/);
  assert.match(route, /newOwnerMembershipId/);
});

test("settings provides an actionable two-step ownership recovery before leave", () => {
  const settings = read("apps/web/src/pages/SettingsPage.jsx");
  const client = read("apps/web/src/api/client.js");

  assert.match(client, /transferCampaignOwnership: \(campaignId, targetMembershipId\)/);
  assert.match(client, /\/ownership\/transfer/);
  assert.match(settings, /api\.campaignMemberships\(campaignId\)/);
  assert.match(settings, /Новый владелец/);
  assert.match(settings, /setTransferConfirming\(true\)/);
  assert.match(settings, /Да, передать владение/);
  assert.match(settings, /api\.transferCampaignOwnership\(campaignId, targetMembershipId\)/);
  assert.match(settings, /window\.location\.assign\("\/settings"\)/);
  assert.match(settings, /Список участников недоступен/);
  assert.match(settings, /Некому передать владение/);
  assert.match(settings, /to="\/players"/);
});
