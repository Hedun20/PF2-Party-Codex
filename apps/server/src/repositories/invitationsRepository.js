import crypto from "crypto";
import { getDb, mongoStatus } from "../db/mongo.js";
import { sendEmail } from "../services/emailService.js";
import { activateMembershipForInvitation, mongoFindUserById, normalizeEmail, objectIdFrom, publicMembership } from "./identityRepository.js";

const INVITE_TTL_MS = Number(process.env.INVITATION_TTL_MS || 1000 * 60 * 60 * 24 * 7);
const INVITE_ROLE = "player";

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

function key(value) {
  return objectIdFrom(value) || value || null;
}

export function isMongoInvitationsEnabled() {
  return mongoStatus().connected;
}

export function hashInvitationToken(token = "") {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function createInvitationToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function ensureInvitationIndexes() {
  if (!isMongoInvitationsEnabled()) return [];
  await invitations().createIndex({ tokenHash: 1 }, { unique: true });
  await invitations().createIndex({ campaignId: 1, email: 1, status: 1 });
  await invitations().createIndex({ campaignId: 1, status: 1, createdAt: -1 });
  return ["invitations.tokenHash", "invitations.campaignId_email_status", "invitations.campaignId_status_createdAt"];
}

export function publicInvitation(invitation, { includeInviteUrl = false, inviteUrl = "" } = {}) {
  if (!invitation) return null;
  const exposedInviteUrl = inviteUrl || invitation.inviteUrl || "";
  return {
    id: idString(invitation._id),
    workspaceId: idString(invitation.workspaceId),
    campaignId: idString(invitation.campaignId),
    email: invitation.email || "",
    role: invitation.role || INVITE_ROLE,
    status: invitation.status || "pending",
    expiresAt: invitation.expiresAt || "",
    invitedBy: idString(invitation.invitedBy),
    acceptedBy: idString(invitation.acceptedBy),
    acceptedAt: invitation.acceptedAt || "",
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
    ...(includeInviteUrl || exposedInviteUrl ? { inviteUrl: exposedInviteUrl } : {})
  };
}

function validateInvitationInput(input = {}) {
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error("Enter a valid invite email address.");
    error.status = 400;
    throw error;
  }
  return { email, role: INVITE_ROLE };
}

export async function listInvitationsForCampaign({ campaignId, status = "pending" } = {}) {
  const query = { campaignId: key(campaignId) };
  if (status) query.status = status;
  const docs = await invitations().find(query).sort({ createdAt: -1 }).toArray();
  const stamp = Date.now();
  return docs.map((invitation) => {
    if (invitation.status === "pending" && new Date(invitation.expiresAt || 0).getTime() < stamp) {
      return publicInvitation({ ...invitation, status: "expired" });
    }
    return publicInvitation(invitation);
  });
}

export async function createCampaignInvitation({ campaign, workspace, invitedBy, input, inviteUrlForToken }) {
  const { email, role } = validateInvitationInput(input);
  const campaignId = key(campaign.id || campaign._id);
  const workspaceId = key(workspace?.id || workspace?._id || campaign.workspaceId);
  const existing = await invitations().findOne({ campaignId, email, status: "pending" });
  if (existing && new Date(existing.expiresAt || 0).getTime() >= Date.now()) {
    const error = new Error("A pending invitation already exists for this email.");
    error.status = 409;
    throw error;
  }
  if (existing) {
    await invitations().updateOne({ _id: existing._id }, { $set: { status: "expired", updatedAt: now() } });
  }

  const token = createInvitationToken();
  const inviteUrl = inviteUrlForToken(token);
  const stamp = now();
  const invitation = {
    workspaceId,
    campaignId,
    email,
    role,
    tokenHash: hashInvitationToken(token),
    inviteUrl,
    status: "pending",
    expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
    invitedBy: key(invitedBy),
    acceptedBy: null,
    acceptedAt: "",
    createdAt: stamp,
    updatedAt: stamp
  };
  const result = await invitations().insertOne(invitation);
  const saved = { ...invitation, _id: result.insertedId };

  await sendEmail({
    to: email,
    subject: "Party Codex: приглашение в кампанию",
    text: `Вас пригласили в кампанию ${campaign.name || "Party Codex"} как игрока. Ссылка для входа: ${inviteUrl}`,
    html: `<p>Вас пригласили в кампанию <strong>${campaign.name || "Party Codex"}</strong> как <strong>игрока</strong>.</p><p><a href="${inviteUrl}">Принять приглашение</a></p><p>${inviteUrl}</p>`
  });

  return publicInvitation(saved, { includeInviteUrl: true, inviteUrl });
}

export async function acceptInvitation({ token, user }) {
  if (!token) {
    const error = new Error("Invitation token is required.");
    error.status = 400;
    throw error;
  }
  if (!user) {
    const error = new Error("Login or register before accepting this invitation.");
    error.status = 401;
    throw error;
  }
  const invitation = await invitations().findOne({ tokenHash: hashInvitationToken(token), status: "pending" });
  if (!invitation) {
    const error = new Error("Invitation is invalid or no longer pending.");
    error.status = 404;
    throw error;
  }
  if (new Date(invitation.expiresAt || 0).getTime() < Date.now()) {
    await invitations().updateOne({ _id: invitation._id }, { $set: { status: "expired", updatedAt: now() } });
    const error = new Error("Invitation has expired.");
    error.status = 410;
    throw error;
  }

  const fullUser = await mongoFindUserById(idString(user._id || user.id));
  if (!fullUser) {
    const error = new Error("Invitation user was not found.");
    error.status = 401;
    throw error;
  }
  const userEmail = normalizeEmail(fullUser.email);
  if (userEmail && userEmail !== invitation.email) {
    const error = new Error("This invitation was sent to a different email address.");
    error.status = 403;
    throw error;
  }

  const { membership } = await activateMembershipForInvitation({
    userId: idString(fullUser._id),
    workspaceId: idString(invitation.workspaceId),
    campaignId: idString(invitation.campaignId),
    role: INVITE_ROLE,
    displayName: fullUser.name || fullUser.email || "Campaign member"
  });

  const stamp = now();
  await invitations().updateOne(
    { _id: invitation._id },
    { $set: { status: "accepted", acceptedBy: fullUser._id, acceptedAt: stamp, updatedAt: stamp } }
  );

  return {
    invitation: publicInvitation({ ...invitation, status: "accepted", acceptedBy: fullUser._id, acceptedAt: stamp, updatedAt: stamp }),
    membership: publicMembership(membership)
  };
}
