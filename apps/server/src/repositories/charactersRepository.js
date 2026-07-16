import { ObjectId } from "mongodb";
import { getDb, mongoStatus } from "../db/mongo.js";
import { objectIdFrom } from "./identityRepository.js";
import { normalizeManualCharacter } from "../services/characterImportService.js";
import { enrichPf2Character } from "../services/pf2CharacterEnrichmentService.js";

function characters() {
  return getDb().collection("characters");
}

function memberships() {
  return getDb().collection("memberships");
}

function users() {
  return getDb().collection("users");
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

function hasExplicitAssignment(character) {
  return Object.prototype.hasOwnProperty.call(character || {}, "assignedUserId");
}

function assignedUserIdFor(character) {
  if (!character) return null;
  return hasExplicitAssignment(character) ? character.assignedUserId : character.ownerUserId;
}

function assignedMembershipIdFor(character) {
  return character?.assignedMembershipId || null;
}

function isManagerRole(role = "player") {
  return role === "owner" || role === "gm";
}

function isAssignedUser(character, userId) {
  return Boolean(userId && idString(assignedUserIdFor(character)) === idString(userId));
}

function publicAssignment(assignment, { includeEmail = false } = {}) {
  if (!assignment) return null;
  return {
    membershipId: idString(assignment.membershipId || assignment._id),
    userId: idString(assignment.userId),
    displayName: assignment.displayName || "",
    role: assignment.role || "player",
    status: assignment.status || "active",
    ...(includeEmail ? { email: assignment.email || "" } : {})
  };
}

async function assignmentMapForCharacters(items = []) {
  const assigned = items.map((character) => ({
    characterId: idString(character._id),
    campaignId: character.campaignId,
    membershipId: assignedMembershipIdFor(character),
    userId: assignedUserIdFor(character)
  })).filter((item) => item.userId);
  if (!assigned.length) return new Map();

  const membershipIds = assigned.map((item) => objectIdFrom(item.membershipId)).filter(Boolean);
  const userIds = assigned.map((item) => objectIdFrom(item.userId) || item.userId).filter(Boolean);
  const campaignIds = assigned.map((item) => objectIdFrom(item.campaignId) || item.campaignId).filter(Boolean);
  const [membershipDocs, userDocs] = await Promise.all([
    memberships().find({
      status: "active",
      $or: [
        ...(membershipIds.length ? [{ _id: { $in: membershipIds } }] : []),
        { userId: { $in: userIds }, campaignId: { $in: campaignIds } }
      ]
    }).toArray(),
    users().find({ _id: { $in: userIds.filter((value) => value instanceof ObjectId) } }).toArray()
  ]);

  const usersById = new Map(userDocs.map((user) => [idString(user._id), user]));
  const membershipById = new Map(membershipDocs.map((membership) => [idString(membership._id), membership]));
  const membershipByCampaignUser = new Map(membershipDocs.map((membership) => [`${idString(membership.campaignId)}:${idString(membership.userId)}`, membership]));
  const result = new Map();

  for (const item of assigned) {
    const membership = (item.membershipId && membershipById.get(idString(item.membershipId)))
      || membershipByCampaignUser.get(`${idString(item.campaignId)}:${idString(item.userId)}`)
      || null;
    const user = usersById.get(idString(item.userId));
    result.set(item.characterId, {
      membershipId: membership?._id || item.membershipId || null,
      userId: item.userId,
      displayName: membership?.displayName || user?.name || user?.email || "Campaign member",
      email: user?.email || "",
      role: membership?.role || "player",
      status: membership?.status || "inactive"
    });
  }
  return result;
}

export function isMongoCharactersEnabled() {
  return mongoStatus().connected;
}

export async function ensureCharactersIndexes() {
  if (!isMongoCharactersEnabled()) return [];
  await characters().createIndex({ campaignId: 1, ownerUserId: 1, updatedAt: -1 });
  await characters().createIndex({ campaignId: 1, assignedUserId: 1, updatedAt: -1 });
  await characters().createIndex({ campaignId: 1, assignedMembershipId: 1 });
  await characters().createIndex({ campaignId: 1, "visibility.visibleToParty": 1 });
  await characters().createIndex({ campaignId: 1, "visibility.sharedWithGm": 1 });
  await characters().createIndex({ campaignId: 1, "source.rawHash": 1 });
  return [
    "characters.campaignId_ownerUserId_updatedAt",
    "characters.campaignId_assignedUserId_updatedAt",
    "characters.campaignId_assignedMembershipId",
    "characters.campaignId_visibleToParty",
    "characters.campaignId_sharedWithGm",
    "characters.sourceRawHash"
  ];
}

export function serializeCharacter(character, { includeRawImport = false, userId = "", role = "player", assignment = null } = {}) {
  if (!character) return null;
  const assignedUserId = idString(assignedUserIdFor(character));
  const assignedMembershipId = idString(assignedMembershipIdFor(character));
  const isAssigned = isAssignedUser(character, userId);
  const isGm = isManagerRole(role);
  const text = character.text || {};
  return {
    id: idString(character._id),
    campaignId: idString(character.campaignId),
    ownerUserId: idString(character.ownerUserId),
    createdByUserId: idString(character.createdByUserId),
    assignedUserId,
    assignedMembershipId,
    assignment: publicAssignment(assignment, { includeEmail: isGm }),
    permissions: {
      canEdit: isGm || isAssigned,
      canAssign: isGm
    },
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
      ...(isAssigned || isGm ? { privateNotes: text.privateNotes || "", buildNotes: text.buildNotes || "" } : {}),
      ...(isGm ? { gmNotes: text.gmNotes || "" } : {})
    },
    links: character.links || {},
    visibility: character.visibility || { visibleToParty: false, sharedWithGm: true },
    assignedAt: character.assignedAt || "",
    createdAt: character.createdAt,
    updatedAt: character.updatedAt,
    ...(includeRawImport && (isAssigned || isGm) ? { rawImport: character.rawImport || {} } : {})
  };
}

function documentFromNormalized({ campaignId, ownerUserId = "", createdByUserId = "", assignedUserId = undefined, assignedMembershipId = null, normalized }) {
  const stamp = now();
  const enriched = enrichPf2Character(normalized);
  const creatorId = objectIdFrom(createdByUserId || ownerUserId) || createdByUserId || ownerUserId || null;
  const assignmentWasProvided = assignedUserId !== undefined;
  const assignmentUserId = assignmentWasProvided ? (objectIdFrom(assignedUserId) || assignedUserId || null) : (objectIdFrom(ownerUserId) || ownerUserId || null);
  return {
    campaignId: objectIdFrom(campaignId) || campaignId,
    ownerUserId: assignmentUserId || creatorId,
    createdByUserId: creatorId,
    assignedUserId: assignmentUserId,
    assignedMembershipId: objectIdFrom(assignedMembershipId) || assignedMembershipId || null,
    source: enriched.source || {},
    identity: enriched.identity || {},
    visuals: enriched.visuals || {},
    stats: enriched.stats || {},
    combat: enriched.combat || {},
    magic: enriched.magic || {},
    progression: enriched.progression || {},
    inventory: enriched.inventory || {},
    text: enriched.text || {},
    links: enriched.links || {},
    visibility: enriched.visibility || { visibleToParty: false, sharedWithGm: true },
    rawImport: enriched.rawImport || {},
    assignedAt: assignmentUserId ? stamp : "",
    createdAt: stamp,
    updatedAt: stamp
  };
}

export async function createManualCharacter({ campaignId, ownerUserId = "", createdByUserId = "", assignedUserId = undefined, assignedMembershipId = null, input = {}, role = "player" }) {
  const character = documentFromNormalized({ campaignId, ownerUserId, createdByUserId, assignedUserId, assignedMembershipId, normalized: normalizeManualCharacter(input) });
  const result = await characters().insertOne(character);
  return serializeCharacter({ ...character, _id: result.insertedId }, { userId: createdByUserId || ownerUserId, role });
}

export async function createImportedCharacter({ campaignId, ownerUserId = "", createdByUserId = "", assignedUserId = undefined, assignedMembershipId = null, normalized, role = "player" }) {
  const character = documentFromNormalized({ campaignId, ownerUserId, createdByUserId, assignedUserId, assignedMembershipId, normalized });
  const result = await characters().insertOne(character);
  return serializeCharacter({ ...character, _id: result.insertedId }, { userId: createdByUserId || ownerUserId, role });
}

export async function listCharactersForUser({ campaignId, userId, role = "player", scope = "mine" }) {
  const campaignObjectId = objectIdFrom(campaignId) || campaignId;
  const userObjectId = objectIdFrom(userId) || userId;
  const isGm = isManagerRole(role);
  const query = { campaignId: campaignObjectId };

  if (!(scope === "campaign" && isGm)) {
    query.$or = [
      { assignedUserId: userObjectId },
      { assignedUserId: { $exists: false }, ownerUserId: userObjectId }
    ];
  }

  const result = await characters().find(query).sort({ updatedAt: -1, createdAt: -1 }).toArray();
  const assignments = await assignmentMapForCharacters(result);
  return result.map((character) => serializeCharacter(character, {
    userId,
    role,
    assignment: assignments.get(idString(character._id)) || null
  }));
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
  if (isManagerRole(role)) return true;
  return isAssignedUser(character, userId);
}

export function canWriteCharacter(character, { userId, role = "player" }) {
  if (!character) return false;
  if (isManagerRole(role)) return true;
  return isAssignedUser(character, userId);
}

export async function assignCharacterToMembership({ campaignId, id, membership = null, assignedByUserId = "", userId = "", role = "owner" }) {
  const existing = await findCharacterById(id, { campaignId });
  if (!existing) return null;
  const stamp = now();
  const assignedUserId = membership?.userId ? (objectIdFrom(membership.userId) || membership.userId) : null;
  const assignedMembershipId = membership?._id ? (objectIdFrom(membership._id) || membership._id) : null;
  const patch = {
    assignedUserId,
    assignedMembershipId,
    assignedAt: assignedUserId ? stamp : "",
    assignedByUserId: objectIdFrom(assignedByUserId) || assignedByUserId || null,
    updatedAt: stamp
  };
  if (assignedUserId) patch.ownerUserId = assignedUserId;
  await characters().updateOne(
    { _id: existing._id, campaignId: objectIdFrom(campaignId) || campaignId },
    { $set: patch }
  );
  const assignment = membership ? {
    membershipId: membership._id,
    userId: membership.userId,
    displayName: membership.displayName || "Campaign member",
    role: membership.role || "player",
    status: membership.status || "active"
  } : null;
  return serializeCharacter({ ...existing, ...patch }, { userId, role, assignment });
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
