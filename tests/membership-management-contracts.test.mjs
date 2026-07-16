import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("membership mutations are scoped to the exact campaign and preserve the owner", () => {
  const repository = read("apps/server/src/repositories/membershipManagementRepository.js");

  assert.match(repository, /_id: membershipObjectId, campaignId: campaignObjectId/);
  assert.match(repository, /target\.role === "owner"/);
  assert.match(repository, /role: \{ \$ne: "owner" \}/);
  assert.match(repository, /Membership role must be gm or player/);
  assert.match(repository, /status: "removed"/);
  assert.match(repository, /activeCampaignId: campaignObjectId/);
  assert.match(repository, /\$unset: \{ activeCampaignId: "", activeCampaignUpdatedAt: "" \}/);
});

test("membership routes enforce owner role changes and limited GM removals", () => {
  const routes = read("apps/server/src/routes/memberships.js");

  assert.match(routes, /membershipsRouter\.patch\("\/campaigns\/:campaignId\/memberships\/:membershipId"/);
  assert.match(routes, /requireOwner\(context\)/);
  assert.match(routes, /membershipsRouter\.delete\("\/campaigns\/:campaignId\/memberships\/:membershipId"/);
  assert.match(routes, /context\.role === "gm" && target\.role !== "player"/);
  assert.match(routes, /Use a dedicated leave-campaign flow to remove your own membership/);
  assert.match(routes, /memberships\.role\.change/);
  assert.match(routes, /memberships\.remove/);
});

test("pending invitations can be revoked only inside their campaign", () => {
  const repository = read("apps/server/src/repositories/membershipManagementRepository.js");
  const routes = read("apps/server/src/routes/memberships.js");

  assert.match(repository, /_id: invitationObjectId, campaignId: campaignObjectId/);
  assert.match(repository, /invitation\.status !== "pending"/);
  assert.match(repository, /status: "revoked"/);
  assert.match(routes, /invitationsRouter\.delete\("\/campaigns\/:campaignId\/invitations\/:invitationId"/);
  assert.match(routes, /invitations\.revoke/);
});
