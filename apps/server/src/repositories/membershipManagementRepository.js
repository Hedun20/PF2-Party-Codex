import { getDb, mongoStatus } from "../db/mongo.js";
import { collections } from "./collections.js";
import { objectIdFrom, publicMembership } from "./identityRepository.js";
import { publicInvitation } from "./invitationsRepository.js";

function membershipCollection() {
  return getDb().collection(collections.memberships);
}

function invitationCollection() {
  return getDb().collection(collections.invitations);
}

function userCollection() {
  return getDb().collection(collections.users);
}

function requiredObjectId(value, label) {
  const id = objectIdFrom(value);
  if (id) return id;
  const error = new Error(`${label} is invalid.`);
  error.status = 400;
  throw error;
}

function requireMongo() {
  if (mongoStatus().connected) return;
  const error = new Error("MongoDB is required for campaign membership management.");
  error.status = 503;
  throw error;
}

export async function findCampaignMembership({ campaignId, membershipId } = {}) {
  requireMongo();
  return membershipCollection().findOne({
    _id: requiredObjectId(membershipId, "Membership id"),
    campaignId: requiredObjectId(campaignId, "Campaign id")
  });
}

export async function changeCampaignMembershipRole({ campaignId, membershipId, role } = {}) {
  requireMongo();
  const nextRole = String(role || "").trim().toLowerCase();
  if (!["gm", "player"].includes(nextRole)) {
    const error = new Error("Membership role must be gm or player.");
    error.status = 400;
    throw error;
  }

  const campaignObjectId = requiredObjectId(campaignId, "Campaign id");
  const membershipObjectId = requiredObjectId(membershipId, "Membership id");
  const target = await membershipCollection().findOne({ _id: membershipObjectId, campaignId: campaignObjectId });
  if (!target || target.status === "removed") {
    const error = new Error("Active campaign membership was not found.");
    error.status = 404;
    throw error;
  }
  if (target.role === "owner") {
    const error = new Error("The workspace owner role cannot be changed here.");
    error.status = 409;
    throw error;
  }

  const stamp = new Date().toISOString();
  await membershipCollection().updateOne(
    { _id: target._id, campaignId: campaignObjectId, status: "active", role: { $ne: "owner" } },
    { $set: { role: nextRole, updatedAt: stamp } }
  );
  return publicMembership({ ...target, role: nextRole, updatedAt: stamp });
}

export async function removeCampaignMembership({ campaignId, membershipId } = {}) {
  requireMongo();
  const campaignObjectId = requiredObjectId(campaignId, "Campaign id");
  const membershipObjectId = requiredObjectId(membershipId, "Membership id");
  const target = await membershipCollection().findOne({ _id: membershipObjectId, campaignId: campaignObjectId });
  if (!target || target.status === "removed") {
    const error = new Error("Active campaign membership was not found.");
    error.status = 404;
    throw error;
  }
  if (target.role === "owner") {
    const error = new Error("The workspace owner cannot be removed from the campaign.");
    error.status = 409;
    throw error;
  }

  const stamp = new Date().toISOString();
  const result = await membershipCollection().updateOne(
    { _id: target._id, campaignId: campaignObjectId, status: "active", role: { $ne: "owner" } },
    { $set: { status: "removed", removedAt: stamp, updatedAt: stamp } }
  );
  if (!result.modifiedCount) {
    const error = new Error("Campaign membership changed before it could be removed. Refresh and retry.");
    error.status = 409;
    throw error;
  }

  if (target.userId) {
    await userCollection().updateOne(
      { _id: target.userId, activeCampaignId: campaignObjectId },
      { $unset: { activeCampaignId: "", activeCampaignUpdatedAt: "" }, $set: { updatedAt: stamp } }
    );
  }
  return publicMembership({ ...target, status: "removed", removedAt: stamp, updatedAt: stamp });
}

export async function revokeCampaignInvitation({ campaignId, invitationId } = {}) {
  requireMongo();
  const campaignObjectId = requiredObjectId(campaignId, "Campaign id");
  const invitationObjectId = requiredObjectId(invitationId, "Invitation id");
  const invitation = await invitationCollection().findOne({ _id: invitationObjectId, campaignId: campaignObjectId });
  if (!invitation) {
    const error = new Error("Campaign invitation was not found.");
    error.status = 404;
    throw error;
  }
  if (invitation.status !== "pending") {
    const error = new Error("Only a pending invitation can be revoked.");
    error.status = 409;
    throw error;
  }

  const stamp = new Date().toISOString();
  const result = await invitationCollection().updateOne(
    { _id: invitation._id, campaignId: campaignObjectId, status: "pending" },
    { $set: { status: "revoked", revokedAt: stamp, updatedAt: stamp } }
  );
  if (!result.modifiedCount) {
    const error = new Error("Invitation changed before it could be revoked. Refresh and retry.");
    error.status = 409;
    throw error;
  }
  return publicInvitation({ ...invitation, status: "revoked", revokedAt: stamp, updatedAt: stamp });
}
