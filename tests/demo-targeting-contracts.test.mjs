import assert from "node:assert/strict";
import test from "node:test";
import {
  managerCampaignIdsForUser,
  mergeCampaignCandidates
} from "../apps/server/scripts/demoCampaignTargeting.mjs";

const userId = "66a000000000000000000001";

test("demo targeting accepts only active owner and GM memberships for the selected user", () => {
  const memberships = [
    { userId, campaignId: "campaign-owner", role: "owner", status: "active" },
    { userId, campaignId: "campaign-gm", role: "gm", status: "active" },
    { userId, campaignId: "campaign-player", role: "player", status: "active" },
    { userId, campaignId: "campaign-removed", role: "owner", status: "removed" },
    { userId: "different-user", campaignId: "qa-campaign", role: "owner", status: "active" },
    { userId, campaignId: "campaign-gm", role: "gm", status: "active" }
  ];

  assert.deepEqual(
    managerCampaignIdsForUser(memberships, userId),
    ["campaign-owner", "campaign-gm"]
  );
});

test("demo targeting merges directly owned and membership campaigns without duplicates", () => {
  const directlyOwned = [
    { _id: "campaign-owner", name: "Owned campaign" }
  ];
  const membershipCampaigns = [
    { _id: "campaign-owner", name: "Owned campaign duplicate" },
    { _id: "campaign-gm", name: "GM campaign" }
  ];

  assert.deepEqual(
    mergeCampaignCandidates(directlyOwned, membershipCampaigns).map((campaign) => campaign._id),
    ["campaign-owner", "campaign-gm"]
  );
});
