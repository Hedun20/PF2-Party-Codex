import { ObjectId } from "mongodb";
import { getDb, mongoStatus } from "../db/mongo.js";
import { objectIdFrom } from "./identityRepository.js";
import { normalizeManualCharacter } from "../services/characterImportService.js";

function characters() {
  return getDb().collection("characters");
}

function now() {
  return new Date().toISOString();
}

function idString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof ObjectId) return value.toString();
  if (value._id) return idString(value._id);
  return String(value);
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function clean(value = "", max = 20000) {
  return String(value || "").slice(0, max);
}

function mergeObject(base = {}, patch = {}) {
  return { ...(base || {}), ...(patch || {}) };
}

export function isMongoCharactersEnabled() {
  return mongoStatus().connected;
}

export async function ensureCharactersIndexes() {
  if (!isMongoCharactersEnabled()) return [];
  await characters().createIndex({ campaignId: 1, ownerUserId: 1, updatedAt: -1 });
  await characters().createIndex({ campaignId: 1, "visibility.visibleToParty": 1 });
  await characters().createIndex({ campaignId: 1, "visibility.sharedWithGm": 1 });
  await characters().createIndex({ campaignId: 1, "source.rawHash": 1 });
  return [
    "characters.campaignId_ownerUserId_updatedAt",
    "characters.campaignId_visibleToParty",
    "characters.campaignId_sharedWithGm",
    "characters.campaignId_sourceRawHash"
  ];
}

export function serializeCharacter(character, { includeRawImport = false, userId = "", role = "player" } = {}) {
  if (!character) return null;
  const isOwner = userId && idString(character.ownerUserId) === idString(userId);
  const isGm = role === "owner" || role === "gm";
  const text = character.text || {};
  return {
    id: idString(character._id),
    campaignId: idString(character.campaignId),
    ownerUserId: idString(character.ownerUserId),
    source: character.source || {},
    identity: character.identity || {},
    visuals: character.visuals || {},
    stats: character.stats || {},
    combat: character.combat || {},
    magic: character.magic || {},
    progression: character.progression || {},
    inventory: character.inventory || {},
    text: {
      publicSummary: text.publicSummary || "",
      ...(isOwner || isGm ? { privateNotes: text.privateNotes || "", buildNotes: text.buildNotes || "" } : {}),
      ...(isGm ? { gmNotes: text.gmNotes || "" } : {})
    },
    links: character.links || {},
    visibility: character.visibility || { visibleToParty: false, sharedWithGm: true },
    createdAt: character.createdAt,
    updatedAt: character.updatedAt,
    ...(includeRawImport && (isOwner || isGm) ? { rawImport: character.rawImport || {} } : {})
  };
}

function documentFromNormalized({ campaignId, ownerUserId, normalized }) {
  const stamp = now();
  return {
    campaignId: objectIdFrom(campaignId) || campaignId,
    ownerUserId: objectIdFrom(ownerUserId) || ownerUserId,
    source: normalized.source || {},
    identity: normalized.identity || {},
    visuals: normalized.visuals || {},
    stats: normalized.stats || {},
    combat: normalized.combat || {},
    magic: normalized.magic || {},
    progression: normalized.progression || {},
    inventory: normalized.inventory || {},
    text: normalized.text || {},
    links: normalized.links || {},
    visibility: normalized.visibility || { visibleToParty: false, sharedWithGm: true },
    rawImport: normalized.rawImport || {},
    createdAt: stamp,
    updatedAt: stamp
  };
}

export async function createManualCharacter({ campaignId, ownerUserId, input = {}, role = "player" }) {
  const character = documentFromNormalized({ campaignId, ownerUserId, normalized: normalizeManualCharacter(input) });
  const result = await characters().insertOne(character);
  return serializeCharacter({ ...character, _id: result.insertedId }, { userId: ownerUserId, role });
}

export async function createImportedCharacter({ campaignId, ownerUserId, normalized, role = "player" }) {
  const character = documentFromNormalized({ campaignId, ownerUserId, normalized });
  const result = await characters().insertOne(character);
  return serializeCharacter({ ...character, _id: result.insertedId }, { userId: ownerUserId, role });
}

export async function listCharactersForUser({ campaignId, userId, role = "player", scope = "mine" }) {
  const campaignObjectId = objectIdFrom(campaignId) || campaignId;
  const userObjectId = objectIdFrom(userId) || userId;
  const isGm = role === "owner" || role === "gm";
  const query = { campaignId: campaignObjectId };

  if (scope === "campaign" && isGm) {
    query.$or = [
      { ownerUserId: userObjectId },
      { "visibility.sharedWithGm": true },
      { "visibility.visibleToParty": true }
    ];
  } else {
    query.$or = [
      { ownerUserId: userObjectId },
      { "visibility.visibleToParty": true }
    ];
  }

  const result = await characters().find(query).sort({ updatedAt: -1, createdAt: -1 }).toArray();
  return result.map((character) => serializeCharacter(character, { userId, role }));
}

export async function findCharacterById(id, { campaignId = "" } = {}) {
  const objectId = objectIdFrom(id);
  if (!objectId) return null;
  const query = { _id: objectId };
  if (campaignId) query.campaignId = objectIdFrom(campaignId) || campaignId;
  return characters().findOne(query);
}

export function canReadCharacter(character, { userId, role = "player" }) {
  if (!character) return false;
  const isOwner = idString(character.ownerUserId) === idString(userId);
  if (isOwner) return true;
  if (character.visibility?.visibleToParty) return true;
  const isGm = role === "owner" || role === "gm";
  return isGm && character.visibility?.sharedWithGm;
}

export function canWriteCharacter(character, { userId, role = "player" }) {
  if (!character) return false;
  const isOwner = idString(character.ownerUserId) === idString(userId);
  if (isOwner) return true;
  return role === "owner" || role === "gm";
}

function normalizePatch(input = {}, existing = {}) {
  const patch = {};
  if (input.identity) patch.identity = mergeObject(existing.identity, input.identity);
  if (input.visuals) patch.visuals = mergeObject(existing.visuals, input.visuals);
  if (input.stats) patch.stats = mergeObject(existing.stats, input.stats);
  if (input.combat) patch.combat = mergeObject(existing.combat, input.combat);
  if (input.magic) patch.magic = mergeObject(existing.magic, input.magic);
  if (input.progression) patch.progression = mergeObject(existing.progression, input.progression);
  if (input.inventory) patch.inventory = mergeObject(existing.inventory, input.inventory);
  if (input.text) patch.text = mergeObject(existing.text, input.text);
  if (input.links) patch.links = { ...(existing.links || {}), ...input.links, linkedEntryIds: asArray(input.links.linkedEntryIds ?? existing.links?.linkedEntryIds).map((item) => clean(item, 1000)).filter(Boolean) };
  if (input.visibility) patch.visibility = mergeObject(existing.visibility, input.visibility);

  // Compatibility with old manual character UI.
  const identity = { ...(patch.identity || existing.identity || {}) };
  const stats = { ...(patch.stats || existing.stats || {}) };
  const text = { ...(patch.text || existing.text || {}) };
  const visibility = { ...(patch.visibility || existing.visibility || {}) };
  const links = { ...(patch.links || existing.links || {}) };

  if ("name" in input) identity.name = clean(input.name, 240);
  if ("ancestry" in input) identity.ancestry = clean(input.ancestry, 240);
  if ("heritage" in input) identity.heritage = clean(input.heritage, 240);
  if ("background" in input) identity.background = clean(input.background, 240);
  if ("className" in input) identity.className = clean(input.className, 240);
  if ("level" in input) identity.level = Number(input.level) || 1;
  if ("alignment" in input) identity.alignment = clean(input.alignment, 80);
  if (input.attributes) stats.abilities = { ...(stats.abilities || {}), ...input.attributes };
  if (input.defenses) {
    stats.armorClass = Number(input.defenses.ac ?? stats.armorClass) || stats.armorClass || 10;
    stats.currentHp = Number(input.defenses.hp ?? stats.currentHp) || stats.currentHp || 0;
    stats.maxHp = Number(input.defenses.maxHp ?? stats.maxHp) || stats.maxHp || 0;
    stats.perception = Number(input.defenses.perception ?? stats.perception) || stats.perception || 0;
    stats.saves = {
      ...(stats.saves || {}),
      fortitude: Number(input.defenses.fortitude ?? stats.saves?.fortitude) || stats.saves?.fortitude || 0,
      reflex: Number(input.defenses.reflex ?? stats.saves?.reflex) || stats.saves?.reflex || 0,
      will: Number(input.defenses.will ?? stats.saves?.will) || stats.saves?.will || 0
    };
  }
  if ("publicSummary" in input) text.publicSummary = clean(input.publicSummary);
  if ("privateNotes" in input) text.privateNotes = clean(input.privateNotes);
  if ("buildNotes" in input) text.buildNotes = clean(input.buildNotes);
  if ("gmNotes" in input) text.gmNotes = clean(input.gmNotes);
  if ("inventoryText" in input) patch.inventory = { ...(patch.inventory || existing.inventory || {}), text: clean(input.inventoryText) };
  if ("isVisibleToParty" in input) visibility.visibleToParty = Boolean(input.isVisibleToParty);
  if ("isSharedWithGm" in input) visibility.sharedWithGm = Boolean(input.isSharedWithGm);
  if ("linkedArticles" in input) links.linkedEntryIds = asArray(input.linkedArticles).map((item) => clean(item, 1000)).filter(Boolean);
  if ("skillIds" in input) stats.skills = asArray(input.skillIds).map((id) => ({ id: clean(id), name: clean(id) })).filter((item) => item.id);
  if ("featIds" in input) patch.progression = { ...(patch.progression || existing.progression || {}), feats: asArray(input.featIds).map((id) => ({ id: clean(id), name: clean(id) })).filter((item) => item.id) };

  patch.identity = identity;
  patch.stats = stats;
  patch.text = text;
  patch.visibility = visibility;
  patch.links = links;
  patch.updatedAt = now();
  return patch;
}

export async function updateCharacter({ campaignId, id, input, userId = "", role = "player" }) {
  const existing = await findCharacterById(id, { campaignId });
  if (!existing) return null;
  const patch = normalizePatch(input, existing);
  await characters().updateOne({ _id: existing._id, campaignId: objectIdFrom(campaignId) || campaignId }, { $set: patch });
  return serializeCharacter({ ...existing, ...patch }, { userId, role });
}

export async function deleteCharacter(id, { campaignId = "" } = {}) {
  const objectId = objectIdFrom(id);
  if (!objectId) return false;
  const result = await characters().deleteOne({ _id: objectId, campaignId: objectIdFrom(campaignId) || campaignId });
  return result.deletedCount > 0;
}
