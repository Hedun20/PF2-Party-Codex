import { ObjectId } from "mongodb";
import { getDb, mongoStatus } from "../db/mongo.js";
import { collections } from "./collections.js";

const GM_ROLES = new Set(["owner", "gm"]);
const CAMPAIGN_CONTENT_VISIBILITIES = new Set(["gmOnly", "public", "revealed", "hidden", "needsReview"]);
const HANDOUT_VISIBILITIES = new Set(["partyVisible", "specificPlayers", "gmOnly"]);
const SESSION_STATUSES = new Set(["planned", "running", "completed", "cancelled"]);
const MAP_OBJECT_TYPES = new Set(["pin", "area", "route", "label"]);
const MAP_OBJECT_CATEGORIES = new Set(["city", "location", "npc", "quest", "danger", "secret", "portal", "merchant"]);

export function isMongoWorldSystemsEnabled() {
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

function campaignKey(campaignId) {
  return objectIdFrom(campaignId) || campaignId;
}

function maps() {
  return getDb().collection(collections.maps);
}

function mapObjects() {
  return getDb().collection(collections.mapObjects);
}

function timelineEvents() {
  return getDb().collection(collections.timelineEvents);
}

function sessions() {
  return getDb().collection(collections.sessions);
}

function handouts() {
  return getDb().collection(collections.handouts);
}

function isGm(role = "") {
  return GM_ROLES.has(role);
}

function safeVisibility(value = "public", fallback = "public") {
  return CAMPAIGN_CONTENT_VISIBILITIES.has(String(value || "")) ? String(value) : fallback;
}

function safeHandoutVisibility(value = "partyVisible") {
  return HANDOUT_VISIBILITIES.has(String(value || "")) ? String(value) : "partyVisible";
}

function cleanString(value = "", limit = 20000) {
  const text = String(value ?? "").trim();
  return text.length > limit ? text.slice(0, limit) : text;
}

function cleanShort(value = "", limit = 240) {
  return cleanString(value, limit);
}

function cleanArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanShort(item, 200)).filter(Boolean).slice(0, 200);
}

function cleanIdArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => objectIdFrom(item) || cleanShort(item, 120)).filter(Boolean).slice(0, 200);
}

function publicLayer(layer = {}) {
  const id = cleanShort(layer.id || layer.name || `layer-${Math.random().toString(36).slice(2, 8)}`, 120);
  return {
    id,
    name: cleanShort(layer.name || id || "Layer", 120),
    visibility: safeVisibility(layer.visibility || "public")
  };
}

function cleanViewport(input = {}) {
  const numberOrDefault = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    defaultZoom: numberOrDefault(input.defaultZoom, 1),
    defaultX: numberOrDefault(input.defaultX, 0),
    defaultY: numberOrDefault(input.defaultY, 0)
  };
}

function normalizeGeometry(input = {}) {
  const numberOrNull = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const points = Array.isArray(input.points)
    ? input.points.slice(0, 500).map((point) => ({ x: numberOrNull(point?.x), y: numberOrNull(point?.y) })).filter((point) => point.x !== null && point.y !== null)
    : [];
  return {
    x: numberOrNull(input.x),
    y: numberOrNull(input.y),
    points
  };
}

function publicMap(map = {}) {
  return {
    id: idString(map._id),
    campaignId: idString(map.campaignId),
    worldId: idString(map.worldId),
    entryId: idString(map.entryId),
    title: map.title || "Untitled map",
    description: map.description || "",
    imageAssetId: idString(map.imageAssetId),
    imageUrl: map.imageUrl || "",
    visibility: map.visibility || "public",
    viewport: map.viewport || { defaultZoom: 1, defaultX: 0, defaultY: 0 },
    layers: Array.isArray(map.layers) ? map.layers.map(publicLayer) : [],
    source: map.source || {},
    createdBy: idString(map.createdBy),
    updatedBy: idString(map.updatedBy),
    createdAt: map.createdAt,
    updatedAt: map.updatedAt
  };
}

function playerSafeMap(map) {
  const item = publicMap(map);
  if (["gmOnly", "hidden", "needsReview"].includes(item.visibility)) return null;
  return {
    ...item,
    layers: item.layers.filter((layer) => ["public", "revealed"].includes(layer.visibility))
  };
}

function publicMapObject(object = {}) {
  return {
    id: idString(object._id),
    campaignId: idString(object.campaignId),
    mapId: idString(object.mapId),
    entryId: idString(object.entryId),
    layerId: object.layerId || "default",
    type: object.type || "pin",
    category: object.category || "location",
    label: object.label || "",
    description: object.description || "",
    geometry: object.geometry || { x: null, y: null, points: [] },
    visibility: object.visibility || "public",
    source: object.source || {},
    createdBy: idString(object.createdBy),
    updatedBy: idString(object.updatedBy),
    createdAt: object.createdAt,
    updatedAt: object.updatedAt
  };
}

function playerSafeMapObject(object) {
  const item = publicMapObject(object);
  return ["public", "revealed"].includes(item.visibility) ? item : null;
}

function publicTimelineEvent(event = {}) {
  return {
    id: idString(event._id),
    campaignId: idString(event.campaignId),
    worldId: idString(event.worldId),
    title: event.title || "Untitled event",
    description: event.description || "",
    gmNotes: event.gmNotes || "",
    dateLabel: event.dateLabel || "",
    sortIndex: Number.isFinite(Number(event.sortIndex)) ? Number(event.sortIndex) : 0,
    era: event.era || "",
    branch: event.branch || "main",
    linkedEntryIds: (event.linkedEntryIds || []).map(idString),
    linkedSessionId: idString(event.linkedSessionId),
    visibility: event.visibility || "public",
    source: event.source || {},
    createdBy: idString(event.createdBy),
    updatedBy: idString(event.updatedBy),
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
}

function playerSafeTimelineEvent(event) {
  const item = publicTimelineEvent(event);
  if (!["public", "revealed"].includes(item.visibility)) return null;
  return { ...item, gmNotes: "" };
}

function publicSession(session = {}) {
  return {
    id: idString(session._id),
    campaignId: idString(session.campaignId),
    title: session.title || "Untitled session",
    number: Number.isFinite(Number(session.number)) ? Number(session.number) : null,
    scheduledAt: session.scheduledAt || "",
    status: session.status || "planned",
    visibility: session.visibility || "gmOnly",
    prepNotes: session.prepNotes || "",
    recapPublic: session.recapPublic || "",
    recapGm: session.recapGm || "",
    linkedEntryIds: (session.linkedEntryIds || []).map(idString),
    linkedMapIds: (session.linkedMapIds || []).map(idString),
    linkedNpcIds: (session.linkedNpcIds || []).map(idString),
    linkedQuestIds: (session.linkedQuestIds || []).map(idString),
    attendance: Array.isArray(session.attendance) ? session.attendance.map((item) => ({ userId: idString(item.userId), characterId: idString(item.characterId), status: item.status || "unknown" })) : [],
    createdBy: idString(session.createdBy),
    updatedBy: idString(session.updatedBy),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
}

function playerSafeSession(session) {
  const item = publicSession(session);
  if (!["public", "revealed"].includes(item.visibility)) return null;
  return { ...item, prepNotes: "", recapGm: "" };
}

function publicHandout(handout = {}) {
  return {
    id: idString(handout._id),
    campaignId: idString(handout.campaignId),
    title: handout.title || "Untitled handout",
    body: handout.body || "",
    note: handout.note || "",
    assetIds: (handout.assetIds || []).map(idString),
    linkedEntryIds: (handout.linkedEntryIds || []).map(idString),
    linkedSessionId: idString(handout.linkedSessionId),
    visibility: handout.visibility || "partyVisible",
    visibleToUserIds: (handout.visibleToUserIds || []).map(idString),
    releasedBy: idString(handout.releasedBy),
    releasedAt: handout.releasedAt || "",
    source: handout.source || {},
    createdBy: idString(handout.createdBy),
    updatedBy: idString(handout.updatedBy),
    createdAt: handout.createdAt,
    updatedAt: handout.updatedAt
  };
}

function playerCanSeeHandout(handout, userId) {
  const visibility = handout.visibility || "partyVisible";
  if (visibility === "partyVisible") return true;
  if (visibility === "specificPlayers") return (handout.visibleToUserIds || []).map(idString).includes(idString(userId));
  return false;
}

function normalizeMapInput({ campaignId, userId, input = {}, existing = null }) {
  const stamp = now();
  const layers = Array.isArray(input.layers) ? input.layers.map(publicLayer).slice(0, 50) : existing?.layers || [{ id: "default", name: "Default", visibility: "public" }];
  return {
    campaignId: campaignKey(campaignId),
    worldId: objectIdFrom(input.worldId) || input.worldId || existing?.worldId || null,
    entryId: objectIdFrom(input.entryId) || input.entryId || existing?.entryId || null,
    title: cleanShort(input.title ?? existing?.title ?? "Untitled map", 180) || "Untitled map",
    description: cleanString(input.description ?? existing?.description ?? "", 2000),
    imageAssetId: objectIdFrom(input.imageAssetId) || input.imageAssetId || existing?.imageAssetId || null,
    imageUrl: cleanString(input.imageUrl ?? existing?.imageUrl ?? "", 1000),
    visibility: safeVisibility(input.visibility ?? existing?.visibility ?? "public"),
    viewport: cleanViewport(input.viewport || existing?.viewport || {}),
    layers,
    source: input.source || existing?.source || { kind: "manual" },
    updatedBy: objectIdFrom(userId) || userId || null,
    updatedAt: stamp
  };
}

function normalizeMapObjectInput({ campaignId, mapId, userId, input = {}, existing = null }) {
  const stamp = now();
  const type = MAP_OBJECT_TYPES.has(String(input.type || existing?.type || "pin")) ? String(input.type || existing?.type || "pin") : "pin";
  const category = MAP_OBJECT_CATEGORIES.has(String(input.category || existing?.category || "location")) ? String(input.category || existing?.category || "location") : "location";
  return {
    campaignId: campaignKey(campaignId),
    mapId: objectIdFrom(mapId || input.mapId || existing?.mapId) || mapId || input.mapId || existing?.mapId,
    entryId: objectIdFrom(input.entryId) || input.entryId || existing?.entryId || null,
    layerId: cleanShort(input.layerId ?? existing?.layerId ?? "default", 120) || "default",
    type,
    category,
    label: cleanShort(input.label ?? existing?.label ?? "", 180),
    description: cleanString(input.description ?? existing?.description ?? "", 2000),
    geometry: normalizeGeometry(input.geometry || existing?.geometry || {}),
    visibility: safeVisibility(input.visibility ?? existing?.visibility ?? "public"),
    source: input.source || existing?.source || { kind: "manual" },
    updatedBy: objectIdFrom(userId) || userId || null,
    updatedAt: stamp
  };
}

function normalizeTimelineInput({ campaignId, userId, input = {}, existing = null }) {
  const stamp = now();
  return {
    campaignId: campaignKey(campaignId),
    worldId: objectIdFrom(input.worldId) || input.worldId || existing?.worldId || null,
    title: cleanShort(input.title ?? existing?.title ?? "Untitled event", 180) || "Untitled event",
    description: cleanString(input.description ?? existing?.description ?? "", 5000),
    gmNotes: cleanString(input.gmNotes ?? existing?.gmNotes ?? "", 5000),
    dateLabel: cleanShort(input.dateLabel ?? existing?.dateLabel ?? "", 120),
    sortIndex: Number.isFinite(Number(input.sortIndex ?? existing?.sortIndex)) ? Number(input.sortIndex ?? existing?.sortIndex) : 0,
    era: cleanShort(input.era ?? existing?.era ?? "", 120),
    branch: cleanShort(input.branch ?? existing?.branch ?? "main", 120) || "main",
    linkedEntryIds: cleanIdArray(input.linkedEntryIds ?? existing?.linkedEntryIds),
    linkedSessionId: objectIdFrom(input.linkedSessionId) || input.linkedSessionId || existing?.linkedSessionId || null,
    visibility: safeVisibility(input.visibility ?? existing?.visibility ?? "public"),
    source: input.source || existing?.source || { kind: "manual" },
    updatedBy: objectIdFrom(userId) || userId || null,
    updatedAt: stamp
  };
}

function normalizeSessionInput({ campaignId, userId, input = {}, existing = null }) {
  const stamp = now();
  const status = SESSION_STATUSES.has(String(input.status || existing?.status || "planned")) ? String(input.status || existing?.status || "planned") : "planned";
  const attendance = Array.isArray(input.attendance)
    ? input.attendance.slice(0, 200).map((item) => ({
      userId: objectIdFrom(item.userId) || item.userId || null,
      characterId: objectIdFrom(item.characterId) || item.characterId || null,
      status: cleanShort(item.status || "unknown", 60) || "unknown"
    }))
    : existing?.attendance || [];
  return {
    campaignId: campaignKey(campaignId),
    title: cleanShort(input.title ?? existing?.title ?? "Untitled session", 180) || "Untitled session",
    number: Number.isFinite(Number(input.number ?? existing?.number)) ? Number(input.number ?? existing?.number) : null,
    scheduledAt: cleanShort(input.scheduledAt ?? existing?.scheduledAt ?? "", 120),
    status,
    visibility: safeVisibility(input.visibility ?? existing?.visibility ?? "gmOnly", "gmOnly"),
    prepNotes: cleanString(input.prepNotes ?? existing?.prepNotes ?? "", 10000),
    recapPublic: cleanString(input.recapPublic ?? existing?.recapPublic ?? "", 10000),
    recapGm: cleanString(input.recapGm ?? existing?.recapGm ?? "", 10000),
    linkedEntryIds: cleanIdArray(input.linkedEntryIds ?? existing?.linkedEntryIds),
    linkedMapIds: cleanIdArray(input.linkedMapIds ?? existing?.linkedMapIds),
    linkedNpcIds: cleanIdArray(input.linkedNpcIds ?? existing?.linkedNpcIds),
    linkedQuestIds: cleanIdArray(input.linkedQuestIds ?? existing?.linkedQuestIds),
    attendance,
    updatedBy: objectIdFrom(userId) || userId || null,
    updatedAt: stamp
  };
}

function normalizeHandoutInput({ campaignId, userId, input = {}, existing = null }) {
  const stamp = now();
  const visibility = safeHandoutVisibility(input.visibility ?? existing?.visibility ?? "partyVisible");
  const releasedAt = input.releasedAt ?? existing?.releasedAt ?? (visibility !== "gmOnly" ? stamp : "");
  return {
    campaignId: campaignKey(campaignId),
    title: cleanShort(input.title ?? existing?.title ?? "Untitled handout", 180) || "Untitled handout",
    body: cleanString(input.body ?? existing?.body ?? "", 10000),
    note: cleanString(input.note ?? existing?.note ?? "", 2000),
    assetIds: cleanIdArray(input.assetIds ?? existing?.assetIds),
    linkedEntryIds: cleanIdArray(input.linkedEntryIds ?? existing?.linkedEntryIds),
    linkedSessionId: objectIdFrom(input.linkedSessionId) || input.linkedSessionId || existing?.linkedSessionId || null,
    visibility,
    visibleToUserIds: cleanIdArray(input.visibleToUserIds ?? existing?.visibleToUserIds),
    releasedBy: objectIdFrom(input.releasedBy || existing?.releasedBy || userId) || input.releasedBy || existing?.releasedBy || userId || null,
    releasedAt,
    source: input.source || existing?.source || { kind: "manual" },
    updatedBy: objectIdFrom(userId) || userId || null,
    updatedAt: stamp
  };
}

export async function ensureWorldSystemIndexes() {
  if (!isMongoWorldSystemsEnabled()) return [];
  await maps().createIndex({ campaignId: 1, worldId: 1, title: 1 });
  await maps().createIndex({ campaignId: 1, visibility: 1 });
  await mapObjects().createIndex({ campaignId: 1, mapId: 1, visibility: 1 });
  await mapObjects().createIndex({ campaignId: 1, entryId: 1 });
  await timelineEvents().createIndex({ campaignId: 1, worldId: 1, sortIndex: 1 });
  await timelineEvents().createIndex({ campaignId: 1, visibility: 1 });
  await sessions().createIndex({ campaignId: 1, scheduledAt: -1 });
  await sessions().createIndex({ campaignId: 1, status: 1, visibility: 1 });
  await handouts().createIndex({ campaignId: 1, visibility: 1, releasedAt: -1 });
  await handouts().createIndex({ campaignId: 1, visibleToUserIds: 1 });
  return [
    "maps.campaignId_worldId_title",
    "maps.campaignId_visibility",
    "mapObjects.campaignId_mapId_visibility",
    "mapObjects.campaignId_entryId",
    "timelineEvents.campaignId_worldId_sortIndex",
    "timelineEvents.campaignId_visibility",
    "sessions.campaignId_scheduledAt",
    "sessions.campaignId_status_visibility",
    "handouts.campaignId_visibility_releasedAt",
    "handouts.campaignId_visibleToUserIds"
  ];
}

export async function listMaps({ campaignId, role = "player", worldId = "", search = "", limit = 200 } = {}) {
  if (!isMongoWorldSystemsEnabled()) return [];
  const query = { campaignId: campaignKey(campaignId) };
  if (worldId) query.worldId = objectIdFrom(worldId) || worldId;
  if (!isGm(role)) query.visibility = { $in: ["public", "revealed"] };
  if (search) query.title = { $regex: cleanShort(search, 100), $options: "i" };
  const docs = await maps().find(query).sort({ title: 1 }).limit(Math.min(Number(limit) || 200, 500)).toArray();
  return docs.map((doc) => (isGm(role) ? publicMap(doc) : playerSafeMap(doc))).filter(Boolean);
}

export async function findMapById({ campaignId, id, role = "player" }) {
  if (!isMongoWorldSystemsEnabled()) return null;
  const _id = objectIdFrom(id);
  if (!_id) return null;
  const doc = await maps().findOne({ _id, campaignId: campaignKey(campaignId) });
  if (!doc) return null;
  return isGm(role) ? publicMap(doc) : playerSafeMap(doc);
}

export async function createMap({ campaignId, userId, input }) {
  const stamp = now();
  const document = {
    ...normalizeMapInput({ campaignId, userId, input }),
    createdBy: objectIdFrom(userId) || userId || null,
    createdAt: stamp
  };
  const result = await maps().insertOne(document);
  return publicMap({ ...document, _id: result.insertedId });
}

export async function updateMap({ campaignId, id, userId, input }) {
  const _id = objectIdFrom(id);
  if (!_id) return null;
  const existing = await maps().findOne({ _id, campaignId: campaignKey(campaignId) });
  if (!existing) return null;
  const patch = normalizeMapInput({ campaignId, userId, input, existing });
  await maps().updateOne({ _id, campaignId: campaignKey(campaignId) }, { $set: patch });
  return publicMap(await maps().findOne({ _id }));
}

export async function deleteMap({ campaignId, id }) {
  const _id = objectIdFrom(id);
  if (!_id) return false;
  const result = await maps().deleteOne({ _id, campaignId: campaignKey(campaignId) });
  if (result.deletedCount) await mapObjects().deleteMany({ campaignId: campaignKey(campaignId), mapId: _id });
  return result.deletedCount > 0;
}

export async function listMapObjects({ campaignId, mapId = "", role = "player", category = "" } = {}) {
  if (!isMongoWorldSystemsEnabled()) return [];
  const query = { campaignId: campaignKey(campaignId) };
  if (mapId) query.mapId = objectIdFrom(mapId) || mapId;
  if (category) query.category = category;
  if (!isGm(role)) query.visibility = { $in: ["public", "revealed"] };
  const docs = await mapObjects().find(query).sort({ label: 1, createdAt: 1 }).limit(2000).toArray();
  return docs.map((doc) => (isGm(role) ? publicMapObject(doc) : playerSafeMapObject(doc))).filter(Boolean);
}

export async function createMapObject({ campaignId, mapId, userId, input }) {
  const stamp = now();
  const document = {
    ...normalizeMapObjectInput({ campaignId, mapId, userId, input }),
    createdBy: objectIdFrom(userId) || userId || null,
    createdAt: stamp
  };
  const result = await mapObjects().insertOne(document);
  return publicMapObject({ ...document, _id: result.insertedId });
}

export async function updateMapObject({ campaignId, id, userId, input }) {
  const _id = objectIdFrom(id);
  if (!_id) return null;
  const existing = await mapObjects().findOne({ _id, campaignId: campaignKey(campaignId) });
  if (!existing) return null;
  const patch = normalizeMapObjectInput({ campaignId, mapId: existing.mapId, userId, input, existing });
  await mapObjects().updateOne({ _id, campaignId: campaignKey(campaignId) }, { $set: patch });
  return publicMapObject(await mapObjects().findOne({ _id }));
}

export async function deleteMapObject({ campaignId, id }) {
  const _id = objectIdFrom(id);
  if (!_id) return false;
  const result = await mapObjects().deleteOne({ _id, campaignId: campaignKey(campaignId) });
  return result.deletedCount > 0;
}

export async function listTimelineEvents({ campaignId, role = "player", worldId = "", branch = "", limit = 500 } = {}) {
  if (!isMongoWorldSystemsEnabled()) return [];
  const query = { campaignId: campaignKey(campaignId) };
  if (worldId) query.worldId = objectIdFrom(worldId) || worldId;
  if (branch) query.branch = branch;
  if (!isGm(role)) query.visibility = { $in: ["public", "revealed"] };
  const docs = await timelineEvents().find(query).sort({ sortIndex: 1, dateLabel: 1, createdAt: 1 }).limit(Math.min(Number(limit) || 500, 2000)).toArray();
  return docs.map((doc) => (isGm(role) ? publicTimelineEvent(doc) : playerSafeTimelineEvent(doc))).filter(Boolean);
}

export async function createTimelineEvent({ campaignId, userId, input }) {
  const stamp = now();
  const document = {
    ...normalizeTimelineInput({ campaignId, userId, input }),
    createdBy: objectIdFrom(userId) || userId || null,
    createdAt: stamp
  };
  const result = await timelineEvents().insertOne(document);
  return publicTimelineEvent({ ...document, _id: result.insertedId });
}

export async function updateTimelineEvent({ campaignId, id, userId, input }) {
  const _id = objectIdFrom(id);
  if (!_id) return null;
  const existing = await timelineEvents().findOne({ _id, campaignId: campaignKey(campaignId) });
  if (!existing) return null;
  const patch = normalizeTimelineInput({ campaignId, userId, input, existing });
  await timelineEvents().updateOne({ _id, campaignId: campaignKey(campaignId) }, { $set: patch });
  return publicTimelineEvent(await timelineEvents().findOne({ _id }));
}

export async function deleteTimelineEvent({ campaignId, id }) {
  const _id = objectIdFrom(id);
  if (!_id) return false;
  const result = await timelineEvents().deleteOne({ _id, campaignId: campaignKey(campaignId) });
  return result.deletedCount > 0;
}

export async function listCampaignSessions({ campaignId, role = "player", status = "", limit = 100 } = {}) {
  if (!isMongoWorldSystemsEnabled()) return [];
  const query = { campaignId: campaignKey(campaignId) };
  if (status) query.status = status;
  if (!isGm(role)) query.visibility = { $in: ["public", "revealed"] };
  const docs = await sessions().find(query).sort({ scheduledAt: -1, number: -1, createdAt: -1 }).limit(Math.min(Number(limit) || 100, 500)).toArray();
  return docs.map((doc) => (isGm(role) ? publicSession(doc) : playerSafeSession(doc))).filter(Boolean);
}

export async function createCampaignSession({ campaignId, userId, input }) {
  const stamp = now();
  const document = {
    ...normalizeSessionInput({ campaignId, userId, input }),
    createdBy: objectIdFrom(userId) || userId || null,
    createdAt: stamp
  };
  const result = await sessions().insertOne(document);
  return publicSession({ ...document, _id: result.insertedId });
}

export async function updateCampaignSession({ campaignId, id, userId, input }) {
  const _id = objectIdFrom(id);
  if (!_id) return null;
  const existing = await sessions().findOne({ _id, campaignId: campaignKey(campaignId) });
  if (!existing) return null;
  const patch = normalizeSessionInput({ campaignId, userId, input, existing });
  await sessions().updateOne({ _id, campaignId: campaignKey(campaignId) }, { $set: patch });
  return publicSession(await sessions().findOne({ _id }));
}

export async function deleteCampaignSession({ campaignId, id }) {
  const _id = objectIdFrom(id);
  if (!_id) return false;
  const result = await sessions().deleteOne({ _id, campaignId: campaignKey(campaignId) });
  return result.deletedCount > 0;
}

export async function listHandouts({ campaignId, role = "player", userId = "", limit = 100 } = {}) {
  if (!isMongoWorldSystemsEnabled()) return [];
  const query = { campaignId: campaignKey(campaignId) };
  if (!isGm(role)) {
    const userObjectId = objectIdFrom(userId) || userId;
    query.$or = [
      { visibility: "partyVisible" },
      { visibility: "specificPlayers", visibleToUserIds: userObjectId }
    ];
  }
  const docs = await handouts().find(query).sort({ releasedAt: -1, createdAt: -1 }).limit(Math.min(Number(limit) || 100, 500)).toArray();
  return docs.map(publicHandout).filter((handout) => isGm(role) || playerCanSeeHandout(handout, userId));
}

export async function createHandout({ campaignId, userId, input }) {
  const stamp = now();
  const document = {
    ...normalizeHandoutInput({ campaignId, userId, input }),
    createdBy: objectIdFrom(userId) || userId || null,
    createdAt: stamp
  };
  const result = await handouts().insertOne(document);
  return publicHandout({ ...document, _id: result.insertedId });
}

export async function updateHandout({ campaignId, id, userId, input }) {
  const _id = objectIdFrom(id);
  if (!_id) return null;
  const existing = await handouts().findOne({ _id, campaignId: campaignKey(campaignId) });
  if (!existing) return null;
  const patch = normalizeHandoutInput({ campaignId, userId, input, existing });
  await handouts().updateOne({ _id, campaignId: campaignKey(campaignId) }, { $set: patch });
  return publicHandout(await handouts().findOne({ _id }));
}

export async function deleteHandout({ campaignId, id }) {
  const _id = objectIdFrom(id);
  if (!_id) return false;
  const result = await handouts().deleteOne({ _id, campaignId: campaignKey(campaignId) });
  return result.deletedCount > 0;
}
