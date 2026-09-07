import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { ObjectId } from "mongodb";

import { config } from "../../apps/server/src/config.js";
import { closeMongo, connectMongo, getDb } from "../../apps/server/src/db/mongo.js";
import {
  completeDiscordIdentityChallenge,
  createDiscordIdentityChallenge,
  discordIdentityStatus,
  ensureDiscordIdentityIndexes,
  revokeDiscordIdentityLink
} from "../../apps/server/src/repositories/discordIdentityRepository.js";
import { ensureDiscordIdentityConcurrencyIndexes } from "../../apps/server/src/repositories/discordIdentityConcurrencyIndexes.js";
import { removeCampaignMembership } from "../../apps/server/src/repositories/membershipManagementRepository.js";

const SAFE_DATABASE_PREFIX = "pf2_party_codex_test_";
const SAFE_MONGO_HOSTS = new Set(["127.0.0.1", "localhost"]);

const ids = {
  workspace: new ObjectId(),
  campaign: new ObjectId(),
  userA: new ObjectId(),
  userB: new ObjectId(),
  membershipA: new ObjectId(),
  membershipB: new ObjectId()
};

let database;

function assertDisposableTarget() {
  assert.ok(config.mongoUri, "MONGO_URI is required for Discord identity integration tests");
  assert.match(
    config.mongoDbName,
    new RegExp(`^${SAFE_DATABASE_PREFIX}[A-Za-z0-9_]+$`),
    `Refusing non-disposable Mongo database name: ${config.mongoDbName}`
  );
  const target = new URL(config.mongoUri);
  assert.ok(SAFE_MONGO_HOSTS.has(target.hostname), `Refusing non-local Mongo host: ${target.hostname}`);
  assert.equal(target.username, "");
  assert.equal(target.password, "");
}

function scope(membershipId, userId) {
  return {
    workspaceId: ids.workspace.toString(),
    campaignId: ids.campaign.toString(),
    membershipId: membershipId.toString(),
    userId: userId.toString()
  };
}

function proof({ pairingCode, discordUserId, interactionId }) {
  const verifiedAt = new Date().toISOString();
  const issuedAt = new Date(Date.parse(verifiedAt) - 1_000).toISOString();
  return {
    schemaVersion: "hed33-verified-discord-identity-v1",
    workspaceId: ids.workspace.toString(),
    campaignId: ids.campaign.toString(),
    connectionId: "discord-connection-alpha",
    discordUserId,
    applicationId: "111111111111111111",
    guildId: "222222222222222222",
    channelId: "333333333333333333",
    interactionId,
    pairingCode,
    issuedAt,
    verifiedAt
  };
}

before(async () => {
  assertDisposableTarget();
  const status = await connectMongo();
  assert.equal(status.connected, true);
  database = getDb();
  await database.dropDatabase();

  const stamp = new Date().toISOString();
  await database.collection("users").insertMany([
    {
      _id: ids.userA,
      email: "discord-a@example.test",
      name: "Discord A",
      status: "active",
      emailVerified: true,
      sessionVersion: 1,
      activeCampaignId: ids.campaign,
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      _id: ids.userB,
      email: "discord-b@example.test",
      name: "Discord B",
      status: "active",
      emailVerified: true,
      sessionVersion: 1,
      activeCampaignId: ids.campaign,
      createdAt: stamp,
      updatedAt: stamp
    }
  ]);
  await database.collection("workspaces").insertOne({
    _id: ids.workspace,
    ownerUserId: ids.userA,
    name: "Discord Workspace",
    status: "active",
    plan: "development",
    createdAt: stamp,
    updatedAt: stamp
  });
  await database.collection("campaigns").insertOne({
    _id: ids.campaign,
    workspaceId: ids.workspace,
    ownerUserId: ids.userA,
    name: "Discord Campaign",
    status: "active",
    createdAt: stamp,
    updatedAt: stamp
  });
  await database.collection("memberships").insertMany([
    {
      _id: ids.membershipA,
      userId: ids.userA,
      workspaceId: ids.workspace,
      campaignId: ids.campaign,
      role: "player",
      status: "active",
      displayName: "Discord A",
      joinedAt: stamp,
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      _id: ids.membershipB,
      userId: ids.userB,
      workspaceId: ids.workspace,
      campaignId: ids.campaign,
      role: "player",
      status: "active",
      displayName: "Discord B",
      joinedAt: stamp,
      createdAt: stamp,
      updatedAt: stamp
    }
  ]);

  await ensureDiscordIdentityIndexes();
  await ensureDiscordIdentityConcurrencyIndexes();
});

after(async () => {
  if (database) await database.dropDatabase();
  await closeMongo({ silent: true });
});

test("pairing codes are one-time secrets and exactly one membership can claim a Discord account", async () => {
  const [challengeA, challengeB] = await Promise.all([
    createDiscordIdentityChallenge(scope(ids.membershipA, ids.userA)),
    createDiscordIdentityChallenge(scope(ids.membershipB, ids.userB))
  ]);

  assert.match(challengeA.pairingCode, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.match(challengeB.pairingCode, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.notEqual(challengeA.pairingCode, challengeB.pairingCode);

  const storedA = await database.collection("discordIdentityChallenges").findOne({ _id: new ObjectId(challengeA.id) });
  assert.ok(storedA.codeHash);
  assert.equal(storedA.pairingCode, undefined);

  const sharedDiscordUserId = "444444444444444444";
  const results = await Promise.allSettled([
    completeDiscordIdentityChallenge({
      proof: proof({
        pairingCode: challengeA.pairingCode,
        discordUserId: sharedDiscordUserId,
        interactionId: "555555555555555551"
      })
    }),
    completeDiscordIdentityChallenge({
      proof: proof({
        pairingCode: challengeB.pairingCode,
        discordUserId: sharedDiscordUserId,
        interactionId: "555555555555555552"
      })
    })
  ]);

  const fulfilled = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");
  assert.equal(fulfilled.length, 1, "Exactly one membership must win the Discord identity race");
  assert.equal(rejected.length, 1, "The conflicting membership must be rejected");
  assert.equal(rejected[0].reason?.code, "DISCORD_IDENTITY_CONFLICT");

  const activeLinks = await database.collection("discordIdentityLinks").find({
    campaignId: ids.campaign,
    discordUserId: sharedDiscordUserId,
    status: "active"
  }).toArray();
  assert.equal(activeLinks.length, 1);

  const winner = activeLinks[0];
  const winnerScope = winner.membershipId.equals(ids.membershipA)
    ? scope(ids.membershipA, ids.userA)
    : scope(ids.membershipB, ids.userB);
  const status = await discordIdentityStatus(winnerScope);
  assert.equal(status.link?.discordUserId, sharedDiscordUserId);

  const unlink = await revokeDiscordIdentityLink({
    campaignId: ids.campaign,
    membershipId: winner.membershipId,
    userId: winner.userId,
    reason: "userUnlinked"
  });
  assert.equal(unlink.idempotent, false);
  assert.equal(unlink.link?.status, "revoked");

  const unlinkAgain = await revokeDiscordIdentityLink({
    campaignId: ids.campaign,
    membershipId: winner.membershipId,
    userId: winner.userId,
    reason: "userUnlinked"
  });
  assert.equal(unlinkAgain.idempotent, true);
});

test("membership removal revokes Discord identity and defensive stale pending pairing before authorization disappears", async () => {
  const currentB = await database.collection("memberships").findOne({ _id: ids.membershipB });
  if (currentB.status !== "active") {
    await database.collection("memberships").updateOne(
      { _id: ids.membershipB },
      { $set: { status: "active", removedAt: "", removedReason: "", updatedAt: new Date().toISOString() } }
    );
  }

  await database.collection("discordIdentityLinks").updateMany(
    { campaignId: ids.campaign, membershipId: ids.membershipB, status: "active" },
    { $set: { status: "revoked", revokedAt: new Date().toISOString(), revokedReason: "testReset" } }
  );

  const linkChallenge = await createDiscordIdentityChallenge(scope(ids.membershipB, ids.userB));
  const linked = await completeDiscordIdentityChallenge({
    proof: proof({
      pairingCode: linkChallenge.pairingCode,
      discordUserId: "666666666666666666",
      interactionId: "777777777777777777"
    })
  });
  assert.equal(linked.link.status, "active");

  await assert.rejects(
    () => createDiscordIdentityChallenge(scope(ids.membershipB, ids.userB)),
    (error) => error.code === "DISCORD_IDENTITY_ALREADY_LINKED" && error.status === 409
  );

  const pendingChallengeId = new ObjectId();
  const pendingStamp = new Date().toISOString();
  await database.collection("discordIdentityChallenges").insertOne({
    _id: pendingChallengeId,
    workspaceId: ids.workspace,
    campaignId: ids.campaign,
    membershipId: ids.membershipB,
    userId: ids.userB,
    codeHash: `stale-pending-${pendingChallengeId.toString()}`,
    status: "pending",
    expiresAt: new Date(Date.now() + 60_000),
    purgeAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: pendingStamp,
    updatedAt: pendingStamp
  });

  const removed = await removeCampaignMembership({
    campaignId: ids.campaign,
    membershipId: ids.membershipB
  });
  assert.equal(removed.status, "removed");

  const [linkAfter, challengeAfter] = await Promise.all([
    database.collection("discordIdentityLinks").findOne({ _id: new ObjectId(linked.link.id) }),
    database.collection("discordIdentityChallenges").findOne({ _id: pendingChallengeId })
  ]);
  assert.equal(linkAfter.status, "revoked");
  assert.equal(linkAfter.revokedReason, "membershipRemoved");
  assert.equal(challengeAfter.status, "revoked");

  await assert.rejects(
    () => discordIdentityStatus(scope(ids.membershipB, ids.userB)),
    (error) => error.code === "DISCORD_IDENTITY_MEMBERSHIP_REQUIRED" && error.status === 403
  );
});

test("Discord identity uniqueness indexes are partial so revoked history is preserved", async () => {
  const indexes = await database.collection("discordIdentityLinks").indexes();
  const byName = new Map(indexes.map((index) => [index.name, index]));
  for (const name of ["discord_identity_active_membership_unique", "discord_identity_active_user_unique"]) {
    const index = byName.get(name);
    assert.ok(index, `Missing ${name}`);
    assert.equal(index.unique, true);
    assert.deepEqual(index.partialFilterExpression, { status: "active" });
  }
});
