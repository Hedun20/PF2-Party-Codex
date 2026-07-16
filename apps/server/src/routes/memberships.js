import { Router } from "express";
import { identityContextForCampaign, isMongoIdentityEnabled, listCampaignMemberships, workspaceUsage } from "../repositories/identityRepository.js";
import { acceptInvitation, createCampaignInvitation, getInvitationPreview, listInvitationsForCampaign } from "../repositories/invitationsRepository.js";
import { changeCampaignMembershipRole, findCampaignMembership, removeCampaignMembership, revokeCampaignInvitation } from "../repositories/membershipManagementRepository.js";
import { toPublicUser } from "../services/authStore.js";
import { logAuditEvent } from "../services/auditLogService.js";
import { assertPlanCapacity } from "../services/entitlementsService.js";
import { config } from "../config.js";

export const membershipsRouter = Router();
export const invitationsRouter = Router();
const membershipActionsRouter = Router({ mergeParams: true });
const invitationActionsRouter = Router({ mergeParams: true });

function idString(value) {
  return String(value?._id || value?.id || value || "");
}

function publicBase(req) {
  if (config.publicAppUrl) return config.publicAppUrl;
  const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
  return `${protocol}://${req.get("host")}`;
}

function requireMongoIdentity() {
  if (!isMongoIdentityEnabled()) {
    const error = new Error("Mongo identity is required for campaign memberships and invitations.");
    error.status = 503;
    throw error;
  }
}

function requireUser(req) {
  if (!req.user) {
    const error = new Error("Login is required.");
    error.status = 401;
    throw error;
  }
}

function isManager(role = "") {
  return role === "owner" || role === "gm";
}

async function campaignManagerContext(req) {
  requireMongoIdentity();
  requireUser(req);
  const context = await identityContextForCampaign(req.user, req.params.campaignId);
  if (!context.activeMembership?.id) {
    const error = new Error("No active membership found for the requested campaign.");
    error.status = 403;
    throw error;
  }
  if (!isManager(context.role)) {
    const error = new Error("GM or owner access is required for campaign player management.");
    error.status = 403;
    throw error;
  }
  return context;
}

function requireOwner(context) {
  if (context.role === "owner") return;
  const error = new Error("Only the workspace owner can change campaign roles.");
  error.status = 403;
  throw error;
}

membershipsRouter.get("/campaigns/:campaignId/memberships", async (req, res, next) => {
  try {
    const context = await campaignManagerContext(req);
    const memberships = await listCampaignMemberships({ campaignId: context.activeCampaign.id });
    res.json({ memberships, campaign: context.activeCampaign, workspace: context.activeWorkspace, role: context.role });
  } catch (error) {
    next(error);
  }
});

membershipActionsRouter.patch("/", async (req, res, next) => {
  try {
    const context = await campaignManagerContext(req);
    requireOwner(context);
    const target = await findCampaignMembership({ campaignId: context.activeCampaign.id, membershipId: req.params.membershipId });
    if (!target || target.status === "removed") {
      const error = new Error("Active campaign membership was not found.");
      error.status = 404;
      throw error;
    }
    const membership = await changeCampaignMembershipRole({
      campaignId: context.activeCampaign.id,
      membershipId: req.params.membershipId,
      role: req.body?.role
    });
    await logAuditEvent({
      req,
      action: "memberships.role.change",
      entityType: "membership",
      entityId: membership.id,
      campaignId: context.activeCampaign.id,
      metadata: { fromRole: target.role, toRole: membership.role, targetUserId: idString(target.userId) }
    });
    res.json({ membership });
  } catch (error) {
    next(error);
  }
});

membershipActionsRouter.delete("/", async (req, res, next) => {
  try {
    const context = await campaignManagerContext(req);
    const target = await findCampaignMembership({ campaignId: context.activeCampaign.id, membershipId: req.params.membershipId });
    if (!target || target.status === "removed") {
      const error = new Error("Active campaign membership was not found.");
      error.status = 404;
      throw error;
    }
    if (idString(target._id) === idString(context.activeMembership.id)) {
      const error = new Error("Use a dedicated leave-campaign flow to remove your own membership.");
      error.status = 409;
      throw error;
    }
    if (context.role === "gm" && target.role !== "player") {
      const error = new Error("A GM can remove players only. Owner access is required to manage another GM.");
      error.status = 403;
      throw error;
    }
    const membership = await removeCampaignMembership({ campaignId: context.activeCampaign.id, membershipId: req.params.membershipId });
    await logAuditEvent({
      req,
      action: "memberships.remove",
      entityType: "membership",
      entityId: membership.id,
      campaignId: context.activeCampaign.id,
      metadata: { role: target.role, targetUserId: idString(target.userId) }
    });
    res.json({ ok: true, membership });
  } catch (error) {
    next(error);
  }
});

membershipsRouter.use("/campaigns/:campaignId/memberships/:membershipId", membershipActionsRouter);

invitationsRouter.get("/campaigns/:campaignId/invitations", async (req, res, next) => {
  try {
    const context = await campaignManagerContext(req);
    const invitations = await listInvitationsForCampaign({ campaignId: context.activeCampaign.id, status: req.query.status || "pending" });
    res.json({ invitations, campaign: context.activeCampaign, workspace: context.activeWorkspace, role: context.role });
  } catch (error) {
    next(error);
  }
});

invitationsRouter.post("/campaigns/:campaignId/invitations", async (req, res, next) => {
  try {
    const context = await campaignManagerContext(req);
    const publicUser = await toPublicUser(req.user);
    const usage = await workspaceUsage(context.activeWorkspace.id);
    assertPlanCapacity({
      workspace: context.activeWorkspace,
      resource: "memberSeats",
      current: usage.memberSeats + usage.pendingInvitations,
      increase: 1
    });
    const { invitation, emailDelivery } = await createCampaignInvitation({
      campaign: context.activeCampaign,
      workspace: context.activeWorkspace,
      invitedBy: publicUser?.id || req.user?._id || req.user?.id,
      input: req.body || {},
      inviteUrlForToken: (token) => `${publicBase(req)}/invite/${encodeURIComponent(token)}`
    });
    await logAuditEvent({ req, action: "invitations.create", entityType: "invitation", entityId: invitation.id, campaignId: context.activeCampaign.id, metadata: { email: invitation.email, role: invitation.role } });
    res.status(201).json({
      invitation,
      emailDelivery: {
        mode: emailDelivery.deliveryMode,
        status: emailDelivery.status
      }
    });
  } catch (error) {
    next(error);
  }
});

invitationActionsRouter.delete("/", async (req, res, next) => {
  try {
    const context = await campaignManagerContext(req);
    const invitation = await revokeCampaignInvitation({
      campaignId: context.activeCampaign.id,
      invitationId: req.params.invitationId
    });
    await logAuditEvent({
      req,
      action: "invitations.revoke",
      entityType: "invitation",
      entityId: invitation.id,
      campaignId: context.activeCampaign.id,
      metadata: { email: invitation.email, role: invitation.role }
    });
    res.json({ ok: true, invitation });
  } catch (error) {
    next(error);
  }
});

invitationsRouter.use("/campaigns/:campaignId/invitations/:invitationId", invitationActionsRouter);

invitationsRouter.get("/invitations/:token/preview", async (req, res, next) => {
  try {
    requireMongoIdentity();
    const preview = await getInvitationPreview({ token: req.params.token || "", user: req.user || null });
    res.json({ ok: true, ...preview });
  } catch (error) {
    next(error);
  }
});

invitationsRouter.post("/invitations/accept", async (req, res, next) => {
  try {
    requireMongoIdentity();
    requireUser(req);
    const accepted = await acceptInvitation({ token: req.body?.token || req.query?.token || "", user: req.user });
    const campaignContext = await identityContextForCampaign(req.user, accepted.invitation.campaignId);
    const user = await toPublicUser(req.user, { campaignId: accepted.invitation.campaignId });
    if (!accepted.idempotent) {
      await logAuditEvent({ req, action: "invitations.accept", entityType: "invitation", entityId: accepted.invitation.id, campaignId: accepted.invitation.campaignId, metadata: { role: accepted.invitation.role } });
    }
    res.json({ ok: true, ...accepted, user, activeWorkspace: campaignContext.activeWorkspace || null, activeCampaign: campaignContext.activeCampaign || null, activeMembership: campaignContext.activeMembership || accepted.membership || null, role: campaignContext.role || accepted.membership?.role || "player" });
  } catch (error) {
    next(error);
  }
});
