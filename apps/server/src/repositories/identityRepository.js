import { ObjectId } from "mongodb";
import { getDb, mongoStatus } from "../db/mongo.js";

const DEFAULT_CAMPAIGN_NAME = "PF2 Party Codex";
const DEFAULT_WORKSPACE_NAME = "PF2 Party Codex Workspace";

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

function workspaces() {
  return getDb().collection("workspaces");
}

function campaigns() {
  return getDb().collection("campaigns");
}

function memberships() {
  return getDb().collection("memberships");
}

function workspaceKey(workspaceId) {
  return objectIdFrom(workspaceId) || workspaceId || null;
}

function campaignKey(campaignId) {
  return objectIdFrom(campaignId) || campaignId || null;
}

function userKey(userId) {
  return objectIdFrom(userId) || userId || null;
}

export function publicWorkspace(workspace) {
  if (!workspace) return null;
  return {
    id: idString(workspace._id),
    name: workspace.name,
    ownerUserId: idString(workspace.ownerUserId),
    status: workspace.status || "active",
    plan: workspace.plan || "local-dev",
    settings: workspace.settings || {},
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt
  };
}

export function publicCampaign(campaign) {
  if (!campaign) return null;
  return {
    id: idString(campaign._id),
    workspaceId: idString(campaign.workspaceId),
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
    workspaceId: idString(membership.workspaceId),
    campaignId: idString(membership.campaignId),
    role: membership.role,
    status: membership.status,
    displayName: membership.displayName || "",
    joinedAt: membership.joinedAt || "",
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt
  };
}


export async function findDefaultWorkspace() {
  if (!isMongoIdentityEnabled()) return null;
  return workspaces().findOne({ name: DEFAULT_WORKSPACE_NAME });
}

export async function ensureDefaultWorkspace(ownerUserId = null) {
  const existing = await findDefaultWorkspace();
  if (existing) return { workspace: existing, created: false };

  const stamp = now();
  const ownerId = ownerUserId ? userKey(ownerUserId) : null;
  const workspace = {
    name: DEFAULT_WORKSPACE_NAME,
    ownerUserId: ownerId,
    status: "active",
    plan: "local-dev",
    settings: {
      billingEnabled: false
    },
    createdAt: stamp,
    updatedAt: stamp
  };
  const result = await workspaces().insertOne(workspace);
  return { workspace: { ...workspace, _id: result.insertedId }, created: true };
}

async function workspaceForCampaign(campaign, fallbackOwnerUserId = null) {
  if (!campaign) return null;
  if (campaign.workspaceId) {
    const workspace = await workspaces().findOne({ _id: workspaceKey(campaign.workspaceId) });
    if (workspace) return workspace;
  }

  const { workspace } = await ensureDefaultWorkspace(campaign.ownerUserId || fallbackOwnerUserId || null);
  await campaigns().updateOne(
    { _id: campaign._id },
    { $set: { workspaceId: workspace._id, updatedAt: now() } }
  );
  campaign.workspaceId = workspace._id;
  return workspace;
}

async function backfillWorkspaceIds() {
  const fallbackOwnerCampaign = await campaigns().findOne({ ownerUserId: { $ne: null } }, { sort: { createdAt: 1, _id: 1 } });
  const { workspace } = await ensureDefaultWorkspace(fallbackOwnerCampaign?.ownerUserId || null);
  const stamp = now();

  await campaigns().updateMany(
    { $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }, { workspaceId: "" }] },
    { $set: { workspaceId: workspace._id, updatedAt: stamp } }
  );

  const orphanMembershipQuery = { $or: [{ campaignId: { $exists: false } }, { campaignId: null }, { campaignId: "" }] };
  if ((await memberships().countDocuments(orphanMembershipQuery)) > 0) {
    const defaultCampaign = await ensureDefaultCampaign(fallbackOwnerCampaign?.ownerUserId || null);
    await memberships().updateMany(
      orphanMembershipQuery,
      { $set: { campaignId: defaultCampaign.campaign._id, workspaceId: defaultCampaign.campaign.workspaceId || workspace._id, updatedAt: stamp } }
    );
  }

  const cursor = memberships().find({
    $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }, { workspaceId: "" }]
  });
  for await (const membership of cursor) {
    const campaign = await campaigns().findOne({ _id: campaignKey(membership.campaignId) });
    const campaignWorkspace = campaign ? await workspaceForCampaign(campaign, membership.userId) : workspace;
    await memberships().updateOne(
      { _id: membership._id },
      { $set: { workspaceId: campaignWorkspace._id, updatedAt: stamp } }
    );
  }
}

export async function ensureIdentityIndexes() {
  if (!isMongoIdentityEnabled()) return [];
  await users().createIndex({ email: 1 }, { unique: true });
  await workspaces().createIndex({ ownerUserId: 1, status: 1 });
  await workspaces().createIndex({ name: 1 });
  await campaigns().createIndex({ workspaceId: 1, ownerUserId: 1 });
  await campaigns().createIndex({ ownerUserId: 1 });
  await memberships().createIndex({ userId: 1, campaignId: 1 }, { unique: true });
  await memberships().createIndex({ workspaceId: 1, campaignId: 1, userId: 1 });
  await memberships().createIndex({ campaignId: 1, role: 1 });
  await memberships().createIndex({ userId: 1, status: 1 });
  await getDb().collection("auditLogs").createIndex({ campaignId: 1, createdAt: -1 });
  await backfillWorkspaceIds();
  return [
    "users.email",
    "workspaces.ownerUserId_status",
    "workspaces.name",
    "campaigns.workspaceId_ownerUserId",
    "campaigns.ownerUserId",
    "memberships.userId_campaignId",
    "memberships.workspaceId_campaignId_userId",
    "memberships.campaignId_role",
    "memberships.userId_status",
    "auditLogs.campaignId_createdAt"
  ];
}

export async function findDefaultCampaign() {
  if (!isMongoIdentityEnabled()) return null;
  return campaigns().findOne({ name: DEFAULT_CAMPAIGN_NAME });
}

export async function ensureDefaultCampaign(ownerUserId = null) {
  const existing = await findDefaultCampaign();
  if (existing) {
    const workspace = await workspaceForCampaign(existing, ownerUserId);
    return { campaign: { ...existing, workspaceId: existing.workspaceId || workspace?._id || null }, workspace, created: false };
  }

  const stamp = now();
  const ownerId = ownerUserId ? userKey(ownerUserId) : null;
  const { workspace } = await ensureDefaultWorkspace(ownerId);
  const campaign = {
    workspaceId: workspace._id,
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
  return { campaign: { ...campaign, _id: result.insertedId }, workspace, created: true };
}

export async function ensureMembership({ userId, campaignId, workspaceId = null, role = "player", displayName = "" }) {
  const userObjectId = userKey(userId);
  const campaignObjectId = campaignKey(campaignId);
  const campaign = await campaigns().findOne({ _id: campaignObjectId });
  const workspace = campaign ? await workspaceForCampaign(campaign, userObjectId) : null;
  const membershipWorkspaceId = workspaceId ? workspaceKey(workspaceId) : workspace?._id || null;
  const existing = await memberships().findOne({ userId: userObjectId, campaignId: campaignObjectId });
  if (existing) {
    if (!existing.workspaceId && membershipWorkspaceId) {
      await memberships().updateOne({ _id: existing._id }, { $set: { workspaceId: membershipWorkspaceId, updatedAt: now() } });
      existing.workspaceId = membershipWorkspaceId;
    }
    return { membership: existing, created: false };
  }

  const stamp = now();
  const membership = {
    userId: userObjectId,
    workspaceId: membershipWorkspaceId,
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


export async function listCampaignMemberships({ campaignId, includeRemoved = false } = {}) {
  if (!isMongoIdentityEnabled() || !campaignId) return [];
  const campaignObjectId = campaignKey(campaignId);
  const query = { campaignId: campaignObjectId };
  if (!includeRemoved) query.status = { $ne: "removed" };
  const docs = await memberships().find(query).sort({ role: 1, joinedAt: 1, createdAt: 1 }).toArray();
  const userIds = docs.map((membership) => membership.userId).filter(Boolean);
  const memberUsers = userIds.length ? await users().find({ _id: { $in: userIds } }).toArray() : [];
  const usersById = new Map(memberUsers.map((user) => [idString(user._id), user]));
  return docs.map((membership) => {
    const user = usersById.get(idString(membership.userId));
    return {
      ...publicMembership(membership),
      displayName: membership.displayName || user?.name || user?.email || "Campaign member",
      email: user?.email || ""
    };
  });
}

export async function activateMembershipForInvitation({ userId, workspaceId, campaignId, role = "player", displayName = "" }) {
  const userObjectId = userKey(userId);
  const campaignObjectId = campaignKey(campaignId);
  const membershipWorkspaceId = workspaceId ? workspaceKey(workspaceId) : null;
  const existing = await memberships().findOne({ userId: userObjectId, campaignId: campaignObjectId });
  const stamp = now();
  if (existing) {
    const patch = {
      role,
      status: "active",
      displayName: displayName || existing.displayName || "",
      joinedAt: existing.joinedAt || stamp,
      updatedAt: stamp,
      ...(membershipWorkspaceId ? { workspaceId: membershipWorkspaceId } : {})
    };
    await memberships().updateOne({ _id: existing._id }, { $set: patch });
    return { membership: { ...existing, ...patch }, created: false };
  }
  return ensureMembership({ userId, workspaceId, campaignId, role, displayName });
}
export async function identityContextForCampaign(user, campaignId) {
  if (!user || !isMongoIdentityEnabled() || !campaignId) {
    return { activeCampaign: null, activeWorkspace: null, membership: null, activeMembership: null, role: user?.role || "player" };
  }
  const userId = userKey(user._id || user.id);
  const campaignObjectId = campaignKey(campaignId);
  const membership = await memberships().findOne({ userId, campaignId: campaignObjectId, status: "active" });
  if (!membership) return { activeCampaign: null, activeWorkspace: null, membership: null, activeMembership: null, role: "player" };

  const campaign = await campaigns().findOne({ _id: campaignObjectId });
  if (!campaign) return { activeCampaign: null, activeWorkspace: null, membership: null, activeMembership: null, role: "player" };

  const workspace = await workspaceForCampaign(campaign, userId);
  if (!membership.workspaceId && workspace?._id) {
    await memberships().updateOne({ _id: membership._id }, { $set: { workspaceId: workspace._id, updatedAt: now() } });
    membership.workspaceId = workspace._id;
  }

  const publicActiveMembership = publicMembership(membership);
  return {
    activeCampaign: publicCampaign(campaign),
    activeWorkspace: publicWorkspace(workspace),
    membership: publicActiveMembership,
    activeMembership: publicActiveMembership,
    role: membership.role || "player"
  };
}

export async function identityContextForUser(user) {
  if (!user || !isMongoIdentityEnabled()) {
    return { activeCampaign: null, activeWorkspace: null, membership: null, activeMembership: null, role: user?.role || "player" };
  }
  const userId = userKey(user._id || user.id);
  const membership = await memberships().findOne({ userId, status: "active" }, { sort: { joinedAt: 1, createdAt: 1 } });
  if (!membership?.campaignId) return { activeCampaign: null, activeWorkspace: null, membership: null, activeMembership: null, role: "player" };
  return identityContextForCampaign(user, membership.campaignId);
}

export async function identityCounts() {
  if (!isMongoIdentityEnabled()) {
    return { ok: true, mode: "legacy", usersCount: 0, workspacesCount: 0, campaignsCount: 0, membershipsCount: 0, hasDefaultWorkspace: false, hasDefaultCampaign: false };
  }
  const [usersCount, workspacesCount, campaignsCount, membershipsCount, defaultWorkspace, defaultCampaign] = await Promise.all([
    users().countDocuments(),
    workspaces().countDocuments(),
    campaigns().countDocuments(),
    memberships().countDocuments(),
    findDefaultWorkspace(),
    findDefaultCampaign()
  ]);
  return {
    ok: true,
    mode: "mongo",
    usersCount,
    workspacesCount,
    campaignsCount,
    membershipsCount,
    hasDefaultWorkspace: Boolean(defaultWorkspace),
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
    const { campaign, workspace } = await ensureDefaultCampaign(userId);
    const { membership } = await ensureMembership({ userId, workspaceId: idString(workspace._id), campaignId: idString(campaign._id), role: "owner", displayName: user.name });
    await campaigns().updateOne({ _id: campaign._id }, { $set: { ownerUserId: user._id, updatedAt: now() } });
    await workspaces().updateOne({ _id: workspace._id }, { $set: { ownerUserId: user._id, updatedAt: now() } });
    return { workspace: { ...workspace, ownerUserId: user._id }, campaign: { ...campaign, ownerUserId: user._id }, membership };
  }

  const { campaign, workspace } = await ensureDefaultCampaign(userId);
  const { membership } = await ensureMembership({ userId, workspaceId: idString(workspace._id), campaignId: idString(campaign._id), role: "player", displayName: user.name });
  return { workspace, campaign, membership };
}

export { DEFAULT_CAMPAIGN_NAME, DEFAULT_WORKSPACE_NAME };