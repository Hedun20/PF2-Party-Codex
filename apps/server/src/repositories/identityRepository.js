import { ObjectId } from "mongodb";
import { getDb, mongoStatus } from "../db/mongo.js";
import { assertPlanCapacity, normalizeWorkspacePlan } from "../services/entitlementsService.js";

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

function cleanName(value = "", fallback = "Untitled") {
  const text = String(value || "").trim();
  return (text || fallback).slice(0, 180);
}

function emptyIdentityContext() {
  return { activeCampaign: null, activeWorkspace: null, membership: null, activeMembership: null, role: "user" };
}

export function chooseActiveMembership(items = [], preferredCampaignId = "") {
  const activeItems = items.filter((item) => item?.status === "active" && item?.campaignId);
  if (!activeItems.length) return null;
  const preferredId = idString(preferredCampaignId);
  return activeItems.find((item) => idString(item.campaignId) === preferredId) || activeItems[0];
}

export function publicWorkspace(workspace) {
  if (!workspace) return null;
  return {
    id: idString(workspace._id),
    name: workspace.name,
    ownerUserId: idString(workspace.ownerUserId),
    status: workspace.status || "active",
    plan: normalizeWorkspacePlan(workspace.plan),
    subscriptionStatus: workspace.subscriptionStatus || "active",
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
    status: campaign.status || "active",
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
    plan: "development",
    subscriptionStatus: "active",
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
  const campaignNeedsWorkspaceQuery = { $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }, { workspaceId: "" }] };
  const orphanMembershipQuery = { $or: [{ campaignId: { $exists: false } }, { campaignId: null }, { campaignId: "" }] };
  const membershipNeedsWorkspaceQuery = { $or: [{ workspaceId: { $exists: false } }, { workspaceId: null }, { workspaceId: "" }] };
  const [campaignsNeedingWorkspace, orphanMemberships, membershipsNeedingWorkspace] = await Promise.all([
    campaigns().countDocuments(campaignNeedsWorkspaceQuery),
    memberships().countDocuments(orphanMembershipQuery),
    memberships().countDocuments(membershipNeedsWorkspaceQuery)
  ]);

  if (!campaignsNeedingWorkspace && !orphanMemberships && !membershipsNeedingWorkspace) return;

  const fallbackOwnerCampaign = await campaigns().findOne({ ownerUserId: { $ne: null } }, { sort: { createdAt: 1, _id: 1 } });
  const { workspace } = await ensureDefaultWorkspace(fallbackOwnerCampaign?.ownerUserId || null);
  const stamp = now();

  await campaigns().updateMany(
    campaignNeedsWorkspaceQuery,
    { $set: { workspaceId: workspace._id, updatedAt: stamp } }
  );

  if (orphanMemberships > 0) {
    const defaultCampaign = await ensureDefaultCampaign(fallbackOwnerCampaign?.ownerUserId || null);
    await memberships().updateMany(
      orphanMembershipQuery,
      { $set: { campaignId: defaultCampaign.campaign._id, workspaceId: defaultCampaign.campaign.workspaceId || workspace._id, updatedAt: stamp } }
    );
  }

  const cursor = memberships().find(membershipNeedsWorkspaceQuery);
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
  await users().createIndex({ emailVerifyTokenHash: 1 });
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
    "users.emailVerifyTokenHash",
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
    description: "Default campaign workspace created during explicit dev seed/migration.",
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

export async function createWorkspaceCampaignForUser({ userId, workspaceId = "", workspaceName = "", campaignName = "", gameSystem = "system-agnostic", displayName = "" } = {}) {
  if (!isMongoIdentityEnabled()) {
    const error = new Error("Mongo identity is required for workspace onboarding.");
    error.status = 503;
    throw error;
  }
  const userObjectId = userKey(userId);
  if (!userObjectId) {
    const error = new Error("A logged-in user is required to create a campaign workspace.");
    error.status = 401;
    throw error;
  }

  const stamp = now();
  let savedWorkspace = null;
  let workspaceCreated = false;

  if (workspaceId) {
    savedWorkspace = await workspaces().findOne({ _id: workspaceKey(workspaceId), status: "active" });
    if (!savedWorkspace || idString(savedWorkspace.ownerUserId) !== idString(userObjectId)) {
      const error = new Error("Only the workspace owner can create another campaign in this workspace.");
      error.status = 403;
      throw error;
    }
  } else {
    const workspace = {
      name: cleanName(workspaceName, "My Campaign Workspace"),
      ownerUserId: userObjectId,
      status: "active",
      plan: "free",
      subscriptionStatus: "active",
      settings: {
        billingEnabled: false,
        gameSystem: cleanName(gameSystem, "system-agnostic")
      },
      createdAt: stamp,
      updatedAt: stamp
    };
    const workspaceResult = await workspaces().insertOne(workspace);
    savedWorkspace = { ...workspace, _id: workspaceResult.insertedId };
    workspaceCreated = true;
  }

  const campaignCount = await campaigns().countDocuments({
    workspaceId: savedWorkspace._id,
    status: { $ne: "archived" }
  });
  assertPlanCapacity({ workspace: savedWorkspace, resource: "campaigns", current: campaignCount, increase: 1 });

  const campaign = {
    workspaceId: savedWorkspace._id,
    name: cleanName(campaignName, "New Campaign"),
    description: "Campaign workspace created by explicit GM onboarding.",
    ownerUserId: userObjectId,
    status: "active",
    activeWorldId: "",
    defaultLanguage: "ru",
    settings: {
      allowPublicRegistration: false,
      requireEmailVerification: true,
      defaultPlayerVisibility: "hidden",
      gameSystem: cleanName(gameSystem, "system-agnostic")
    },
    createdAt: stamp,
    updatedAt: stamp
  };
  let savedCampaign = null;
  let membership = null;
  try {
    const campaignResult = await campaigns().insertOne(campaign);
    savedCampaign = { ...campaign, _id: campaignResult.insertedId };
    ({ membership } = await ensureMembership({
      userId: idString(userObjectId),
      workspaceId: idString(savedWorkspace._id),
      campaignId: idString(savedCampaign._id),
      role: "owner",
      displayName
    }));
    await users().updateOne(
      { _id: userObjectId },
      { $set: { activeCampaignId: savedCampaign._id, activeCampaignUpdatedAt: stamp, updatedAt: stamp } }
    );
  } catch (error) {
    if (savedCampaign?._id) await campaigns().deleteOne({ _id: savedCampaign._id });
    if (workspaceCreated && savedWorkspace?._id) await workspaces().deleteOne({ _id: savedWorkspace._id });
    throw error;
  }

  return {
    workspace: publicWorkspace(savedWorkspace),
    campaign: publicCampaign(savedCampaign),
    membership: publicMembership(membership),
    role: "owner"
  };
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

export async function listUserCampaigns(user) {
  if (!user || !isMongoIdentityEnabled()) return [];
  const userId = userKey(user._id || user.id);
  if (!userId) return [];

  const membershipDocs = await memberships()
    .find({ userId, status: "active" })
    .sort({ joinedAt: 1, createdAt: 1, _id: 1 })
    .toArray();
  const campaignIds = membershipDocs.map((membership) => campaignKey(membership.campaignId)).filter(Boolean);
  if (!campaignIds.length) return [];

  const campaignDocs = await campaigns().find({ _id: { $in: campaignIds }, status: { $ne: "archived" } }).toArray();
  const campaignsById = new Map(campaignDocs.map((campaign) => [idString(campaign._id), campaign]));
  const workspaceIds = campaignDocs.map((campaign) => workspaceKey(campaign.workspaceId)).filter(Boolean);
  const workspaceDocs = workspaceIds.length
    ? await workspaces().find({ _id: { $in: workspaceIds }, status: { $ne: "archived" } }).toArray()
    : [];
  const workspacesById = new Map(workspaceDocs.map((workspace) => [idString(workspace._id), workspace]));

  return membershipDocs.flatMap((membership) => {
    const campaign = campaignsById.get(idString(membership.campaignId));
    if (!campaign) return [];
    const workspace = workspacesById.get(idString(campaign.workspaceId || membership.workspaceId)) || null;
    return [{
      id: idString(campaign._id),
      campaign: publicCampaign(campaign),
      workspace: publicWorkspace(workspace),
      membership: publicMembership(membership),
      role: membership.role || "player"
    }];
  });
}

export async function setActiveCampaignForUser({ user, campaignId } = {}) {
  if (!isMongoIdentityEnabled()) {
    const error = new Error("Mongo identity is required to select a campaign.");
    error.status = 503;
    throw error;
  }
  if (!user) {
    const error = new Error("Login is required to select a campaign.");
    error.status = 401;
    throw error;
  }

  const context = await identityContextForCampaign(user, campaignId);
  if (!context.activeMembership?.id) {
    const error = new Error("No active membership found for the requested campaign.");
    error.status = 403;
    throw error;
  }

  const selectedCampaignId = campaignKey(context.activeCampaign.id);
  const userId = userKey(user._id || user.id);
  const stamp = now();
  await users().updateOne(
    { _id: userId },
    { $set: { activeCampaignId: selectedCampaignId, activeCampaignUpdatedAt: stamp, updatedAt: stamp } }
  );
  user.activeCampaignId = selectedCampaignId;
  user.activeCampaignUpdatedAt = stamp;
  return context;
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
    return emptyIdentityContext();
  }
  const userId = userKey(user._id || user.id);
  const campaignObjectId = campaignKey(campaignId);
  const membership = await memberships().findOne({ userId, campaignId: campaignObjectId, status: "active" });
  if (!membership) return emptyIdentityContext();

  const campaign = await campaigns().findOne({ _id: campaignObjectId });
  if (!campaign || campaign.status === "archived") return emptyIdentityContext();

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
    return emptyIdentityContext();
  }
  const userId = userKey(user._id || user.id);
  const membershipDocs = await memberships()
    .find({ userId, status: "active" })
    .sort({ joinedAt: 1, createdAt: 1, _id: 1 })
    .toArray();
  const membership = chooseActiveMembership(membershipDocs, user.activeCampaignId);
  if (!membership?.campaignId) return emptyIdentityContext();

  const context = await identityContextForCampaign(user, membership.campaignId);
  if (!context.activeMembership?.id) {
    for (const fallbackMembership of membershipDocs) {
      const fallback = await identityContextForCampaign(user, fallbackMembership.campaignId);
      if (fallback.activeMembership?.id) return fallback;
    }
    return emptyIdentityContext();
  }

  if (idString(user.activeCampaignId) !== idString(membership.campaignId)) {
    const stamp = now();
    await users().updateOne(
      { _id: userId },
      { $set: { activeCampaignId: campaignKey(membership.campaignId), activeCampaignUpdatedAt: stamp, updatedAt: stamp } }
    );
    user.activeCampaignId = campaignKey(membership.campaignId);
  }
  return context;
}

export async function identityCounts() {
  if (!isMongoIdentityEnabled()) {
    return { ok: false, mode: "diagnostic", usersCount: 0, workspacesCount: 0, campaignsCount: 0, membershipsCount: 0, hasDefaultWorkspace: false, hasDefaultCampaign: false };
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

export async function workspaceUsage(workspaceId) {
  if (!isMongoIdentityEnabled() || !workspaceId) {
    return { campaigns: 0, memberSeats: 0, pendingInvitations: 0 };
  }
  const id = workspaceKey(workspaceId);
  const [campaignDocs, memberUserIds, pendingInvitations] = await Promise.all([
    campaigns().find({ workspaceId: id, status: { $ne: "archived" } }, { projection: { _id: 1 } }).toArray(),
    memberships().distinct("userId", { workspaceId: id, status: "active" }),
    getDb().collection("invitations").countDocuments({
      workspaceId: id,
      status: "pending",
      expiresAt: { $gte: now() }
    })
  ]);
  return {
    campaigns: campaignDocs.length,
    campaignIds: campaignDocs.map((campaign) => idString(campaign._id)),
    memberSeats: memberUserIds.length,
    pendingInvitations
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

export async function mongoFindUserByVerificationTokenHash(tokenHash) {
  return users().findOne({ emailVerifyTokenHash: String(tokenHash || "") });
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

export async function bootstrapMembershipForNewUser(_user) {
  return { workspace: null, campaign: null, membership: null, userOnly: true };
}

export async function bootstrapLocalDevWorkspaceForUser(user) {
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
