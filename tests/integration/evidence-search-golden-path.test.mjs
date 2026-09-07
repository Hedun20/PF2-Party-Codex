import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import { ObjectId } from "mongodb";

import { createApp } from "../../apps/server/src/app.js";
import { config } from "../../apps/server/src/config.js";
import { closeMongo, connectMongo, getDb } from "../../apps/server/src/db/mongo.js";
import { createSessionToken } from "../../apps/server/src/services/authTokens.js";

const SAFE_DATABASE_PREFIX = "pf2_party_codex_test_";
const SAFE_MONGO_HOSTS = new Set(["127.0.0.1", "localhost"]);
const silentLogger = { debug() {}, info() {}, warn() {}, error() {} };

const ids = {
  workspaceA: new ObjectId(),
  workspaceB: new ObjectId(),
  campaignA: new ObjectId(),
  campaignB: new ObjectId(),
  gm: new ObjectId(),
  player: new ObjectId(),
  outsider: new ObjectId(),
  gmMembership: new ObjectId(),
  playerMembership: new ObjectId(),
  outsiderMembership: new ObjectId(),
  playerCharacter: new ObjectId(),
  otherCharacter: new ObjectId(),
  publicEntry: new ObjectId(),
  secretEntry: new ObjectId(),
  crossCampaignEntry: new ObjectId(),
  session: new ObjectId()
};

let database;
let server;
let baseUrl = "";
let gmToken = "";
let playerToken = "";

function assertDisposableTarget() {
  assert.ok(config.mongoUri, "MONGO_URI is required for evidence search integration tests");
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

function searchRequest({ membershipId, characterId = null, mode = "sourceList", sourceKinds = [], overrides = {} }) {
  return {
    schemaVersion: "hed28-evidence-search-request-v1",
    workspaceId: ids.workspaceA.toString(),
    campaignId: ids.campaignA.toString(),
    requestingMembershipId: membershipId.toString(),
    requestingCharacterId: characterId ? characterId.toString() : null,
    query: "ruined gate oath",
    mode,
    filters: {
      sessionIds: [],
      sourceKinds,
      entityIds: [],
      occurredFrom: null,
      occurredTo: null
    },
    limit: 20,
    contextBudget: { maxItems: 20, maxUtf8Bytes: 32768 },
    requestedAt: "2026-09-07T13:00:00.000Z",
    ...overrides
  };
}

async function search(token, body) {
  const response = await fetch(`${baseUrl}/api/campaigns/${ids.campaignA}/evidence/search`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-campaign-id": ids.campaignA.toString()
    },
    body: JSON.stringify(body)
  });
  return { status: response.status, json: await response.json(), cacheControl: response.headers.get("cache-control") };
}

before(async () => {
  assertDisposableTarget();
  const status = await connectMongo();
  assert.equal(status.connected, true);
  database = getDb();
  await database.dropDatabase();

  const stamp = "2026-09-07T10:00:00.000Z";
  await database.collection("users").insertMany([
    {
      _id: ids.gm,
      email: "evidence-gm@example.test",
      name: "Evidence GM",
      emailVerified: true,
      status: "active",
      sessionVersion: 1,
      activeCampaignId: ids.campaignA,
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      _id: ids.player,
      email: "evidence-player@example.test",
      name: "Evidence Player",
      emailVerified: true,
      status: "active",
      sessionVersion: 1,
      activeCampaignId: ids.campaignA,
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      _id: ids.outsider,
      email: "evidence-outsider@example.test",
      name: "Outsider",
      emailVerified: true,
      status: "active",
      sessionVersion: 1,
      activeCampaignId: ids.campaignB,
      createdAt: stamp,
      updatedAt: stamp
    }
  ]);

  await database.collection("workspaces").insertMany([
    {
      _id: ids.workspaceA,
      ownerUserId: ids.gm,
      name: "Evidence Workspace A",
      status: "active",
      plan: "development",
      subscriptionStatus: "active",
      settings: {},
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      _id: ids.workspaceB,
      ownerUserId: ids.outsider,
      name: "Evidence Workspace B",
      status: "active",
      plan: "development",
      subscriptionStatus: "active",
      settings: {},
      createdAt: stamp,
      updatedAt: stamp
    }
  ]);

  await database.collection("campaigns").insertMany([
    {
      _id: ids.campaignA,
      workspaceId: ids.workspaceA,
      ownerUserId: ids.gm,
      name: "Evidence Campaign A",
      status: "active",
      activeWorldId: "",
      settings: {},
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      _id: ids.campaignB,
      workspaceId: ids.workspaceB,
      ownerUserId: ids.outsider,
      name: "Evidence Campaign B",
      status: "active",
      activeWorldId: "",
      settings: {},
      createdAt: stamp,
      updatedAt: stamp
    }
  ]);

  await database.collection("memberships").insertMany([
    {
      _id: ids.gmMembership,
      userId: ids.gm,
      workspaceId: ids.workspaceA,
      campaignId: ids.campaignA,
      role: "owner",
      status: "active",
      displayName: "GM",
      joinedAt: stamp,
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      _id: ids.playerMembership,
      userId: ids.player,
      workspaceId: ids.workspaceA,
      campaignId: ids.campaignA,
      role: "player",
      status: "active",
      displayName: "Player",
      joinedAt: stamp,
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      _id: ids.outsiderMembership,
      userId: ids.outsider,
      workspaceId: ids.workspaceB,
      campaignId: ids.campaignB,
      role: "owner",
      status: "active",
      displayName: "Outsider",
      joinedAt: stamp,
      createdAt: stamp,
      updatedAt: stamp
    }
  ]);

  await database.collection("characters").insertMany([
    {
      _id: ids.playerCharacter,
      campaignId: ids.campaignA,
      assignedUserId: ids.player,
      assignedMembershipId: ids.playerMembership,
      ownerUserId: ids.player,
      identity: { name: "Assigned Hero" },
      updatedAt: "2026-09-07T10:10:00.000Z",
      createdAt: stamp
    },
    {
      _id: ids.otherCharacter,
      campaignId: ids.campaignA,
      assignedUserId: ids.gm,
      assignedMembershipId: ids.gmMembership,
      ownerUserId: ids.gm,
      identity: { name: "GM Character" },
      updatedAt: "2026-09-07T10:11:00.000Z",
      createdAt: stamp
    }
  ]);

  await database.collection("entries").insertMany([
    {
      _id: ids.publicEntry,
      campaignId: ids.campaignA,
      title: "The Ruined Gate",
      path: "worlds/ruined-gate.md",
      summary: "The party opened the ruined gate with an old oath.",
      publicContent: "The old oath opened the ruined gate and the party entered safely.",
      gmContent: "The hidden mechanism belonged to the Moon Court.",
      status: "active",
      visibility: "revealed",
      createdAt: "2026-09-07T10:20:00.000Z",
      updatedAt: "2026-09-07T11:00:00.000Z"
    },
    {
      _id: ids.secretEntry,
      campaignId: ids.campaignA,
      title: "Gate Keeper Secret",
      path: "gm/gate-secret.md",
      summary: "A secret oath controls the ruined gate.",
      publicContent: "",
      gmContent: "The GM-only ruined gate oath belongs to the hidden prince.",
      status: "active",
      visibility: "gmOnly",
      createdAt: "2026-09-07T10:21:00.000Z",
      updatedAt: "2026-09-07T11:01:00.000Z"
    },
    {
      _id: ids.crossCampaignEntry,
      campaignId: ids.campaignB,
      title: "Other Ruined Gate",
      path: "other/gate.md",
      summary: "Cross-campaign ruined gate oath must never leak.",
      publicContent: "Cross-campaign secret.",
      status: "active",
      visibility: "public",
      createdAt: "2026-09-07T10:22:00.000Z",
      updatedAt: "2026-09-07T11:02:00.000Z"
    }
  ]);

  await database.collection("evidenceRecords").insertMany([
    {
      _id: new ObjectId(),
      workspaceId: ids.workspaceA,
      campaignId: ids.campaignA,
      provider: "foundry",
      sourceId: "foundry-source-001",
      sessionId: ids.session,
      state: "active",
      visibility: "restricted",
      occurredAt: "2026-09-07T11:10:00.000Z",
      purgeAt: "2026-10-07T11:10:00.000Z",
      providerObjectId: "foundry-chat-001",
      providerEventId: "foundry-event-001",
      normalizedProjection: {
        text: "At the ruined gate the party repeated the old oath and rolled a critical success.",
        foundryRollId: "roll-001",
        speaker: { sourceActorId: "actor-001", displayName: "Assigned Hero" }
      }
    },
    {
      _id: new ObjectId(),
      workspaceId: ids.workspaceA,
      campaignId: ids.campaignA,
      provider: "discord",
      sourceId: "discord-source-001",
      state: "active",
      visibility: "managerOnly",
      occurredAt: "2026-09-07T11:11:00.000Z",
      purgeAt: "2026-10-07T11:11:00.000Z",
      providerObjectId: "discord-message-001",
      providerEventId: "discord-event-001",
      normalizedProjection: {
        text: "GM-only discussion: the ruined gate oath points to the hidden vault.",
        discordMessageId: "123456789012345678"
      }
    },
    {
      _id: new ObjectId(),
      workspaceId: ids.workspaceA,
      campaignId: ids.campaignA,
      provider: "discord",
      sourceId: "discord-revoked-001",
      state: "revoked",
      visibility: "restricted",
      revokedAt: "2026-09-07T12:00:00.000Z",
      occurredAt: "2026-09-07T11:12:00.000Z",
      purgeAt: "2026-10-07T11:12:00.000Z",
      normalizedProjection: { text: "Revoked ruined gate oath must disappear." }
    },
    {
      _id: new ObjectId(),
      workspaceId: ids.workspaceA,
      campaignId: ids.campaignA,
      provider: "transcript",
      sourceId: "transcript-source-001",
      state: "ended",
      visibility: "restricted",
      occurredAt: "2026-09-07T11:13:00.000Z",
      purgeAt: "2026-10-07T11:13:00.000Z",
      normalizedProjection: {
        segments: [
          {
            segmentId: "segment-001",
            startMs: 1000,
            endMs: 5000,
            text: "We say the ruined gate oath together.",
            suggestedSpeakerId: "speaker-001",
            suggestedSpeakerLabel: "Player"
          }
        ]
      }
    },
    {
      _id: new ObjectId(),
      workspaceId: ids.workspaceB,
      campaignId: ids.campaignB,
      provider: "foundry",
      sourceId: "cross-campaign-evidence",
      state: "active",
      visibility: "restricted",
      occurredAt: "2026-09-07T11:14:00.000Z",
      purgeAt: "2026-10-07T11:14:00.000Z",
      normalizedProjection: { text: "Cross-campaign ruined gate oath evidence." }
    }
  ]);

  await database.collection("notes").insertMany([
    {
      _id: new ObjectId(),
      campaignId: ids.campaignA,
      userId: ids.player,
      title: "Gate clue",
      body: "I shared with the GM that the ruined gate oath sounded familiar.",
      linkedSessionId: ids.session,
      linkedEntryIds: [ids.publicEntry],
      visibility: "sharedWithGm",
      createdAt: "2026-09-07T11:15:00.000Z",
      updatedAt: "2026-09-07T11:16:00.000Z"
    },
    {
      _id: new ObjectId(),
      campaignId: ids.campaignA,
      userId: ids.player,
      title: "Private player thought",
      body: "Private ruined gate oath thought that was never shared.",
      visibility: "private",
      createdAt: "2026-09-07T11:17:00.000Z",
      updatedAt: "2026-09-07T11:18:00.000Z"
    },
    {
      _id: new ObjectId(),
      campaignId: ids.campaignB,
      userId: ids.outsider,
      title: "Other campaign note",
      body: "Other campaign ruined gate oath.",
      visibility: "sharedWithGm",
      createdAt: "2026-09-07T11:19:00.000Z",
      updatedAt: "2026-09-07T11:20:00.000Z"
    }
  ]);

  gmToken = createSessionToken({ id: ids.gm.toString(), sessionVersion: 1 });
  playerToken = createSessionToken({ id: ids.player.toString(), sessionVersion: 1 });

  const app = createApp({
    appConfig: { ...config, allowedOrigins: ["http://localhost:5173"], apiRateLimit: 10_000 },
    appLogger: silentLogger
  });
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server?.listening) {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  if (database) await database.dropDatabase();
  await closeMongo({ silent: true });
});

test("GM source-list search returns authorized canon/raw/manual/transcript evidence without revoked or cross-tenant data", async () => {
  const response = await search(gmToken, searchRequest({ membershipId: ids.gmMembership }));
  assert.equal(response.status, 200);
  assert.match(response.cacheControl || "", /no-store/);
  assert.equal(response.json.schemaVersion, "hed28-evidence-bundle-v1");
  const kinds = new Set(response.json.items.map((item) => item.kind));
  assert.ok(kinds.has("approvedCanon"));
  assert.ok(kinds.has("foundry"));
  assert.ok(kinds.has("discord"));
  assert.ok(kinds.has("manualNote"));
  assert.ok(kinds.has("transcriptSegment"));
  assert.ok(response.json.items.some((item) => item.recordId === ids.secretEntry.toString()));
  assert.equal(response.json.items.some((item) => item.sourceId === "discord-revoked-001"), false);
  assert.equal(response.json.items.some((item) => item.sourceId === "cross-campaign-evidence"), false);
  assert.equal(response.json.items.some((item) => item.snippet.includes("Private player thought")), false);
  assert.equal(response.json.items.every((item) => item.contentDisposition === "dataOnlyUntrusted"), true);
});

test("grounded/model-context mode removes manager-only raw evidence at the second policy gate", async () => {
  const response = await search(gmToken, searchRequest({
    membershipId: ids.gmMembership,
    mode: "groundedAnswer"
  }));
  assert.equal(response.status, 200);
  assert.equal(response.json.items.some((item) => item.kind === "discord" && item.visibility === "managerOnly"), false);
  assert.ok(response.json.items.some((item) => item.kind === "foundry" && item.visibility === "restricted"));
});

test("player default search sees only revealed approved canon and never GM-only/raw evidence", async () => {
  const response = await search(playerToken, searchRequest({
    membershipId: ids.playerMembership,
    characterId: ids.playerCharacter
  }));
  assert.equal(response.status, 200);
  assert.ok(response.json.items.length >= 1);
  assert.equal(response.json.items.every((item) => item.kind === "approvedCanon"), true);
  assert.equal(response.json.items.every((item) => ["public", "revealed"].includes(item.releaseState)), true);
  assert.equal(response.json.items.some((item) => item.recordId === ids.secretEntry.toString()), false);
});

test("player explicit raw search and unassigned character context fail closed before evidence retrieval", async () => {
  let response = await search(playerToken, searchRequest({
    membershipId: ids.playerMembership,
    characterId: ids.playerCharacter,
    sourceKinds: ["discord"]
  }));
  assert.equal(response.status, 403);
  assert.equal(response.json.code, "EVIDENCE_RAW_SEARCH_DENIED");

  response = await search(playerToken, searchRequest({
    membershipId: ids.playerMembership,
    characterId: ids.otherCharacter
  }));
  assert.equal(response.status, 403);
  assert.equal(response.json.code, "EVIDENCE_SEARCH_CHARACTER_DENIED");
});

test("caller-supplied tenant or membership identity cannot redirect an authenticated search", async () => {
  const response = await search(playerToken, searchRequest({
    membershipId: ids.playerMembership,
    characterId: ids.playerCharacter,
    overrides: {
      workspaceId: ids.workspaceB.toString(),
      campaignId: ids.campaignB.toString(),
      requestingMembershipId: ids.outsiderMembership.toString()
    }
  }));
  assert.equal(response.status, 403);
  assert.equal(response.json.code, "EVIDENCE_SEARCH_IDENTITY_MISMATCH");
});
