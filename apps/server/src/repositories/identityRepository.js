import { ObjectId } from "mongodb";
import { getDb, mongoStatus } from "../db/mongo.js";

const DEFAULT_CAMPAIGN_NAME = "PF2 Party Codex";

export function isMongoIdentityEnabled() {
  return mongoStatus().connected;
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

export function objectIdFrom(id = "") {
  return ObjectId.isValid(String(id)) ? new ObjectId(String(id)) : null;
}

export function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function users() {
  return getDb().collection("users");
}

function campaigns() {
  return getDb().collection("campaigns");
}

function memberships() {
  return getDb().collection("memberships");
}

export function publicCampaign(campaign) {
  if (!campaign) return null;
  return {
    id: idString(campaign._id),
    name: campaign.name,
    description: campaign.description || "",
    ownerUserId: idString(campaign.ownerUserId),
    activeWorldId: campaign.activeWorldId || "",
    defaultLanguage: campaign.defaultLanguage || "ru",
    settings: campaign.settings || {},
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt
  };
}

export function publicMembership(membership) {
  if (!membership) return null;
  return {
    id: idString(membership._id),
    userId: idString(membership.userId),
    campaignId: idString(membership.campaignId),
    role: membership.role,
    status: membership.status,
    displayName: membership.displayName || "",
    joinedAt: membership.joinedAt || "",
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt
  };
}

export async function ensureIdentityIndexes() {
  if (!isMongoIdentityEnabled()) return [];
  await users().createIndex({ email: 1 }, { unique: true });
  await campaigns().createIndex({ ownerUserId: 1 });
  await memberships().createIndex({ userId: 1, campaignId: 1 }, { unique: true });
  await memberships().createIndex({ campaignId: 1, role: 1 });
  await getDb().collection("auditLogs").createIndex({ campaignId: 1, createdAt: -1 });
  return ["users.email", "campaigns.ownerUserId", "memberships.userId_campaignId", "memberships.campaignId_role", "auditLogs.campaignId_createdAt"];
}

export async function findDefaultCampaign() {
  if (!isMongoIdentityEnabled()) return null;
  return campaigns().findOne({ name: DEFAULT_CAMPAIGN_NAME });
}

export async function ensureDefaultCampaign(ownerUserId = null) {
  const existing = await findDefaultCampaign();
  if (existing) return { campaign: existing, created: false };

  const stamp = now();
  const ownerId = ownerUserId ? objectIdFrom(ownerUserId) || ownerUserId : null;
  const campaign = {
    name: DEFAULT_CAMPAIGN_NAME,
    description: "Default campaign workspace created during identity bootstrap.",
    ownerUserId: ownerId,
    activeWorldId: "",
    defaultLanguage: "ru",
    settings: {
      allowPublicRegistration: false,
      requireEmailVerification: true,
      defaultPlayerVisibility: "hidden"
    },
    createdAt: stamp,
    updatedAt: stamp
  };
  const result = await campaigns().insertOne(campaign);
  return { campaign: { ...campaign, _id: result.insertedId }, created: true };
}

export async function ensureMembership({ userId, campaignId, role = "player", displayName = "" }) {
  const userObjectId = objectIdFrom(userId) || userId;
  const campaignObjectId = objectIdFrom(campaignId) || campaignId;
  const existing = await memberships().findOne({ userId: userObjectId, campaignId: campaignObjectId });
  if (existing) return { membership: existing, created: false };

  const stamp = now();
  const membership = {
    userId: userObjectId,
    campaignId: campaignObjectId,
    role,
    status: "active",
    displayName,
    joinedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp
  };
  const result = await memberships().insertOne(membership);
  return { membership: { ...membership, _id: result.insertedId }, created: true };
}

export async function identityContextForUser(user) {
  if (!user || !isMongoIdentityEnabled()) return { activeCampaign: null, membership: null, role: user?.role || "player" };
  const userId = objectIdFrom(user._id || user.id) || user._id || user.id;
  const membership = await memberships().findOne({ userId, status: "active" }, { sort: { joinedAt: 1, createdAt: 1 } });
  if (!membership) return { activeCampaign: null, membership: null, role: "player" };
  const campaign = await campaigns().findOne({ _id: membership.campaignId });
  return {
    activeCampaign: publicCampaign(campaign),
    membership: publicMembership(membership),
    role: membership.role || "player"
  };
}

export async function identityCounts() {
  if (!isMongoIdentityEnabled()) {
    return { ok: true, mode: "legacy", usersCount: 0, campaignsCount: 0, membershipsCount: 0, hasDefaultCampaign: false };
  }
  const [usersCount, campaignsCount, membershipsCount, defaultCampaign] = await Promise.all([
    users().countDocuments(),
    campaigns().countDocuments(),
    memberships().countDocuments(),
    findDefaultCampaign()
  ]);
  return {
    ok: true,
    mode: "mongo",
    usersCount,
    campaignsCount,
    membershipsCount,
    hasDefaultCampaign: Boolean(defaultCampaign)
  };
}

export async function mongoListUsers() {
  return users().find({}).sort({ createdAt: 1 }).toArray();
}

export async function mongoHasUsers() {
  return (await users().countDocuments()) > 0;
}

export async function mongoFindUserByEmail(email) {
  return users().findOne({ email: normalizeEmail(email) });
}

export async function mongoFindUserById(id) {
  const objectId = objectIdFrom(id);
  if (!objectId) return null;
  return users().findOne({ _id: objectId });
}

export async function mongoInsertUser(user) {
  const result = await users().insertOne(user);
  return { ...user, _id: result.insertedId };
}

export async function mongoUpdateUser(id, patch) {
  const objectId = objectIdFrom(id);
  if (!objectId) return null;
  await users().updateOne({ _id: objectId }, { $set: { ...patch, updatedAt: now() } });
  return mongoFindUserById(objectId.toString());
}

export async function bootstrapMembershipForNewUser(user) {
  const campaignsCount = await campaigns().countDocuments();
  const userId = idString(user._id);
  if (campaignsCount === 0) {
    const { campaign } = await ensureDefaultCampaign(userId);
    const { membership } = await ensureMembership({ userId, campaignId: idString(campaign._id), role: "owner", displayName: user.name });
    await campaigns().updateOne({ _id: campaign._id }, { $set: { ownerUserId: user._id, updatedAt: now() } });
    return { campaign: { ...campaign, ownerUserId: user._id }, membership };
  }

  const { campaign } = await ensureDefaultCampaign(userId);
  const { membership } = await ensureMembership({ userId, campaignId: idString(campaign._id), role: "player", displayName: user.name });
  return { campaign, membership };
}

export { DEFAULT_CAMPAIGN_NAME };
