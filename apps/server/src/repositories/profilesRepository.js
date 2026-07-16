import { getDb, mongoStatus } from "../db/mongo.js";
import { collections } from "./collections.js";
import { objectIdFrom } from "./identityRepository.js";

const LANGUAGES = new Set(["ru", "en", "de", "uk"]);
const THEMES = new Set(["system", "dark", "light"]);

function profiles() {
  return getDb().collection(collections.profiles);
}

function users() {
  return getDb().collection(collections.users);
}

function requireMongo() {
  if (mongoStatus().connected) return;
  const error = new Error("MongoDB is required for profile preferences.");
  error.status = 503;
  throw error;
}

function userIdFor(user) {
  const id = objectIdFrom(user?._id || user?.id);
  if (id) return id;
  const error = new Error("A logged-in user is required.");
  error.status = 401;
  throw error;
}

function cleanDisplayName(value, fallback = "") {
  const displayName = String(value ?? fallback ?? "").trim().replace(/\s+/g, " ");
  if (!displayName) {
    const error = new Error("Display name is required.");
    error.status = 400;
    throw error;
  }
  if (displayName.length > 120) {
    const error = new Error("Display name must be 120 characters or fewer.");
    error.status = 400;
    throw error;
  }
  return displayName;
}

function cleanLanguage(value = "ru") {
  const language = String(value || "ru").toLowerCase();
  if (LANGUAGES.has(language)) return language;
  const error = new Error("Unsupported profile language.");
  error.status = 400;
  throw error;
}

function cleanTheme(value = "system") {
  const theme = String(value || "system").toLowerCase();
  if (THEMES.has(theme)) return theme;
  const error = new Error("Unsupported profile theme.");
  error.status = 400;
  throw error;
}

function idString(value) {
  return String(value?._id || value || "");
}

export function publicProfile(profile, user = null) {
  return {
    id: idString(profile?._id),
    userId: idString(profile?.userId || user?._id || user?.id),
    displayName: profile?.displayName || user?.name || user?.email || "User",
    language: profile?.language || "ru",
    theme: profile?.theme || "system",
    avatarAssetId: idString(profile?.avatarAssetId),
    createdAt: profile?.createdAt || "",
    updatedAt: profile?.updatedAt || ""
  };
}

export async function ensureProfileIndexes() {
  if (!mongoStatus().connected) return [];
  await profiles().createIndex({ userId: 1 }, { unique: true });
  return ["profiles.userId"];
}

export async function profileForUser(user) {
  requireMongo();
  const userId = userIdFor(user);
  const existing = await profiles().findOne({ userId });
  if (existing) return publicProfile(existing, user);

  const stamp = new Date().toISOString();
  const profile = {
    userId,
    displayName: cleanDisplayName(user?.name || user?.email?.split("@")[0] || "User"),
    language: "ru",
    theme: "system",
    avatarAssetId: null,
    createdAt: stamp,
    updatedAt: stamp
  };
  try {
    const result = await profiles().insertOne(profile);
    return publicProfile({ ...profile, _id: result.insertedId }, user);
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return publicProfile(await profiles().findOne({ userId }), user);
  }
}

export async function updateProfileForUser(user, input = {}) {
  requireMongo();
  const userId = userIdFor(user);
  const current = await profileForUser(user);
  const displayName = cleanDisplayName(input.displayName, current.displayName);
  const language = cleanLanguage(input.language ?? current.language);
  const theme = cleanTheme(input.theme ?? current.theme);
  const stamp = new Date().toISOString();

  await profiles().updateOne(
    { userId },
    {
      $set: { displayName, language, theme, updatedAt: stamp },
      $setOnInsert: { userId, avatarAssetId: null, createdAt: stamp }
    },
    { upsert: true }
  );
  await users().updateOne(
    { _id: userId },
    { $set: { name: displayName, updatedAt: stamp } }
  );
  user.name = displayName;
  const updated = await profiles().findOne({ userId });
  return publicProfile(updated, user);
}
