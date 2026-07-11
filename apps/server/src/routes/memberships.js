import { Router } from "express";
import { identityContextForCampaign, isMongoIdentityEnabled, listCampaignMemberships } from "../repositories/identityRepository.js";
import { acceptInvitation, createCampaignInvitation, listInvitationsForCampaign } from "../repositories/invitationsRepository.js";
import { toPublicUser } from "../services/authStore.js";
import { logAuditEvent } from "../services/auditLogService.js";

export const membershipsRouter = Router();
export const invitationsRouter = Router();

function publicBase(req) {
  const configured = String(process.env.PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (configured) return configured;
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

membershipsRouter.get("/campaigns/:campaignId/memberships", async (req, res, next) => {
  try {
    const context = await campaignManagerContext(req);
    const memberships = await listCampaignMemberships({ campaignId: context.activeCampaign.id });
    res.json({ memberships, campaign: context.activeCampaign, workspace: context.activeWorkspace, role: context.role });
  } catch (error) {
    next(error);
  }
});

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
    const invitation = await createCampaignInvitation({
      campaign: context.activeCampaign,
      workspace: context.activeWorkspace,
      invitedBy: publicUser?.id || req.user?._id || req.user?.id,
      input: req.body || {},
      inviteUrlForToken: (token) => `${publicBase(req)}/invite/${encodeURIComponent(token)}`
    });
    await logAuditEvent({ req, action: "invitations.create", entityType: "invitation", entityId: invitation.id, campaignId: context.activeCampaign.id, metadata: { email: invitation.email, role: invitation.role } });
    res.status(201).json({ invitation, emailDelivery: "local-outbox" });
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
    await logAuditEvent({ req, action: "invitations.accept", entityType: "invitation", entityId: accepted.invitation.id, campaignId: accepted.invitation.campaignId, metadata: { role: accepted.invitation.role } });
    res.json({ ok: true, ...accepted, user, activeWorkspace: campaignContext.activeWorkspace || null, activeCampaign: campaignContext.activeCampaign || null, activeMembership: campaignContext.activeMembership || accepted.membership || null, role: campaignContext.role || accepted.membership?.role || "player" });
  } catch (error) {
    next(error);
  }
});
