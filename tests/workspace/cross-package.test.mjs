import assert from "node:assert/strict";
import test from "node:test";

import { createDiscordBoundaryProbe } from "@pf2-party-codex/discord-bot";
import { createFoundryBoundaryProbe } from "@pf2-party-codex/foundry-module";
import { createWorkerBoundaryProbe } from "@pf2-party-codex/worker";

const campaignId = "campaign-redacted-001";

test("one branded campaign contract crosses worker and connector runtime packages", () => {
  const worker = createWorkerBoundaryProbe(campaignId);
  const discord = createDiscordBoundaryProbe(campaignId);
  const foundry = createFoundryBoundaryProbe(campaignId, {
    connectorApiOrigin: "https://codex.example.test",
    systemId: "pf2e"
  });

  assert.equal(worker.campaignId, campaignId);
  assert.equal(worker.policyPortAvailable, true);
  assert.deepEqual([discord.mongoAccess, foundry.mongoAccess], ["none", "none"]);
  assert.equal(foundry.config.systemId, "pf2e");
});
