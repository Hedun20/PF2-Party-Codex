import { getDb, mongoStatus } from "../db/mongo.js";
import { collections } from "./collections.js";
import { objectIdFrom, publicMembership } from "./identityRepository.js";
import { publicInvitation } from "./invitationsRepository.js";
import { revokeDiscordIdentityForMembership } from "./discordIdentityRepository.js";

function membershipCollection() {
  return getDb().collection(collections.memberships);
}

function invitationCollection() {
  return getDb().collection(collections.invitations);
}

function userCollection() {
  return getDb().collection(collections.users);
}

function campaignCollection() {
  return getDb().collection(collections.campaigns);
}

function characterCollection() {
  return getDb().collection("characters");
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

function idString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return idString(value._id);
  return String(value);
}

function sameId(left, right) {
  return Boolean(left && right) && idString(left) === idString(right);
}

async function detachCharacterAssignments({ campaignId, membership, reason, stamp }) {
  if (!membership?._id && !membership?.userId) return { modifiedCount: 0 };
  const matches = [];
  if (membership?._id) matches.push({ assignedMembershipId: membership._id });
  if (membership?.userId) matches.push({ assignedUserId: membership.userId });
  if (!matches.length) return { modifiedCount: 0 };

  return characterCollection().updateMany(
    { campaignId, $or: matches },
    {
      $set: {
        assignedUserId: null,
        assignedMembershipId: null,
        assignedAt: "",
        assignmentRemovedAt: stamp,
        assignmentRemovedReason: reason,
        updatedAt: stamp
      }
    }
  );
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
  // External identity is never authority on its own, but revoke it before the membership
  // transition so an interrupted cleanup cannot leave a stale provider binding behind.
  await revokeDiscordIdentityForMembership({
    campaignId: campaignObjectId,
    membership: target,
    reason: "membershipRemoved",
    stamp
  });

  const result = await membershipCollection().updateOne(
    { _id: target._id, campaignId: campaignObjectId, status: "active", role: { $ne: "owner" } },
    { $set: { status: "removed", removedAt: stamp, removedReason: "managerRemoved", updatedAt: stamp } }
  );
  if (!result.modifiedCount) {
    const error = new Error("Campaign membership changed before it could be removed. Refresh and retry.");
    error.status = 409;
    throw error;
  }

  await detachCharacterAssignments({
    campaignId: campaignObjectId,
    membership: target,
    reason: "membershipRemoved",
    stamp
  });

  if (target.userId) {
    await userCollection().updateOne(
      { _id: target.userId, activeCampaignId: campaignObjectId },
      { $unset: { activeCampaignId: "", activeCampaignUpdatedAt: "" }, $set: { updatedAt: stamp } }
    );
  }
  return publicMembership({ ...target, status: "removed", removedAt: stamp, removedReason: "managerRemoved", updatedAt: stamp });
}

export async function transferCampaignOwnership({ campaignId, currentUserId, targetMembershipId } = {}) {
  requireMongo();
  const campaignObjectId = requiredObjectId(campaignId, "Campaign id");
  const currentUserObjectId = requiredObjectId(currentUserId, "Current user id");
  const targetMembershipObjectId = requiredObjectId(targetMembershipId, "Target membership id");

  const [campaign, currentMembership, targetMembership] = await Promise.all([
    campaignCollection().findOne({ _id: campaignObjectId, status: { $ne: "archived" } }),
    membershipCollection().findOne({ campaignId: campaignObjectId, userId: currentUserObjectId, status: "active" }),
    membershipCollection().findOne({ _id: targetMembershipObjectId, campaignId: campaignObjectId, status: "active" })
  ]);

  if (!campaign) {
    const error = new Error("Campaign was not found.");
    error.status = 404;
    throw error;
  }
  if (!currentMembership) {
    const error = new Error("Your active campaign membership was not found.");
    error.status = 403;
    throw error;
  }
  if (!targetMembership?.userId) {
    const error = new Error("Choose an active campaign member with a linked account.");
    error.status = 409;
    throw error;
  }
  if (sameId(targetMembership.userId, currentUserObjectId)) {
    const error = new Error("Choose another campaign member as the new owner.");
    error.status = 400;
    throw error;
  }

  const lastTransfer = campaign.ownershipTransferLast || {};
  const retryOfCompletedTransfer =
    sameId(campaign.ownerUserId, targetMembership.userId) &&
    sameId(lastTransfer.fromUserId, currentUserObjectId) &&
    sameId(lastTransfer.toMembershipId, targetMembership._id);

  if (retryOfCompletedTransfer) {
    await membershipCollection().updateOne(
      { _id: currentMembership._id, campaignId: campaignObjectId, role: "owner", status: "active" },
      { $set: { role: "gm", updatedAt: new Date().toISOString() } }
    );
    const [previousOwner, newOwner] = await Promise.all([
      membershipCollection().findOne({ _id: currentMembership._id }),
      membershipCollection().findOne({ _id: targetMembership._id })
    ]);
    return {
      previousOwner: publicMembership(previousOwner),
      newOwner: publicMembership(newOwner),
      idempotent: true
    };
  }

  if (currentMembership.role !== "owner" || (campaign.ownerUserId && !sameId(campaign.ownerUserId, currentUserObjectId))) {
    const error = new Error("Only the current campaign owner can transfer ownership.");
    error.status = 403;
    error.code = "CAMPAIGN_OWNER_REQUIRED";
    throw error;
  }

  const previousTargetRole = targetMembership.role === "owner" ? "gm" : targetMembership.role;
  const stamp = new Date().toISOString();
  let targetPromoted = targetMembership.role === "owner";

  if (!targetPromoted) {
    const promote = await membershipCollection().updateOne(
      {
        _id: targetMembership._id,
        campaignId: campaignObjectId,
        userId: targetMembership.userId,
        status: "active",
        role: targetMembership.role
      },
      { $set: { role: "owner", updatedAt: stamp } }
    );
    targetPromoted = Boolean(promote.modifiedCount);
    if (!targetPromoted) {
      const latest = await membershipCollection().findOne({ _id: targetMembership._id, campaignId: campaignObjectId });
      if (latest?.status !== "active" || latest?.role !== "owner") {
        const error = new Error("The selected member changed before ownership could be transferred. Refresh and retry.");
        error.status = 409;
        throw error;
      }
    }
  }

  const campaignUpdate = await campaignCollection().updateOne(
    {
      _id: campaignObjectId,
      status: { $ne: "archived" },
      $or: [
        { ownerUserId: currentUserObjectId },
        { ownerUserId: null },
        { ownerUserId: { $exists: false } }
      ]
    },
    {
      $set: {
        ownerUserId: targetMembership.userId,
        ownershipTransferLast: {
          fromUserId: currentUserObjectId,
          toUserId: targetMembership.userId,
          toMembershipId: targetMembership._id,
          at: stamp
        },
        updatedAt: stamp
      }
    }
  );

  if (!campaignUpdate.modifiedCount) {
    const latestCampaign = await campaignCollection().findOne({ _id: campaignObjectId });
    const sameTransferWon =
      sameId(latestCampaign?.ownerUserId, targetMembership.userId) &&
      sameId(latestCampaign?.ownershipTransferLast?.fromUserId, currentUserObjectId) &&
      sameId(latestCampaign?.ownershipTransferLast?.toMembershipId, targetMembership._id);

    if (!sameTransferWon) {
      if (targetPromoted && targetMembership.role !== "owner") {
        await membershipCollection().updateOne(
          { _id: targetMembership._id, campaignId: campaignObjectId, role: "owner", status: "active" },
          { $set: { role: previousTargetRole, updatedAt: new Date().toISOString() } }
        );
      }
      const error = new Error("Campaign ownership changed in another request. Refresh before trying again.");
      error.status = 409;
      error.code = "OWNERSHIP_CHANGED";
      throw error;
    }
  }

  const demote = await membershipCollection().updateOne(
    { _id: currentMembership._id, campaignId: campaignObjectId, userId: currentUserObjectId, status: "active", role: "owner" },
    { $set: { role: "gm", updatedAt: stamp } }
  );
  if (!demote.modifiedCount) {
    const latestCurrent = await membershipCollection().findOne({ _id: currentMembership._id, campaignId: campaignObjectId });
    if (latestCurrent?.status !== "active" || latestCurrent?.role !== "gm") {
      const error = new Error("Ownership moved to the new owner, but your role needs reconciliation. Refresh and retry this transfer.");
      error.status = 409;
      error.code = "OWNERSHIP_RECONCILE_REQUIRED";
      throw error;
    }
  }

  const [previousOwner, newOwner] = await Promise.all([
    membershipCollection().findOne({ _id: currentMembership._id }),
    membershipCollection().findOne({ _id: targetMembership._id })
  ]);

  return {
    previousOwner: publicMembership(previousOwner),
    newOwner: publicMembership(newOwner),
    idempotent: false
  };
}

export async function leaveCampaignMembership({ campaignId, userId } = {}) {
  requireMongo();
  const campaignObjectId = requiredObjectId(campaignId, "Campaign id");
  const userObjectId = requiredObjectId(userId, "User id");
  const target = await membershipCollection().findOne({ campaignId: campaignObjectId, userId: userObjectId });

  if (!target) {
    const error = new Error("Campaign membership was not found.");
    error.status = 404;
    throw error;
  }

  if (target.status === "removed") {
    const reconcileStamp = target.removedAt || new Date().toISOString();
    await Promise.all([
      detachCharacterAssignments({
        campaignId: campaignObjectId,
        membership: target,
        reason: target.removedReason === "left" ? "membershipLeft" : "membershipRemoved",
        stamp: reconcileStamp
      }),
      revokeDiscordIdentityForMembership({
        campaignId: campaignObjectId,
        membership: target,
        reason: target.removedReason === "left" ? "membershipLeft" : "membershipRemoved",
        stamp: reconcileStamp
      })
    ]);
    return {
      membership: publicMembership(target),
      idempotent: true
    };
  }

  if (target.role === "owner") {
    const error = new Error("Transfer campaign ownership before leaving this campaign.");
    error.status = 409;
    error.code = "OWNERSHIP_TRANSFER_REQUIRED";
    throw error;
  }

  if (target.status !== "active") {
    const error = new Error("Only an active campaign membership can be left.");
    error.status = 409;
    throw error;
  }

  const stamp = new Date().toISOString();
  await revokeDiscordIdentityForMembership({
    campaignId: campaignObjectId,
    membership: target,
    reason: "membershipLeft",
    stamp
  });

  const result = await membershipCollection().updateOne(
    {
      _id: target._id,
      campaignId: campaignObjectId,
      userId: userObjectId,
      status: "active",
      role: { $ne: "owner" }
    },
    {
      $set: {
        status: "removed",
        removedAt: stamp,
        removedReason: "left",
        updatedAt: stamp
      }
    }
  );

  if (!result.modifiedCount) {
    const current = await membershipCollection().findOne({ _id: target._id, campaignId: campaignObjectId, userId: userObjectId });
    if (current?.status === "removed") {
      await Promise.all([
        detachCharacterAssignments({
          campaignId: campaignObjectId,
          membership: current,
          reason: current.removedReason === "left" ? "membershipLeft" : "membershipRemoved",
          stamp: current.removedAt || stamp
        }),
        revokeDiscordIdentityForMembership({
          campaignId: campaignObjectId,
          membership: current,
          reason: current.removedReason === "left" ? "membershipLeft" : "membershipRemoved",
          stamp: current.removedAt || stamp
        })
      ]);
      return {
        membership: publicMembership(current),
        idempotent: true
      };
    }
    const error = new Error("Campaign membership changed before it could be left. Refresh and retry.");
    error.status = 409;
    throw error;
  }

  await detachCharacterAssignments({
    campaignId: campaignObjectId,
    membership: target,
    reason: "membershipLeft",
    stamp
  });

  // Authorization revocation wins even if the active-campaign pointer update is interrupted.
  // identityContextForUser() repairs a stale pointer on the next session read.
  await userCollection().updateOne(
    { _id: userObjectId, activeCampaignId: campaignObjectId },
    { $unset: { activeCampaignId: "", activeCampaignUpdatedAt: "" }, $set: { updatedAt: stamp } }
  );

  return {
    membership: publicMembership({
      ...target,
      status: "removed",
      removedAt: stamp,
      removedReason: "left",
      updatedAt: stamp
    }),
    idempotent: false
  };
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
