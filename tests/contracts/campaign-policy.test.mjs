import assert from "node:assert/strict";
import test from "node:test";

import {
  CAMPAIGN_POLICY_VERSION,
  authorizeHumanCampaignAction,
  authorizeMachineCampaignCapability,
  buildCampaignPolicyCacheKey,
  deriveCampaignReadScope,
  evaluateCampaignResourceRead
} from "../../packages/core/dist/index.js";
import { assertDeniedBoundary } from "../security/support/security-assertions.mjs";

const evaluatedAt = "2026-08-23T12:00:00.000Z";

function human(overrides = {}) {
  return {
    kind: "human",
    userId: "user-a",
    workspaceId: "workspace-a",
    campaignId: "campaign-a",
    membershipId: "membership-a",
    role: "player",
    membershipState: "active",
    membershipExpiresAt: null,
    membershipUpdatedAt: "2026-08-23T10:00:00.000Z",
    assignedCharacterIds: ["character-a"],
    characterGrantVersion: "character-grants-v1",
    ...overrides
  };
}

function humanRequest(action, channel = "web", overrides = {}) {
  return {
    channel,
    action,
    workspaceId: "workspace-a",
    campaignId: "campaign-a",
    ...overrides
  };
}

function machine(overrides = {}) {
  return {
    kind: "machine",
    principalKind: "service",
    principalId: "service-a",
    workspaceId: "workspace-a",
    campaignId: "campaign-a",
    credentialState: "active",
    credentialVersion: "credential-v1",
    capabilities: ["job:execute", "notification:deliver", "archive:read:party"],
    ...overrides
  };
}

function machineRequest(capability, channel, overrides = {}) {
  return {
    capability,
    channel,
    workspaceId: "workspace-a",
    campaignId: "campaign-a",
    ...overrides
  };
}

function resource(overrides = {}) {
  return {
    workspaceId: "workspace-a",
    campaignId: "campaign-a",
    editorialState: "active",
    audience: "party",
    releaseState: "public",
    contentClass: "approvedCanon",
    explicitUserIds: [],
    explicitCharacterIds: [],
    ...overrides
  };
}

function assertSecurityDenial(id, expectedCode, decision) {
  assertDeniedBoundary({ id, expectedCode, forbiddenValues: [] }, decision);
}

test("exact tenant scope and active membership are mandatory before every human action", () => {
  const crossCampaign = authorizeHumanCampaignAction(
    human(),
    humanRequest("campaign.read", "web", { campaignId: "campaign-b" }),
    evaluatedAt
  );
  assertSecurityDenial("hed21.cross-campaign", "TENANT_MISMATCH", crossCampaign);

  for (const membershipState of ["removed", "invited"]) {
    assert.deepEqual(
      authorizeHumanCampaignAction(human({ membershipState }), humanRequest("campaign.read"), evaluatedAt),
      { allowed: false, code: "MEMBERSHIP_INACTIVE", policyVersion: CAMPAIGN_POLICY_VERSION }
    );
  }
  assert.equal(
    authorizeHumanCampaignAction(human({ membershipState: "expired" }), humanRequest("campaign.read"), evaluatedAt).code,
    "MEMBERSHIP_EXPIRED"
  );
  assert.equal(
    authorizeHumanCampaignAction(
      human({ membershipExpiresAt: "2026-08-23T11:59:59.000Z" }),
      humanRequest("campaign.read"),
      evaluatedAt
    ).code,
    "MEMBERSHIP_EXPIRED"
  );
});

test("owner and GM memberships are managers while campaign deletion remains owner-only", () => {
  for (const role of ["owner", "gm"]) {
    assert.equal(
      authorizeHumanCampaignAction(human({ role }), humanRequest("canon.approve"), evaluatedAt).effect,
      "manager"
    );
    assert.equal(
      authorizeHumanCampaignAction(
        human({ role }),
        humanRequest("discord.command.gm", "discord"),
        evaluatedAt
      ).allowed,
      true
    );
  }
  assert.equal(
    authorizeHumanCampaignAction(human({ role: "owner" }), humanRequest("campaign.delete"), evaluatedAt).allowed,
    true
  );
  assert.equal(
    authorizeHumanCampaignAction(human({ role: "gm" }), humanRequest("campaign.delete"), evaluatedAt).code,
    "ROLE_REQUIRED"
  );
  assert.equal(
    authorizeHumanCampaignAction(human(), humanRequest("campaign.manage"), evaluatedAt).code,
    "ROLE_REQUIRED"
  );
});

test("player writes, character reads and per-character Ask require exact ownership grants", () => {
  assert.equal(
    authorizeHumanCampaignAction(
      human(),
      humanRequest("resource.write", "web", { resourceOwnerUserId: "user-a" }),
      evaluatedAt
    ).effect,
    "self"
  );
  assert.equal(
    authorizeHumanCampaignAction(
      human(),
      humanRequest("resource.write", "web", { resourceOwnerUserId: "user-b" }),
      evaluatedAt
    ).code,
    "OWNERSHIP_REQUIRED"
  );

  for (const [action, channel] of [
    ["character.read", "web"],
    ["character.write", "web"],
    ["character.ask", "ai"]
  ]) {
    assert.equal(
      authorizeHumanCampaignAction(
        human(),
        humanRequest(action, channel, { targetCharacterId: "character-a" }),
        evaluatedAt
      ).effect,
      "self"
    );
    assert.equal(
      authorizeHumanCampaignAction(
        human(),
        humanRequest(action, channel, { targetCharacterId: "character-b" }),
        evaluatedAt
      ).code,
      "CHARACTER_SCOPE_DENIED"
    );
  }
});

test("player resource visibility separates approved canon from raw, secret and hidden evidence", () => {
  for (const releaseState of ["public", "revealed"]) {
    assert.equal(
      evaluateCampaignResourceRead(human(), resource({ releaseState }), evaluatedAt).effect,
      "playerSafe"
    );
  }
  for (const [overrides, expectedCode] of [
    [{ editorialState: "draft" }, "RESOURCE_NOT_ACTIVE"],
    [{ editorialState: "needsReview" }, "RESOURCE_NOT_ACTIVE"],
    [{ releaseState: "hidden" }, "RESOURCE_HIDDEN"],
    [{ audience: "gmOnly" }, "ROLE_REQUIRED"],
    [{ contentClass: "rawEvidence" }, "RESOURCE_SENSITIVE"],
    [{ contentClass: "secretCheck" }, "RESOURCE_SENSITIVE"],
    [{ contentClass: "hiddenAchievement" }, "RESOURCE_SENSITIVE"]
  ]) {
    assert.equal(evaluateCampaignResourceRead(human(), resource(overrides), evaluatedAt).code, expectedCode);
  }

  const gmDecision = evaluateCampaignResourceRead(
    human({ role: "gm" }),
    resource({ editorialState: "needsReview", audience: "gmOnly", releaseState: "hidden", contentClass: "rawEvidence" }),
    evaluatedAt
  );
  assert.deepEqual(gmDecision, {
    allowed: true,
    code: "POLICY_ALLOWED",
    effect: "manager",
    policyVersion: CAMPAIGN_POLICY_VERSION
  });
});

test("specific-player and character-knowledge grants never cross subjects", () => {
  const byUser = resource({
    audience: "specificPlayers",
    releaseState: "revealed",
    explicitUserIds: ["user-a"]
  });
  const byCharacter = resource({
    audience: "specificPlayers",
    releaseState: "revealed",
    explicitCharacterIds: ["character-a"]
  });
  assert.equal(evaluateCampaignResourceRead(human(), byUser, evaluatedAt).effect, "self");
  assert.equal(evaluateCampaignResourceRead(human(), byCharacter, evaluatedAt).effect, "self");

  const playerB = human({
    userId: "user-b",
    membershipId: "membership-b",
    assignedCharacterIds: ["character-b"]
  });
  const denied = evaluateCampaignResourceRead(playerB, byCharacter, evaluatedAt);
  assertSecurityDenial("hed21.player-a-vs-player-b", "RESOURCE_SUBJECT_DENIED", denied);
});

test("storage adapters receive exact manager or player-safe read scopes", () => {
  const manager = deriveCampaignReadScope(
    human({ role: "gm" }),
    "workspace-a",
    "campaign-a",
    evaluatedAt
  );
  assert.equal(manager.scope.viewer, "manager");
  assert.deepEqual(manager.scope.contentClasses, [
    "approvedCanon",
    "rawEvidence",
    "secretCheck",
    "hiddenAchievement"
  ]);

  const player = deriveCampaignReadScope(human(), "workspace-a", "campaign-a", evaluatedAt);
  assert.equal(player.scope.viewer, "player");
  assert.deepEqual(player.scope.editorialStates, ["active"]);
  assert.deepEqual(player.scope.audiences, ["party", "specificPlayers"]);
  assert.deepEqual(player.scope.contentClasses, ["approvedCanon"]);
  assert.deepEqual(player.scope.explicitCharacterIds, ["character-a"]);
});

test("Discord, Foundry, jobs, notifications, AI and exports use channel-bound policy decisions", () => {
  assert.equal(
    authorizeHumanCampaignAction(human(), humanRequest("discord.command.player", "discord"), evaluatedAt).allowed,
    true
  );
  assert.equal(
    authorizeHumanCampaignAction(
      human(),
      humanRequest("character.ask", "ai", { targetCharacterId: "character-a" }),
      evaluatedAt
    ).allowed,
    true
  );
  assert.equal(
    authorizeHumanCampaignAction(human(), humanRequest("export.party.create", "export"), evaluatedAt).allowed,
    true
  );
  assert.equal(
    authorizeHumanCampaignAction(human(), humanRequest("discord.command.player", "web"), evaluatedAt).code,
    "CHANNEL_ACTION_DENIED"
  );

  assert.equal(
    authorizeMachineCampaignCapability(machine(), machineRequest("job:execute", "job")).allowed,
    true
  );
  assert.equal(
    authorizeMachineCampaignCapability(machine(), machineRequest("notification:deliver", "notification")).allowed,
    true
  );

  const connector = machine({
    principalKind: "connector",
    principalId: "connector-a",
    capabilities: ["foundry:ingest", "archive:read:party", "export:create:party"]
  });
  assert.equal(
    authorizeMachineCampaignCapability(connector, machineRequest("foundry:ingest", "foundry")).allowed,
    true
  );
  assert.equal(
    authorizeMachineCampaignCapability(connector, machineRequest("export:create:party", "export")).allowed,
    true
  );
  assert.equal(
    authorizeMachineCampaignCapability(
      { ...connector, capabilities: [...connector.capabilities, "notification:deliver"] },
      machineRequest("notification:deliver", "notification")
    ).code,
    "MACHINE_SCOPE_DENIED"
  );
  assert.equal(
    authorizeMachineCampaignCapability(machine(), machineRequest("foundry:ingest", "foundry")).code,
    "MACHINE_SCOPE_DENIED"
  );
});

test("machine capabilities stay exact-campaign, active and explicitly allowlisted", () => {
  assertSecurityDenial(
    "hed21.machine-cross-campaign",
    "TENANT_MISMATCH",
    authorizeMachineCampaignCapability(
      machine(),
      machineRequest("job:execute", "job", { campaignId: "campaign-b" })
    )
  );
  assert.equal(
    authorizeMachineCampaignCapability(machine({ credentialState: "revoked" }), machineRequest("job:execute", "job")).code,
    "MACHINE_CREDENTIAL_INACTIVE"
  );
  assert.equal(
    authorizeMachineCampaignCapability(machine(), machineRequest("archive:read:gm", "job")).code,
    "MACHINE_SCOPE_DENIED"
  );
});

test("malformed adapter inputs fail closed instead of throwing", () => {
  for (const decision of [
    authorizeHumanCampaignAction(
      human({ assignedCharacterIds: null }),
      humanRequest("campaign.read"),
      evaluatedAt
    ),
    authorizeHumanCampaignAction(
      human(),
      humanRequest("campaign.read", "toString"),
      evaluatedAt
    ),
    authorizeMachineCampaignCapability(
      machine({ capabilities: null }),
      machineRequest("job:execute", "job")
    ),
    evaluateCampaignResourceRead(
      human(),
      resource({ explicitUserIds: null }),
      evaluatedAt
    ),
    deriveCampaignReadScope(
      human({ assignedCharacterIds: null }),
      "workspace-a",
      "campaign-a",
      evaluatedAt
    ).decision
  ]) {
    assert.deepEqual(decision, {
      allowed: false,
      code: "POLICY_INPUT_INVALID",
      policyVersion: CAMPAIGN_POLICY_VERSION
    });
  }
});

test("policy cache keys invalidate on tenant, membership, role, character and credential changes", () => {
  const base = buildCampaignPolicyCacheKey(human(), "archive");
  const humanVariants = [
    human({ campaignId: "campaign-b" }),
    human({ membershipUpdatedAt: "2026-08-23T11:00:00.000Z" }),
    human({ role: "gm" }),
    human({ membershipState: "removed" }),
    human({ assignedCharacterIds: ["character-b"] }),
    human({ characterGrantVersion: "character-grants-v2" })
  ];
  for (const variant of humanVariants) assert.notEqual(buildCampaignPolicyCacheKey(variant, "archive"), base);

  const machineBase = buildCampaignPolicyCacheKey(machine(), "job");
  assert.notEqual(
    buildCampaignPolicyCacheKey(machine({ credentialVersion: "credential-v2" }), "job"),
    machineBase
  );
  assert.notEqual(
    buildCampaignPolicyCacheKey(machine({ capabilities: ["job:execute"] }), "job"),
    machineBase
  );
});
