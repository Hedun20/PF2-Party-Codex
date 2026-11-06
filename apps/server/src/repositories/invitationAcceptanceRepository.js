import { getDb } from "../db/mongo.js";
import {
  activateMembershipForInvitation,
  identityContextForCampaign,
  mongoFindUserById,
  normalizeEmail,
  publicMembership,
  setActiveCampaignForUser
} from "./identityRepository.js";
import { hashInvitationToken, invitationState, publicInvitation } from "./invitationsRepository.js";

const ACCEPT_LOCK_MS = Number(process.env.INVITATION_ACCEPT_LOCK_MS || 1000 * 60 * 2);

function invitations() {
  return getDb().collection("invitations");
}

function now() {
  return new Date().toISOString();
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

function invitationError(message, status, code = "") {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}

async function normalizeTransientState(invitation) {
  if (!invitation) return invitation;

  if (invitation.status === "pending" && invitationState(invitation) === "expired") {
    const updatedAt = now();
    const expired = await invitations().updateOne(
      { _id: invitation._id, status: "pending", tokenHash: invitation.tokenHash },
      { $set: { status: "expired", updatedAt } }
    );
    return expired.modifiedCount ? { ...invitation, status: "expired", updatedAt } : invitations().findOne({ _id: invitation._id });
  }

  if (invitation.status === "accepting") {
    const acceptingAt = new Date(invitation.acceptingAt || 0).getTime();
    const stale = !Number.isFinite(acceptingAt) || Date.now() - acceptingAt >= ACCEPT_LOCK_MS;
    if (!stale) return invitation;

    const updatedAt = now();
    const released = await invitations().updateOne(
      {
        _id: invitation._id,
        status: "accepting",
        tokenHash: invitation.tokenHash,
        acceptingAt: invitation.acceptingAt
      },
      {
        $set: { status: "pending", updatedAt },
        $unset: { acceptingBy: "", acceptingAt: "" }
      }
    );
    return released.modifiedCount
      ? { ...invitation, status: "pending", updatedAt, acceptingBy: null, acceptingAt: "" }
      : invitations().findOne({ _id: invitation._id });
  }

  return invitation;
}

function assertInvitationEmail(invitation, fullUser) {
  const userEmail = normalizeEmail(fullUser?.email);
  if (!userEmail || userEmail !== invitation.email) {
    throw invitationError("This invitation was sent to a different email address.", 403, "INVITATION_EMAIL_MISMATCH");
  }
}

async function existingAcceptedMembership(invitation, fullUser) {
  const context = await identityContextForCampaign(fullUser, idString(invitation.campaignId));
  if (!context.activeMembership?.id) {
    throw invitationError(
      "Invitation has already been used and campaign access is no longer active.",
      410,
      "INVITATION_ACCESS_REVOKED"
    );
  }
  await setActiveCampaignForUser({ user: fullUser, campaignId: idString(invitation.campaignId) });
  return context.activeMembership;
}

async function activateClaimedMembership(invitation, fullUser) {
  const { membership } = await activateMembershipForInvitation({
    userId: idString(fullUser._id),
    workspaceId: idString(invitation.workspaceId),
    campaignId: idString(invitation.campaignId),
    role: invitation.role || "player",
    displayName: fullUser.name || fullUser.email || "Campaign member"
  });
  return membership;
}

export async function acceptInvitationSafely({ token, user } = {}) {
  if (!token) throw invitationError("Invitation token is required.", 400, "INVITATION_TOKEN_REQUIRED");
  if (!user) throw invitationError("Login or register before accepting this invitation.", 401, "INVITATION_LOGIN_REQUIRED");

  const fullUser = await mongoFindUserById(idString(user._id || user.id));
  if (!fullUser) throw invitationError("Invitation user was not found.", 401, "INVITATION_USER_NOT_FOUND");

  const tokenHash = hashInvitationToken(token);
  let invitation = await invitations().findOne({ tokenHash });
  if (!invitation) throw invitationError("Invitation is invalid or no longer available.", 404, "INVITATION_NOT_FOUND");
  invitation = await normalizeTransientState(invitation);
  if (!invitation) throw invitationError("Invitation is invalid or no longer available.", 404, "INVITATION_NOT_FOUND");
  assertInvitationEmail(invitation, fullUser);

  const status = invitationState(invitation);
  if (status === "expired") throw invitationError("Invitation has expired.", 410, "INVITATION_EXPIRED");
  if (status === "revoked") throw invitationError("Invitation was revoked by the campaign manager.", 410, "INVITATION_REVOKED");
  if (status === "accepted") {
    if (!sameId(invitation.acceptedBy, fullUser._id)) {
      throw invitationError("Invitation has already been accepted by another account.", 409, "INVITATION_ALREADY_ACCEPTED");
    }
    const membership = await existingAcceptedMembership(invitation, fullUser);
    return {
      invitation: publicInvitation(invitation),
      membership: publicMembership(membership),
      idempotent: true
    };
  }
  if (status === "accepting") {
    const message = sameId(invitation.acceptingBy, fullUser._id)
      ? "Invitation acceptance is already in progress. Retry in a moment."
      : "Invitation is being accepted by another request.";
    throw invitationError(message, 409, "INVITATION_ACCEPTING");
  }
  if (status !== "pending") throw invitationError("Invitation is no longer available.", 410, "INVITATION_UNAVAILABLE");

  const acceptingAt = now();
  const claim = await invitations().updateOne(
    { _id: invitation._id, tokenHash, status: "pending" },
    {
      $set: {
        status: "accepting",
        acceptingBy: fullUser._id,
        acceptingAt,
        updatedAt: acceptingAt
      }
    }
  );

  if (!claim.modifiedCount) {
    const latest = await normalizeTransientState(await invitations().findOne({ _id: invitation._id }));
    if (latest?.status === "accepted" && sameId(latest.acceptedBy, fullUser._id)) {
      const membership = await existingAcceptedMembership(latest, fullUser);
      return {
        invitation: publicInvitation(latest),
        membership: publicMembership(membership),
        idempotent: true
      };
    }
    throw invitationError("Invitation changed while it was being accepted. Reload and try again.", 409, "INVITATION_CHANGED");
  }

  invitation = {
    ...invitation,
    status: "accepting",
    acceptingBy: fullUser._id,
    acceptingAt,
    updatedAt: acceptingAt
  };

  let membership;
  try {
    membership = await activateClaimedMembership(invitation, fullUser);
  } catch (error) {
    await invitations().updateOne(
      { _id: invitation._id, tokenHash, status: "accepting", acceptingBy: fullUser._id },
      {
        $set: { status: "pending", updatedAt: now() },
        $unset: { acceptingBy: "", acceptingAt: "" }
      }
    );
    throw error;
  }

  const acceptedAt = now();
  const finalized = await invitations().updateOne(
    { _id: invitation._id, tokenHash, status: "accepting", acceptingBy: fullUser._id },
    {
      $set: {
        status: "accepted",
        acceptedBy: fullUser._id,
        acceptedAt,
        updatedAt: acceptedAt
      },
      $unset: { acceptingBy: "", acceptingAt: "", inviteUrl: "" }
    }
  );

  if (!finalized.modifiedCount) {
    const latest = await invitations().findOne({ _id: invitation._id });
    if (!latest || latest.status !== "accepted" || !sameId(latest.acceptedBy, fullUser._id)) {
      throw invitationError(
        "Campaign access was created, but invitation finalization was interrupted. Retry this link to reconcile the state.",
        409,
        "INVITATION_FINALIZE_RETRY"
      );
    }
    invitation = latest;
  } else {
    invitation = {
      ...invitation,
      status: "accepted",
      acceptedBy: fullUser._id,
      acceptedAt,
      updatedAt: acceptedAt,
      acceptingBy: null,
      acceptingAt: ""
    };
  }

  await setActiveCampaignForUser({ user: fullUser, campaignId: idString(invitation.campaignId) });

  return {
    invitation: publicInvitation(invitation),
    membership: publicMembership(membership),
    idempotent: false
  };
}
