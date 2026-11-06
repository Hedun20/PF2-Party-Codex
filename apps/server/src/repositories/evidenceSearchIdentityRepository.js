import { ObjectId } from "mongodb";
import { getDb, mongoStatus } from "../db/mongo.js";

function requireMongo() {
  if (mongoStatus().connected) return;
  const error = new Error("MongoDB is required for evidence search identity resolution.");
  error.status = 503;
  error.code = "EVIDENCE_SEARCH_STORAGE_UNAVAILABLE";
  throw error;
}

function objectIdOrValue(value) {
  const text = String(value || "");
  return ObjectId.isValid(text) ? new ObjectId(text) : value;
}

function idString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof ObjectId) return value.toString();
  if (value._id) return idString(value._id);
  return String(value);
}

function canonicalInstant(value, label) {
  const instant = String(value || "").trim();
  const parsed = Date.parse(instant);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== instant) {
    const error = new Error(`${label} must be a canonical UTC timestamp.`);
    error.status = 409;
    error.code = "EVIDENCE_SEARCH_IDENTITY_INVALID";
    throw error;
  }
  return instant;
}

function memberships() {
  return getDb().collection("memberships");
}

function characters() {
  return getDb().collection("characters");
}

export async function resolveEvidenceSearchSubject({
  userId,
  workspaceId,
  campaignId,
  membershipId
} = {}) {
  requireMongo();
  const normalizedUserId = idString(userId);
  const normalizedWorkspaceId = idString(workspaceId);
  const normalizedCampaignId = idString(campaignId);
  const normalizedMembershipId = idString(membershipId);
  if (!normalizedUserId || !normalizedWorkspaceId || !normalizedCampaignId || !normalizedMembershipId) {
    const error = new Error("Current user, workspace, campaign and membership are required for evidence search.");
    error.status = 409;
    error.code = "EVIDENCE_SEARCH_IDENTITY_MISSING";
    throw error;
  }

  const membership = await memberships().findOne({
    _id: objectIdOrValue(normalizedMembershipId),
    userId: objectIdOrValue(normalizedUserId),
    workspaceId: objectIdOrValue(normalizedWorkspaceId),
    campaignId: objectIdOrValue(normalizedCampaignId)
  });
  if (!membership) {
    const error = new Error("The current campaign membership could not be resolved for evidence search.");
    error.status = 403;
    error.code = "EVIDENCE_SEARCH_MEMBERSHIP_REQUIRED";
    throw error;
  }

  const role = String(membership.role || "").toLowerCase();
  if (!["owner", "gm", "player"].includes(role)) {
    const error = new Error("The current campaign role is not valid for evidence search.");
    error.status = 403;
    error.code = "EVIDENCE_SEARCH_ROLE_DENIED";
    throw error;
  }

  const userKey = objectIdOrValue(normalizedUserId);
  const membershipKey = objectIdOrValue(normalizedMembershipId);
  const campaignKey = objectIdOrValue(normalizedCampaignId);
  const assigned = await characters().find({
    campaignId: campaignKey,
    $or: [
      { assignedMembershipId: membershipKey },
      { assignedUserId: userKey },
      { assignedUserId: { $exists: false }, ownerUserId: userKey }
    ]
  }, {
    projection: { _id: 1, updatedAt: 1 }
  }).toArray();

  const membershipUpdatedAt = canonicalInstant(
    membership.updatedAt || membership.joinedAt || membership.createdAt,
    "Membership update time"
  );
  const characterVersionStamp = assigned
    .map((character) => String(character.updatedAt || ""))
    .filter(Boolean)
    .sort()
    .at(-1) || membershipUpdatedAt;

  return {
    kind: "human",
    userId: normalizedUserId,
    workspaceId: normalizedWorkspaceId,
    campaignId: normalizedCampaignId,
    membershipId: normalizedMembershipId,
    role,
    membershipState: String(membership.status || "active"),
    membershipExpiresAt: membership.expiresAt
      ? canonicalInstant(membership.expiresAt, "Membership expiry")
      : null,
    membershipUpdatedAt,
    assignedCharacterIds: assigned.map((character) => idString(character._id)).filter(Boolean).sort(),
    characterGrantVersion: `character-grants-v1:${characterVersionStamp}`
  };
}
