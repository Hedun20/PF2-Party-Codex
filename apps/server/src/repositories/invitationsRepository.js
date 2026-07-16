import crypto from "crypto";
import { getDb, mongoStatus } from "../db/mongo.js";
import { sendEmail } from "../services/emailService.js";
import { activateMembershipForInvitation, mongoFindUserById, normalizeEmail, objectIdFrom, publicMembership, setActiveCampaignForUser } from "./identityRepository.js";

const INVITE_TTL_MS = Number(process.env.INVITATION_TTL_MS || 1000 * 60 * 60 * 24 * 7);
const INVITE_ROLE = "player";

function invitations() {
  return getDb().collection("invitations");
}

function campaigns() {
  return getDb().collection("campaigns");
}

function workspaces() {
  return getDb().collection("workspaces");
}

function now() {
  return new Date().toISOString();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function sameId(left, right) {
  return Boolean(left && right) && idString(left) === idString(right);
}

function invitationError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
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

export function invitationState(invitation, stamp = Date.now()) {
  const status = invitation?.status || "pending";
  if (status === "pending" && new Date(invitation?.expiresAt || 0).getTime() < stamp) return "expired";
  return status;
}

export function maskInvitationEmail(email = "") {
  const normalized = normalizeEmail(email);
  const [local = "", domain = ""] = normalized.split("@");
  if (!local || !domain) return "скрытый адрес";
  const localHint = local.length <= 2 ? `${local[0] || "*"}*` : `${local[0]}***${local.at(-1)}`;
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const suffix = dot > 0 ? domain.slice(dot) : "";
  const domainHint = `${host[0] || "*"}***${suffix}`;
  return `${localHint}@${domainHint}`;
}

export async function ensureInvitationIndexes() {
  if (!isMongoInvitationsEnabled()) return [];
  await invitations().createIndex({ tokenHash: 1 }, { unique: true });
  await invitations().createIndex({ campaignId: 1, email: 1, status: 1 });
  await invitations().createIndex({ campaignId: 1, status: 1, createdAt: -1 });
  await invitations().updateMany({ inviteUrl: { $exists: true } }, { $unset: { inviteUrl: "" } });
  return ["invitations.tokenHash", "invitations.campaignId_email_status", "invitations.campaignId_status_createdAt"];
}

export function publicInvitation(invitation, { includeInviteUrl = false, inviteUrl = "" } = {}) {
  if (!invitation) return null;
  return {
    id: idString(invitation._id),
    workspaceId: idString(invitation.workspaceId),
    campaignId: idString(invitation.campaignId),
    workspaceName: invitation.workspaceName || "",
    campaignName: invitation.campaignName || "",
    email: invitation.email || "",
    role: invitation.role || INVITE_ROLE,
    status: invitationState(invitation),
    expiresAt: invitation.expiresAt || "",
    invitedBy: idString(invitation.invitedBy),
    acceptedBy: idString(invitation.acceptedBy),
    acceptedAt: invitation.acceptedAt || "",
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
    ...(includeInviteUrl && inviteUrl ? { inviteUrl } : {})
  };
}

function validateInvitationInput(input = {}) {
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw invitationError("Enter a valid invite email address.", 400);
  }
  return { email, role: INVITE_ROLE };
}

async function expireInvitation(invitation) {
  if (!invitation || invitation.status !== "pending") return invitation;
  if (invitationState(invitation) !== "expired") return invitation;
  const updatedAt = now();
  await invitations().updateOne({ _id: invitation._id, status: "pending" }, { $set: { status: "expired", updatedAt } });
  return { ...invitation, status: "expired", updatedAt };
}

async function invitationContext(invitation) {
  const [campaign, workspace] = await Promise.all([
    invitation?.campaignId ? campaigns().findOne({ _id: key(invitation.campaignId) }) : null,
    invitation?.workspaceId ? workspaces().findOne({ _id: key(invitation.workspaceId) }) : null
  ]);
  return {
    campaignName: invitation?.campaignName || campaign?.name || "Party Codex campaign",
    workspaceName: invitation?.workspaceName || workspace?.name || "Party Codex workspace"
  };
}

async function invitationUser(user) {
  if (!user) return null;
  return mongoFindUserById(idString(user._id || user.id));
}

function assertInvitationEmail(invitation, fullUser) {
  const userEmail = normalizeEmail(fullUser?.email);
  if (!userEmail || userEmail !== invitation.email) {
    throw invitationError("This invitation was sent to a different email address.", 403);
  }
}

async function activateInvitationMembership(invitation, fullUser) {
  const { membership } = await activateMembershipForInvitation({
    userId: idString(fullUser._id),
    workspaceId: idString(invitation.workspaceId),
    campaignId: idString(invitation.campaignId),
    role: invitation.role || INVITE_ROLE,
    displayName: fullUser.name || fullUser.email || "Campaign member"
  });
  await setActiveCampaignForUser({ user: fullUser, campaignId: idString(invitation.campaignId) });
  return membership;
}

export async function getInvitationPreview({ token, user = null } = {}) {
  if (!token || String(token).length < 16) throw invitationError("Invitation link is invalid or no longer available.", 404);
  let invitation = await invitations().findOne({ tokenHash: hashInvitationToken(token) });
  if (!invitation) throw invitationError("Invitation link is invalid or no longer available.", 404);
  invitation = await expireInvitation(invitation);

  const [context, fullUser] = await Promise.all([invitationContext(invitation), invitationUser(user)]);
  const status = invitationState(invitation);
  const emailMatchesCurrentUser = fullUser ? normalizeEmail(fullUser.email) === invitation.email : null;
  const acceptedByCurrentUser = Boolean(fullUser && status === "accepted" && sameId(invitation.acceptedBy, fullUser._id));

  return {
    invitation: {
      campaignName: context.campaignName,
      workspaceName: context.workspaceName,
      role: invitation.role || INVITE_ROLE,
      status,
      expiresAt: invitation.expiresAt || "",
      emailHint: maskInvitationEmail(invitation.email),
      emailMatchesCurrentUser,
      acceptedByCurrentUser,
      canAccept: status === "pending" && Boolean(fullUser) && emailMatchesCurrentUser === true
    }
  };
}

export async function listInvitationsForCampaign({ campaignId, status = "pending" } = {}) {
  const query = { campaignId: key(campaignId) };
  if (status) query.status = status;
  const docs = await invitations().find(query).sort({ createdAt: -1 }).toArray();
  return Promise.all(docs.map(async (invitation) => publicInvitation(await expireInvitation(invitation))));
}

export async function createCampaignInvitation({ campaign, workspace, invitedBy, input, inviteUrlForToken }) {
  const { email, role } = validateInvitationInput(input);
  const campaignId = key(campaign.id || campaign._id);
  const workspaceId = key(workspace?.id || workspace?._id || campaign.workspaceId);
  const existing = await invitations().findOne({ campaignId, email, status: "pending" });
  if (existing && invitationState(existing) === "pending") {
    throw invitationError("A pending invitation already exists for this email.", 409);
  }
  if (existing) {
    await invitations().updateOne({ _id: existing._id }, { $set: { status: "expired", updatedAt: now() }, $unset: { inviteUrl: "" } });
  }

  const token = createInvitationToken();
  const inviteUrl = inviteUrlForToken(token);
  const stamp = now();
  const invitation = {
    workspaceId,
    campaignId,
    workspaceName: workspace?.name || "Party Codex workspace",
    campaignName: campaign.name || "Party Codex campaign",
    email,
    role,
    tokenHash: hashInvitationToken(token),
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

  let emailDelivery;
  try {
    emailDelivery = await sendEmail({
      campaignId: idString(campaignId),
      createdByUserId: idString(invitedBy),
      to: email,
      subject: "Party Codex: приглашение в кампанию",
      text: `Вас пригласили в кампанию ${campaign.name || "Party Codex"} как игрока. Ссылка для входа: ${inviteUrl}`,
      html: `<p>Вас пригласили в кампанию <strong>${escapeHtml(campaign.name || "Party Codex")}</strong> как <strong>игрока</strong>.</p><p><a href="${escapeHtml(inviteUrl)}">Принять приглашение</a></p><p>${escapeHtml(inviteUrl)}</p>`
    });
  } catch (error) {
    await invitations().deleteOne({ _id: saved._id });
    throw error;
  }

  return {
    invitation: publicInvitation(saved, { includeInviteUrl: true, inviteUrl }),
    emailDelivery
  };
}

export async function acceptInvitation({ token, user }) {
  if (!token) throw invitationError("Invitation token is required.", 400);
  if (!user) throw invitationError("Login or register before accepting this invitation.", 401);

  const fullUser = await invitationUser(user);
  if (!fullUser) throw invitationError("Invitation user was not found.", 401);

  let invitation = await invitations().findOne({ tokenHash: hashInvitationToken(token) });
  if (!invitation) throw invitationError("Invitation is invalid or no longer available.", 404);
  invitation = await expireInvitation(invitation);
  assertInvitationEmail(invitation, fullUser);

  const status = invitationState(invitation);
  if (status === "expired") throw invitationError("Invitation has expired.", 410);
  if (status === "revoked") throw invitationError("Invitation was revoked by the campaign manager.", 410);
  if (status === "accepted") {
    if (!sameId(invitation.acceptedBy, fullUser._id)) {
      throw invitationError("Invitation has already been accepted by another account.", 409);
    }
    const membership = await activateInvitationMembership(invitation, fullUser);
    return {
      invitation: publicInvitation(invitation),
      membership: publicMembership(membership),
      idempotent: true
    };
  }
  if (status !== "pending") throw invitationError("Invitation is no longer available.", 410);

  const membership = await activateInvitationMembership(invitation, fullUser);
  const stamp = now();
  const update = await invitations().updateOne(
    { _id: invitation._id, status: "pending" },
    { $set: { status: "accepted", acceptedBy: fullUser._id, acceptedAt: stamp, updatedAt: stamp }, $unset: { inviteUrl: "" } }
  );

  if (!update.modifiedCount) {
    const latest = await invitations().findOne({ _id: invitation._id });
    if (!latest || invitationState(latest) !== "accepted" || !sameId(latest.acceptedBy, fullUser._id)) {
      throw invitationError("Invitation changed while it was being accepted. Reload and try again.", 409);
    }
    invitation = latest;
  } else {
    invitation = { ...invitation, status: "accepted", acceptedBy: fullUser._id, acceptedAt: stamp, updatedAt: stamp };
  }

  return {
    invitation: publicInvitation(invitation),
    membership: publicMembership(membership),
    idempotent: false
  };
}
