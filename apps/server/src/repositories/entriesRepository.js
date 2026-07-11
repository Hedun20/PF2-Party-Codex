import { ObjectId } from "mongodb";
import { getDb, mongoStatus } from "../db/mongo.js";
import { collections } from "./collections.js";

export function isMongoEntriesEnabled() {
  return mongoStatus().connected;
}

function now() {
  return new Date().toISOString();
}

export function idString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof ObjectId) return value.toString();
  if (value._id) return idString(value._id);
  return String(value);
}

export function objectIdFrom(id = "") {
  return ObjectId.isValid(String(id)) ? new ObjectId(String(id)) : null;
}

function entries() {
  return getDb().collection(collections.entries);
}

function relations() {
  return getDb().collection(collections.entryRelations);
}

function importJobs() {
  return getDb().collection(collections.importJobs);
}

function maps() {
  return getDb().collection(collections.maps);
}

function mapObjects() {
  return getDb().collection(collections.mapObjects);
}

export async function ensureCodexIndexes() {
  if (!isMongoEntriesEnabled()) return [];
  await entries().createIndex({ campaignId: 1, "source.originalPath": 1 }, { unique: true, sparse: true });
  await entries().createIndex({ campaignId: 1, slug: 1 });
  await entries().createIndex({ campaignId: 1, type: 1, visibility: 1 });
  await entries().createIndex({ campaignId: 1, worldId: 1 });
  await entries().createIndex({ campaignId: 1, tags: 1 });
  await relations().createIndex({ campaignId: 1, sourceEntryId: 1, targetEntryId: 1, type: 1 });
  await importJobs().createIndex({ campaignId: 1, type: 1, createdAt: -1 });
  await maps().createIndex({ campaignId: 1, worldId: 1 });
  await mapObjects().createIndex({ campaignId: 1, mapId: 1, visibility: 1 });
  return [
    "entries.campaignId_source.originalPath",
    "entries.campaignId_slug",
    "entries.campaignId_type_visibility",
    "entries.campaignId_worldId",
    "entries.campaignId_tags",
    "entryRelations.campaignId_source_target_type",
    "importJobs.campaignId_type_createdAt",
    "maps.campaignId_worldId",
    "mapObjects.campaignId_mapId_visibility"
  ];
}

export function publicEntry(entry) {
  if (!entry) return null;
  return {
    id: idString(entry._id),
    campaignId: idString(entry.campaignId),
    worldId: idString(entry.worldId),
    type: entry.type || "lore",
    category: entry.category || "lore",
    title: entry.title || "Untitled",
    slug: entry.slug || "",
    path: entry.path || "",
    summary: entry.summary || "",
    publicContent: entry.publicContent || "",
    gmContent: entry.gmContent || "",
    status: entry.status || "active",
    visibility: entry.visibility || "public",
    tags: entry.tags || [],
    aliases: entry.aliases || [],
    metadata: entry.metadata || {},
    source: entry.source || {},
    createdBy: idString(entry.createdBy),
    updatedBy: idString(entry.updatedBy),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  };
}

function playerVisibleObject(item = {}) {
  return ["public", "revealed"].includes(String(item.visibility || "public")) && item.type !== "secret";
}

function playerSafeObjects(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(playerVisibleObject).map((item) => {
    const {
      gmNotes: _gmNotes,
      gmSecrets: _gmSecrets,
      gmContent: _gmContent,
      secret: _secret,
      secrets: _secrets,
      privateNotes: _privateNotes,
      ...safe
    } = item || {};
    return safe;
  });
}

function playerSafeMetadata(metadata = {}) {
  const frontmatter = metadata.frontmatter || {};
  const pins = playerSafeObjects(frontmatter.pins || metadata.pins);
  const mapObjects = playerSafeObjects(frontmatter.mapObjects || metadata.mapObjects);
  const safeFrontmatter = {
    title: frontmatter.title,
    name: frontmatter.name,
    type: frontmatter.type,
    category: frontmatter.category,
    summary: frontmatter.summary,
    visibility: frontmatter.visibility,
    tags: frontmatter.tags,
    aliases: frontmatter.aliases,
    related: frontmatter.related,
    world: frontmatter.world,
    country: frontmatter.country,
    city: frontmatter.city,
    parent: frontmatter.parent,
    mapImage: frontmatter.mapImage,
    avatarImage: frontmatter.avatarImage,
    tokenImage: frontmatter.tokenImage,
    handoutImage: frontmatter.handoutImage,
    image: frontmatter.image,
    pins,
    mapObjects
  };
  return {
    sourceCategory: metadata.sourceCategory,
    originalType: metadata.originalType,
    related: metadata.related,
    world: metadata.world,
    country: metadata.country,
    city: metadata.city,
    parent: metadata.parent,
    mapImage: metadata.mapImage,
    avatarImage: metadata.avatarImage,
    tokenImage: metadata.tokenImage,
    handoutImage: metadata.handoutImage,
    image: metadata.image,
    pins,
    mapObjects,
    frontmatter: safeFrontmatter
  };
}

export function publicRelation(relation) {
  if (!relation) return null;
  return {
    id: idString(relation._id),
    campaignId: idString(relation.campaignId),
    sourceEntryId: idString(relation.sourceEntryId),
    targetEntryId: idString(relation.targetEntryId),
    type: relation.type || "related",
    visibility: relation.visibility || "public",
    label: relation.label || "",
    sourcePath: relation.sourcePath || "",
    targetPath: relation.targetPath || "",
    createdAt: relation.createdAt,
    updatedAt: relation.updatedAt
  };
}

export function playerSafeEntry(entry) {
  const item = publicEntry(entry);
  if (!item) return null;
  if (["gmOnly", "hidden", "needsReview"].includes(item.visibility) || ["draft", "archived"].includes(item.status)) return null;
  return {
    ...item,
    gmContent: "",
    metadata: playerSafeMetadata(item.metadata),
    source: undefined,
    createdBy: undefined,
    updatedBy: undefined
  };
}

export async function listEntries({ campaignId, role = "player", type = "", search = "", limit = 200 } = {}) {
  if (!isMongoEntriesEnabled()) return [];
  const campaignObjectId = objectIdFrom(campaignId) || campaignId;
  const query = { campaignId: campaignObjectId, status: { $ne: "archived" } };
  if (type) query.type = type;
  if (!["owner", "gm"].includes(role)) {
    query.visibility = { $in: ["public", "revealed"] };
    query.status = { $nin: ["draft", "archived"] };
  }
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { summary: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } }
    ];
  }
  const docs = await entries().find(query).sort({ title: 1 }).limit(Math.min(Number(limit) || 200, 500)).toArray();
  return docs.map((entry) => (["owner", "gm"].includes(role) ? publicEntry(entry) : playerSafeEntry(entry))).filter(Boolean);
}

export async function findEntryById({ campaignId, id, role = "player" }) {
  if (!isMongoEntriesEnabled()) return null;
  const objectId = objectIdFrom(id);
  if (!objectId) return null;
  const campaignObjectId = objectIdFrom(campaignId) || campaignId;
  const entry = await entries().findOne({ _id: objectId, campaignId: campaignObjectId, status: { $ne: "archived" } });
  if (!entry) return null;
  return ["owner", "gm"].includes(role) ? publicEntry(entry) : playerSafeEntry(entry);
}

export async function findEntryByPath({ campaignId, path, role = "player" }) {
  if (!isMongoEntriesEnabled()) return null;
  const campaignObjectId = objectIdFrom(campaignId) || campaignId;
  const entry = await entries().findOne({ campaignId: campaignObjectId, path: String(path || ""), status: { $ne: "archived" } });
  if (!entry) return null;
  return ["owner", "gm"].includes(role) ? publicEntry(entry) : playerSafeEntry(entry);
}

export async function findRawEntryByPath({ campaignId, path } = {}) {
  if (!isMongoEntriesEnabled()) return null;
  const campaignObjectId = objectIdFrom(campaignId) || campaignId;
  return entries().findOne({ campaignId: campaignObjectId, path: String(path || ""), status: { $ne: "archived" } });
}

export async function saveEntryByPath({ campaignId, requestedPath, document, userId = null, createOnly = false } = {}) {
  if (!isMongoEntriesEnabled()) {
    const error = new Error("Mongo entries storage is not connected.");
    error.status = 503;
    throw error;
  }
  const campaignObjectId = objectIdFrom(campaignId) || campaignId;
  const path = String(requestedPath || document?.path || "").trim();
  const existing = await entries().findOne({ campaignId: campaignObjectId, path, status: { $ne: "archived" } });
  if (existing && createOnly) {
    const error = new Error("An entry with this path already exists in the campaign.");
    error.status = 409;
    throw error;
  }

  const stamp = now();
  const actorId = objectIdFrom(userId) || userId || null;
  const next = {
    ...document,
    campaignId: campaignObjectId,
    path,
    worldId: objectIdFrom(document?.worldId) || document?.worldId || null,
    updatedBy: actorId,
    updatedAt: stamp
  };
  if (existing) {
    await entries().updateOne(
      { _id: existing._id, campaignId: campaignObjectId },
      { $set: next }
    );
    return { entry: await entries().findOne({ _id: existing._id, campaignId: campaignObjectId }), created: false };
  }

  const created = {
    ...next,
    createdBy: actorId,
    createdAt: stamp
  };
  const result = await entries().insertOne(created);
  return { entry: { ...created, _id: result.insertedId }, created: true };
}

export async function archiveEntryByPath({ campaignId, path, userId = null } = {}) {
  if (!isMongoEntriesEnabled()) return null;
  const campaignObjectId = objectIdFrom(campaignId) || campaignId;
  const existing = await entries().findOne({ campaignId: campaignObjectId, path: String(path || ""), status: { $ne: "archived" } });
  if (!existing) return null;
  const stamp = now();
  const trashPath = `_trash/${stamp.replace(/[-:.]/g, "")}/${existing.path}`;
  await entries().updateOne(
    { _id: existing._id, campaignId: campaignObjectId },
    { $set: { status: "archived", archivedAt: stamp, archivedBy: objectIdFrom(userId) || userId || null, trashPath, updatedAt: stamp } }
  );
  return {
    title: existing.title,
    originalPath: existing.path,
    trashPath,
    backlinkCount: 0,
    backlinks: []
  };
}

export async function countEntriesByCampaign(campaignId) {
  if (!isMongoEntriesEnabled()) return 0;
  return entries().countDocuments({ campaignId: objectIdFrom(campaignId) || campaignId });
}

export async function upsertEntryFromImport(entry) {
  const stamp = now();
  const campaignId = objectIdFrom(entry.campaignId) || entry.campaignId;
  const sourcePath = entry.source?.originalPath || entry.path;
  const filter = { campaignId, "source.originalPath": sourcePath };
  const existing = await entries().findOne(filter);
  const document = {
    ...entry,
    campaignId,
    worldId: objectIdFrom(entry.worldId) || entry.worldId || null,
    createdBy: objectIdFrom(entry.createdBy) || entry.createdBy || null,
    updatedBy: objectIdFrom(entry.updatedBy) || entry.updatedBy || null,
    updatedAt: stamp
  };
  if (existing) {
    await entries().updateOne(filter, { $set: document, $setOnInsert: { createdAt: existing.createdAt || stamp } });
    return { entry: await entries().findOne(filter), inserted: false };
  }
  const result = await entries().insertOne({ ...document, createdAt: entry.createdAt || stamp });
  return { entry: { ...document, _id: result.insertedId, createdAt: entry.createdAt || stamp }, inserted: true };
}

export async function replaceRelationsForImport({ campaignId, importJobId, relations: relationDocs = [] }) {
  const campaignObjectId = objectIdFrom(campaignId) || campaignId;
  await relations().deleteMany({ campaignId: campaignObjectId, "source.importJobId": importJobId });
  if (!relationDocs.length) return { inserted: 0 };
  const stamp = now();
  const docs = relationDocs.map((relation) => ({
    ...relation,
    campaignId: campaignObjectId,
    sourceEntryId: objectIdFrom(relation.sourceEntryId) || relation.sourceEntryId,
    targetEntryId: objectIdFrom(relation.targetEntryId) || relation.targetEntryId,
    createdAt: relation.createdAt || stamp,
    updatedAt: stamp
  }));
  const result = await relations().insertMany(docs, { ordered: false });
  return { inserted: result.insertedCount || docs.length };
}

export async function createImportJob(job) {
  const stamp = now();
  const document = {
    ...job,
    campaignId: objectIdFrom(job.campaignId) || job.campaignId,
    createdBy: objectIdFrom(job.createdBy) || job.createdBy || null,
    createdAt: job.createdAt || stamp,
    updatedAt: stamp
  };
  const result = await importJobs().insertOne(document);
  return { ...document, _id: result.insertedId };
}

export async function updateImportJob(id, patch, { campaignId = "" } = {}) {
  const objectId = objectIdFrom(id);
  if (!objectId) return null;
  const query = { _id: objectId };
  if (campaignId) query.campaignId = objectIdFrom(campaignId) || campaignId;
  await importJobs().updateOne(query, { $set: { ...patch, updatedAt: now() } });
  return importJobs().findOne(query);
}

export async function findImportJob(id, { campaignId = "" } = {}) {
  const objectId = objectIdFrom(id);
  if (!objectId) return null;
  const query = { _id: objectId };
  if (campaignId) query.campaignId = objectIdFrom(campaignId) || campaignId;
  return importJobs().findOne(query);
}

export async function listImportJobs({ campaignId, limit = 20 } = {}) {
  if (!isMongoEntriesEnabled()) return [];
  const campaignObjectId = objectIdFrom(campaignId) || campaignId;
  return importJobs().find({ campaignId: campaignObjectId }).sort({ createdAt: -1 }).limit(Math.min(Number(limit) || 20, 100)).toArray();
}

export async function rollbackImportJob(importJobId, { campaignId = "" } = {}) {
  const job = await findImportJob(importJobId, { campaignId });
  if (!job) return null;
  const jobCampaignId = job.campaignId;
  const sourceFilter = { campaignId: jobCampaignId, "source.importJobId": idString(job._id) };
  const [entryResult, relationResult, mapObjectResult, mapResult] = await Promise.all([
    entries().deleteMany(sourceFilter),
    relations().deleteMany({ campaignId: jobCampaignId, "source.importJobId": idString(job._id) }),
    mapObjects().deleteMany({ campaignId: jobCampaignId, "source.importJobId": idString(job._id) }),
    maps().deleteMany(sourceFilter)
  ]);
  const updated = await updateImportJob(idString(job._id), {
    status: "rolledBack",
    completedAt: now(),
    rollback: {
      entriesDeleted: entryResult.deletedCount || 0,
      relationsDeleted: relationResult.deletedCount || 0,
      mapObjectsDeleted: mapObjectResult.deletedCount || 0,
      mapsDeleted: mapResult.deletedCount || 0
    }
  }, { campaignId: idString(jobCampaignId) });
  return updated;
}
