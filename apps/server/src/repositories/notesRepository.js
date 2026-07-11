import { ObjectId } from "mongodb";
import { getDb, mongoStatus } from "../db/mongo.js";
import { objectIdFrom } from "./identityRepository.js";

const ALLOWED_VISIBILITY = new Set(["private", "sharedWithGm", "partyVisible", "gmPrivate"]);

function notes() {
  return getDb().collection("notes");
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

function normalizeString(value = "", max = 20000) {
  return String(value || "").slice(0, max);
}

function normalizeStringArray(value = [], maxItems = 100) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeString(item, 500).trim()).filter(Boolean).slice(0, maxItems);
}

function normalizeVisibility(value = "private") {
  const normalized = String(value || "private").trim();
  return ALLOWED_VISIBILITY.has(normalized) ? normalized : "private";
}

function normalizeOptionalObjectId(value) {
  if (!value) return null;
  return objectIdFrom(value) || value;
}

export function serializeNote(note) {
  if (!note) return null;
  return {
    id: idString(note._id),
    campaignId: idString(note.campaignId),
    userId: idString(note.userId),
    characterId: idString(note.characterId),
    title: note.title || "Новая заметка",
    body: note.body || "",
    linkedEntryIds: Array.isArray(note.linkedEntryIds) ? note.linkedEntryIds.map(idString).filter(Boolean) : [],
    linkedSessionId: idString(note.linkedSessionId),
    linkedMapId: idString(note.linkedMapId),
    linkedPath: note.linkedPath || "",
    linkedTitle: note.linkedTitle || "",
    tags: Array.isArray(note.tags) ? note.tags : [],
    visibility: note.visibility || "private",
    createdAt: note.createdAt,
    updatedAt: note.updatedAt
  };
}

export function isMongoNotesEnabled() {
  return mongoStatus().connected;
}

export async function ensureNotesIndexes() {
  if (!isMongoNotesEnabled()) return [];
  await notes().createIndex({ campaignId: 1, userId: 1, updatedAt: -1 });
  await notes().createIndex({ campaignId: 1, visibility: 1, updatedAt: -1 });
  await notes().createIndex({ campaignId: 1, characterId: 1, updatedAt: -1 });
  await notes().createIndex({ campaignId: 1, linkedEntryIds: 1 });
  return [
    "notes.campaignId_userId_updatedAt",
    "notes.campaignId_visibility_updatedAt",
    "notes.campaignId_characterId_updatedAt",
    "notes.campaignId_linkedEntryIds"
  ];
}

export function normalizeNoteInput(input = {}, existing = {}) {
  const title = normalizeString(input.title ?? existing.title ?? "Новая заметка", 240).trim() || "Новая заметка";
  return {
    title,
    body: normalizeString(input.body ?? existing.body ?? ""),
    characterId: normalizeOptionalObjectId(input.characterId ?? existing.characterId),
    linkedEntryIds: normalizeStringArray(input.linkedEntryIds ?? existing.linkedEntryIds ?? []),
    linkedSessionId: normalizeOptionalObjectId(input.linkedSessionId ?? existing.linkedSessionId),
    linkedMapId: normalizeOptionalObjectId(input.linkedMapId ?? existing.linkedMapId),
    linkedPath: normalizeString(input.linkedPath ?? existing.linkedPath ?? "", 1000),
    linkedTitle: normalizeString(input.linkedTitle ?? existing.linkedTitle ?? "", 1000),
    tags: normalizeStringArray(input.tags ?? existing.tags ?? [], 40),
    visibility: normalizeVisibility(input.visibility ?? existing.visibility ?? "private")
  };
}

export async function listNotesForUser({ campaignId, userId, role = "player", scope = "mine" }) {
  const campaignObjectId = objectIdFrom(campaignId) || campaignId;
  const userObjectId = objectIdFrom(userId) || userId;
  const isGm = role === "owner" || role === "gm";
  const query = { campaignId: campaignObjectId };

  if (scope === "campaign" && isGm) {
    query.$or = [
      { userId: userObjectId },
      { visibility: { $in: ["sharedWithGm", "partyVisible", "gmPrivate"] } }
    ];
  } else {
    query.$or = [
      { userId: userObjectId },
      { visibility: "partyVisible" }
    ];
  }

  const result = await notes().find(query).sort({ updatedAt: -1, createdAt: -1 }).toArray();
  return result.map(serializeNote);
}

export async function createNote({ campaignId, userId, input }) {
  const stamp = now();
  const note = {
    campaignId: objectIdFrom(campaignId) || campaignId,
    userId: objectIdFrom(userId) || userId,
    ...normalizeNoteInput(input),
    createdAt: stamp,
    updatedAt: stamp
  };
  const result = await notes().insertOne(note);
  return serializeNote({ ...note, _id: result.insertedId });
}

export async function findNoteById(id, { campaignId = "" } = {}) {
  const objectId = objectIdFrom(id);
  if (!objectId) return null;
  const query = { _id: objectId };
  if (campaignId) query.campaignId = objectIdFrom(campaignId) || campaignId;
  return notes().findOne(query);
}

export function canReadNote(note, { userId, role = "player" }) {
  if (!note) return false;
  const isOwner = idString(note.userId) === idString(userId);
  if (isOwner) return true;
  if (note.visibility === "partyVisible") return true;
  const isGm = role === "owner" || role === "gm";
  return isGm && ["sharedWithGm", "gmPrivate"].includes(note.visibility);
}

export function canWriteNote(note, { userId, role = "player" }) {
  if (!note) return false;
  const isOwner = idString(note.userId) === idString(userId);
  if (isOwner) return true;
  const isGm = role === "owner" || role === "gm";
  return isGm && note.visibility === "gmPrivate";
}

export async function updateNote({ campaignId, id, input }) {
  const existing = await findNoteById(id, { campaignId });
  if (!existing) return null;
  const patch = {
    ...normalizeNoteInput(input, existing),
    updatedAt: now()
  };
  await notes().updateOne({ _id: existing._id, campaignId: objectIdFrom(campaignId) || campaignId }, { $set: patch });
  return serializeNote({ ...existing, ...patch });
}

export async function deleteNote(id, { campaignId = "" } = {}) {
  const objectId = objectIdFrom(id);
  if (!objectId) return false;
  const result = await notes().deleteOne({ _id: objectId, campaignId: objectIdFrom(campaignId) || campaignId });
  return result.deletedCount > 0;
}
