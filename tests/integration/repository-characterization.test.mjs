import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import { ObjectId } from "mongodb";
import { createApp } from "../../apps/server/src/app.js";
import { config } from "../../apps/server/src/config.js";
import { closeMongo, connectMongo, getDb } from "../../apps/server/src/db/mongo.js";
import { ensureCodexIndexes, upsertEntryFromImport } from "../../apps/server/src/repositories/entriesRepository.js";
import { ensureIdentityIndexes } from "../../apps/server/src/repositories/identityRepository.js";
import { createSessionToken } from "../../apps/server/src/services/authTokens.js";

const SAFE_DATABASE_PREFIX = "pf2_party_codex_test_";
const SAFE_MONGO_HOSTS = new Set(["127.0.0.1", "localhost"]);
const silentLogger = { debug() {}, info() {}, warn() {}, error() {} };

const ids = {
  workspaceA: new ObjectId(),
  workspaceB: new ObjectId(),
  campaignA: new ObjectId(),
  campaignB: new ObjectId(),
  owner: new ObjectId(),
  gm: new ObjectId(),
  player: new ObjectId(),
  nonMember: new ObjectId(),
  removed: new ObjectId(),
  platformAdmin: new ObjectId(),
  otherOwner: new ObjectId(),
  publicEntry: new ObjectId(),
  revealedEntry: new ObjectId(),
  hiddenEntry: new ObjectId(),
  reviewEntry: new ObjectId(),
  draftEntry: new ObjectId(),
  archivedEntry: new ObjectId(),
  otherCampaignEntry: new ObjectId()
};

const tokens = Object.create(null);
let database = null;
let server = null;
let baseUrl = "";

function assertDisposableTarget() {
  assert.ok(config.mongoUri, "MONGO_URI is required for repository characterization tests");
  assert.match(
    config.mongoDbName,
    new RegExp(`^${SAFE_DATABASE_PREFIX}[A-Za-z0-9_]+$`),
    `Refusing non-disposable Mongo database name: ${config.mongoDbName}`
  );
  const target = new URL(config.mongoUri);
  assert.ok(SAFE_MONGO_HOSTS.has(target.hostname), `Refusing non-local Mongo host: ${target.hostname}`);
  assert.equal(target.username, "", "Repository characterization Mongo must not use credentials");
  assert.equal(target.password, "", "Repository characterization Mongo must not use credentials");
}

function userDocument(id, email, name) {
  const stamp = new Date().toISOString();
  return {
    _id: id,
    email,
    name,
    emailVerified: true,
    status: "active",
    sessionVersion: 1,
    createdAt: stamp,
    updatedAt: stamp
  };
}

function membershipDocument(userId, workspaceId, campaignId, role, status = "active") {
  const stamp = new Date().toISOString();
  return {
    _id: new ObjectId(),
    userId,
    workspaceId,
    campaignId,
    role,
    status,
    displayName: role,
    joinedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp
  };
}

function entryDocument({ id, campaignId, title, visibility = "public", status = "active" }) {
  const stamp = new Date().toISOString();
  return {
    _id: id,
    campaignId,
    worldId: null,
    type: "lore",
    category: "lore",
    title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    path: `lore/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`,
    summary: `${title} public summary`,
    publicContent: `${title} public content`,
    gmContent: "GM_ONLY_MARKER",
    visibility,
    status,
    tags: ["characterization"],
    aliases: [],
    metadata: {
      sourceCategory: "characterization",
      gmPrivate: { note: "PRIVATE_METADATA_MARKER" },
      frontmatter: {
        title,
        visibility,
        pins: [
          { id: "public-pin", label: "Visible pin", visibility: "public", gmNotes: "PIN_GM_MARKER" },
          { id: "hidden-pin", label: "HIDDEN_PIN_MARKER", visibility: "hidden" }
        ]
      }
    },
    source: {
      kind: "characterization",
      originalPath: `private/${title}.md`,
      credentials: { token: "SOURCE_TOKEN_MARKER" }
    },
    createdBy: ids.owner,
    updatedBy: ids.gm,
    createdAt: stamp,
    updatedAt: stamp
  };
}

function importedEntryDocument({ campaignId, title, originalPath }) {
  const { _id: _id, ...entry } = entryDocument({
    id: new ObjectId(),
    campaignId,
    title
  });
  return {
    ...entry,
    source: {
      kind: "vaultImport",
      originalPath,
      originalHash: `${title}-hash`
    }
  };
}

async function seedDatabase() {
  const stamp = new Date().toISOString();
  const users = [
    userDocument(ids.owner, "owner@example.test", "Owner"),
    userDocument(ids.gm, "gm@example.test", "GM"),
    userDocument(ids.player, "player@example.test", "Player"),
    userDocument(ids.nonMember, "non-member@example.test", "Non-member"),
    userDocument(ids.removed, "removed@example.test", "Removed member"),
    userDocument(ids.platformAdmin, "platform-admin@example.test", "Platform admin"),
    userDocument(ids.otherOwner, "other-owner@example.test", "Other owner")
  ];
  await database.collection("users").insertMany(users);
  for (const user of users) {
    tokens[user.email] = createSessionToken({ id: user._id.toString(), sessionVersion: user.sessionVersion });
  }

  await database.collection("workspaces").insertMany([
    {
      _id: ids.workspaceA,
      ownerUserId: ids.owner,
      name: "Characterization workspace A",
      status: "active",
      plan: "development",
      subscriptionStatus: "active",
      settings: {},
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      _id: ids.workspaceB,
      ownerUserId: ids.otherOwner,
      name: "Characterization workspace B",
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
      ownerUserId: ids.owner,
      name: "Characterization campaign A",
      status: "active",
      activeWorldId: "",
      settings: {},
      createdAt: stamp,
      updatedAt: stamp
    },
    {
      _id: ids.campaignB,
      workspaceId: ids.workspaceB,
      ownerUserId: ids.otherOwner,
      name: "Characterization campaign B",
      status: "active",
      activeWorldId: "",
      settings: {},
      createdAt: stamp,
      updatedAt: stamp
    }
  ]);
  await database.collection("memberships").insertMany([
    membershipDocument(ids.owner, ids.workspaceA, ids.campaignA, "owner"),
    membershipDocument(ids.gm, ids.workspaceA, ids.campaignA, "gm"),
    membershipDocument(ids.player, ids.workspaceA, ids.campaignA, "player"),
    membershipDocument(ids.removed, ids.workspaceA, ids.campaignA, "player", "removed"),
    membershipDocument(ids.otherOwner, ids.workspaceB, ids.campaignB, "owner")
  ]);
  await database.collection("entries").insertMany([
    entryDocument({ id: ids.publicEntry, campaignId: ids.campaignA, title: "Public entry" }),
    entryDocument({ id: ids.revealedEntry, campaignId: ids.campaignA, title: "Revealed entry", visibility: "revealed" }),
    entryDocument({ id: ids.hiddenEntry, campaignId: ids.campaignA, title: "Hidden entry", visibility: "hidden" }),
    entryDocument({ id: ids.reviewEntry, campaignId: ids.campaignA, title: "Review entry", visibility: "needsReview" }),
    entryDocument({ id: ids.draftEntry, campaignId: ids.campaignA, title: "Draft entry", status: "draft" }),
    entryDocument({ id: ids.archivedEntry, campaignId: ids.campaignA, title: "Archived entry", status: "archived" }),
    entryDocument({ id: ids.otherCampaignEntry, campaignId: ids.campaignB, title: "Other campaign entry" })
  ]);
}

async function api(pathname, { token = "", campaignId = "", method = "GET", body, headers = {} } = {}) {
  const requestHeaders = { ...headers };
  if (token) requestHeaders.authorization = `Bearer ${token}`;
  if (campaignId) requestHeaders["x-campaign-id"] = campaignId;
  if (body !== undefined) requestHeaders["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: requestHeaders,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: "manual"
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, text };
}

before(async () => {
  assertDisposableTarget();
  const status = await connectMongo();
  assert.equal(status.connected, true, status.error || status.message);
  database = getDb();
  await database.dropDatabase();
  await ensureIdentityIndexes();
  await database.collection("entries").createIndex(
    { campaignId: 1, "source.originalPath": 1 },
    { unique: true, sparse: true }
  );
  const legacyNativeEntry = entryDocument({
    id: new ObjectId(),
    campaignId: ids.campaignA,
    title: "Legacy native entry",
    status: "archived"
  });
  legacyNativeEntry.source = { kind: "partyCodex" };
  await database.collection("entries").insertOne(legacyNativeEntry);
  await ensureCodexIndexes();
  await ensureCodexIndexes();
  await seedDatabase();

  const app = createApp({
    appConfig: {
      ...config,
      allowedOrigins: ["http://localhost:5173"],
      apiRateLimit: 10_000
    },
    appLogger: silentLogger
  });
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server?.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  if (database) {
    assertDisposableTarget();
    await database.dropDatabase();
  }
  await closeMongo({ silent: true });
});

test("exact campaign membership gates reads for every actor state", async () => {
  const campaignId = ids.campaignA.toString();
  const pathname = `/api/entries/${ids.publicEntry}`;
  const cases = [
    ["owner@example.test", 200],
    ["gm@example.test", 200],
    ["player@example.test", 200],
    ["non-member@example.test", 403],
    ["removed@example.test", 403],
    ["platform-admin@example.test", 403],
    ["other-owner@example.test", 403]
  ];
  for (const [email, expectedStatus] of cases) {
    const response = await api(pathname, { token: tokens[email], campaignId });
    assert.equal(response.status, expectedStatus, `${email} received ${response.status}`);
  }
  const guest = await api(pathname, { campaignId });
  assert.equal(guest.status, 401);
});

test("route campaign identity wins over a conflicting compatibility header without crossing tenants", async () => {
  const playerToken = tokens["player@example.test"];
  const denied = await api(`/api/campaigns/${ids.campaignB}/archive`, {
    token: playerToken,
    campaignId: ids.campaignA.toString()
  });
  assert.equal(denied.status, 403);

  const routeWins = await api(`/api/campaigns/${ids.campaignA}/archive`, {
    token: playerToken,
    campaignId: ids.campaignB.toString()
  });
  assert.equal(routeWins.status, 200);
  assert.equal(routeWins.json?.campaign?.id, ids.campaignA.toString());
  assert.notEqual(routeWins.json?.campaign?.id, ids.campaignB.toString());
  assert.equal(routeWins.json?.archive?.counts?.entries, 2);
  assert.deepEqual(
    routeWins.json?.archive?.recent?.entries?.map((entry) => entry.id).sort(),
    [ids.publicEntry, ids.revealedEntry].map(String).sort()
  );
  assert.doesNotMatch(routeWins.text, /Archived entry/);
  assert.doesNotMatch(routeWins.text, /Other campaign entry/);
});

test("player entry JSON is allowlisted and excludes GM, source, hidden, draft, and cross-campaign data", async () => {
  const playerToken = tokens["player@example.test"];
  const campaignId = ids.campaignA.toString();
  const publicResponse = await api(`/api/entries/${ids.publicEntry}`, { token: playerToken, campaignId });
  assert.equal(publicResponse.status, 200);
  assert.equal(publicResponse.json?.entry?.gmContent, "");
  assert.equal("source" in publicResponse.json.entry, false);
  assert.equal("createdBy" in publicResponse.json.entry, false);
  assert.equal("updatedBy" in publicResponse.json.entry, false);
  assert.equal(publicResponse.json?.entry?.metadata?.frontmatter?.pins?.length, 1);
  assert.equal(publicResponse.json?.entry?.metadata?.frontmatter?.pins?.[0]?.label, "Visible pin");
  for (const marker of [
    "GM_ONLY_MARKER",
    "PRIVATE_METADATA_MARKER",
    "PIN_GM_MARKER",
    "HIDDEN_PIN_MARKER",
    "SOURCE_TOKEN_MARKER"
  ]) {
    assert.doesNotMatch(publicResponse.text, new RegExp(marker));
  }

  const list = await api("/api/entries", { token: playerToken, campaignId });
  assert.equal(list.status, 200);
  const titles = list.json.entries.map((entry) => entry.title).sort();
  assert.deepEqual(titles, ["Public entry", "Revealed entry"]);

  for (const entryId of [ids.hiddenEntry, ids.reviewEntry, ids.draftEntry, ids.archivedEntry, ids.otherCampaignEntry]) {
    const response = await api(`/api/entries/${entryId}`, { token: playerToken, campaignId });
    assert.equal(response.status, 404, `${entryId} returned ${response.status}`);
  }
});

test("owner and GM creates succeed while player and non-member writes are denied", async () => {
  const campaignId = ids.campaignA.toString();
  const payload = (title, path) => ({
    title,
    path,
    type: "lore",
    category: "lore",
    visibility: "public",
    summary: `${title} summary`,
    publicNotes: `${title} public notes`,
    gmSecrets: `${title} GM secret`
  });

  const ownerWrite = await api("/api/page", {
    token: tokens["owner@example.test"],
    campaignId,
    method: "POST",
    body: payload("Owner-created entry", "lore/owner-created-entry.md")
  });
  assert.equal(ownerWrite.status, 201, ownerWrite.text);

  const gmWrite = await api("/api/page", {
    token: tokens["gm@example.test"],
    campaignId,
    method: "POST",
    body: payload("GM-created entry", "lore/gm-created-entry.md")
  });
  assert.equal(gmWrite.status, 201, gmWrite.text);

  for (const email of [
    "player@example.test",
    "non-member@example.test",
    "removed@example.test",
    "platform-admin@example.test",
    "other-owner@example.test"
  ]) {
    const denied = await api("/api/page", {
      token: tokens[email],
      campaignId,
      method: "POST",
      body: payload("Denied entry", `lore/denied-${email}.md`)
    });
    assert.equal(denied.status, 403, `${email} received ${denied.status}`);
  }

  const ownerEntry = await database.collection("entries").findOne({ campaignId: ids.campaignA, path: "lore/owner-created-entry.md" });
  const gmEntry = await database.collection("entries").findOne({ campaignId: ids.campaignA, path: "lore/gm-created-entry.md" });
  assert.ok(ownerEntry?._id);
  assert.ok(gmEntry?._id);
  assert.equal(ownerEntry?.source?.originalPath, "partyCodex:lore/owner-created-entry.md");
  assert.equal(gmEntry?.source?.originalPath, "partyCodex:lore/gm-created-entry.md");
  assert.equal(await database.collection("entries").countDocuments({ campaignId: ids.campaignA, title: "Denied entry" }), 0);

  const [ownerRead, gmRead, playerRead] = await Promise.all([
    api(`/api/entries/${ownerEntry._id}`, { token: tokens["owner@example.test"], campaignId }),
    api(`/api/entries/${ownerEntry._id}`, { token: tokens["gm@example.test"], campaignId }),
    api(`/api/entries/${ownerEntry._id}`, { token: tokens["player@example.test"], campaignId })
  ]);
  assert.equal(ownerRead.status, 200);
  assert.equal(gmRead.status, 200);
  assert.equal(ownerEntry?.title, "Owner-created entry");
  assert.match(ownerRead.json.entry.gmContent, /Owner-created entry GM secret/);
  assert.match(gmRead.json.entry.gmContent, /Owner-created entry GM secret/);
  assert.equal(playerRead.status, 200);
  assert.equal(playerRead.json.entry.gmContent, "");
  assert.doesNotMatch(playerRead.text, /Owner-created entry GM secret/);

  const archiveOwnerEntry = await api(`/api/page?path=${encodeURIComponent(ownerEntry.path)}`, {
    token: tokens["owner@example.test"],
    campaignId,
    method: "DELETE"
  });
  assert.equal(archiveOwnerEntry.status, 200, archiveOwnerEntry.text);

  const recreateOwnerEntry = await api("/api/page", {
    token: tokens["owner@example.test"],
    campaignId,
    method: "POST",
    body: payload("Recreated owner entry", ownerEntry.path)
  });
  assert.equal(recreateOwnerEntry.status, 201, recreateOwnerEntry.text);

  const archivedOwnerEntry = await database.collection("entries").findOne({ _id: ownerEntry._id });
  const replacementOwnerEntry = await database.collection("entries").findOne({
    campaignId: ids.campaignA,
    path: ownerEntry.path,
    status: { $ne: "archived" }
  });
  assert.equal(archivedOwnerEntry?.status, "archived");
  assert.equal(archivedOwnerEntry?.source?.kind, "partyCodex");
  assert.equal(
    archivedOwnerEntry?.source?.originalPath,
    `partyCodex:archived:${ownerEntry._id}:${ownerEntry.path}`
  );
  assert.notEqual(replacementOwnerEntry?._id?.toString(), ownerEntry._id.toString());
  assert.equal(replacementOwnerEntry?.source?.originalPath, `partyCodex:${ownerEntry.path}`);
});

test("source keys preserve the rollback index and per-campaign import uniqueness", async () => {
  const sourceIndexes = (await database.collection("entries").indexes()).filter((index) => (
    index.key?.campaignId === 1 && index.key?.["source.originalPath"] === 1
  ));
  assert.equal(sourceIndexes.length, 1);
  assert.equal(sourceIndexes[0].name, "campaignId_1_source.originalPath_1");
  assert.equal(sourceIndexes[0].unique, true);
  assert.equal(sourceIndexes[0].sparse, true);
  assert.equal(sourceIndexes[0].partialFilterExpression, undefined);

  const reservedPath = "partyCodex:lore/owner-created-entry.md";
  await assert.rejects(
    upsertEntryFromImport(importedEntryDocument({
      campaignId: ids.campaignA,
      title: "Reserved namespace import",
      originalPath: reservedPath
    })),
    (error) => error?.status === 400 && error?.code === "ENTRY_SOURCE_PATH_RESERVED"
  );
  const nativeAfterRejectedImport = await database.collection("entries").findOne({
    campaignId: ids.campaignA,
    "source.originalPath": reservedPath
  });
  assert.equal(nativeAfterRejectedImport?.title, "Recreated owner entry");
  assert.equal(await database.collection("entries").countDocuments({
    campaignId: ids.campaignA,
    title: "Reserved namespace import"
  }), 0);

  const originalPath = "imports/shared-source.md";
  const first = await upsertEntryFromImport(importedEntryDocument({
    campaignId: ids.campaignA,
    title: "Imported source v1",
    originalPath
  }));
  const updated = await upsertEntryFromImport(importedEntryDocument({
    campaignId: ids.campaignA,
    title: "Imported source v2",
    originalPath
  }));
  const otherCampaign = await upsertEntryFromImport(importedEntryDocument({
    campaignId: ids.campaignB,
    title: "Imported source in campaign B",
    originalPath
  }));

  assert.equal(first.inserted, true);
  assert.equal(updated.inserted, false);
  assert.equal(first.entry._id.toString(), updated.entry._id.toString());
  assert.equal(updated.entry.title, "Imported source v2");
  assert.equal(updated.entry.createdAt, first.entry.createdAt);
  assert.equal(otherCampaign.inserted, true);
  assert.equal(await database.collection("entries").countDocuments({
    campaignId: ids.campaignA,
    "source.originalPath": originalPath
  }), 1);
  assert.equal(await database.collection("entries").countDocuments({
    campaignId: ids.campaignB,
    "source.originalPath": originalPath
  }), 1);

  await assert.rejects(
    database.collection("entries").insertOne(importedEntryDocument({
      campaignId: ids.campaignA,
      title: "Duplicate imported source",
      originalPath
    })),
    (error) => error?.code === 11000
  );
});
