import { Router } from "express";
import {
  createWorkspaceCampaignForUser,
  isMongoIdentityEnabled,
  listUserCampaigns,
  setActiveCampaignForUser
} from "../repositories/identityRepository.js";
import { logAuditEvent } from "../services/auditLogService.js";
import { toPublicUser } from "../services/authStore.js";

export const campaignsRouter = Router();

function requireMongoIdentity() {
  if (!isMongoIdentityEnabled()) {
    const error = new Error("Mongo identity is required for campaign management.");
    error.status = 503;
    throw error;
  }
}

function requireUser(req) {
  if (!req.user) {
    const error = new Error("Login is required to manage campaigns.");
    error.status = 401;
    throw error;
  }
}

campaignsRouter.get("/campaigns", async (req, res, next) => {
  try {
    requireUser(req);
    requireMongoIdentity();
    const user = await toPublicUser(req.user);
    const campaigns = await listUserCampaigns(req.user);
    res.json({
      campaigns,
      activeCampaignId: user?.activeCampaign?.id || ""
    });
  } catch (error) {
    next(error);
  }
});

campaignsRouter.post("/campaigns", async (req, res, next) => {
  try {
    requireUser(req);
    requireMongoIdentity();
    if (!req.user.emailVerified) {
      return res.status(403).json({ error: "Confirm your email before creating a campaign." });
    }

    const publicUser = await toPublicUser(req.user);
    const result = await createWorkspaceCampaignForUser({
      userId: publicUser.id,
      workspaceId: req.body?.workspaceId || "",
      workspaceName: req.body?.workspaceName || "",
      campaignName: req.body?.campaignName || "",
      gameSystem: req.body?.gameSystem || "system-agnostic",
      displayName: publicUser.name || publicUser.email || "Campaign owner"
    });
    const user = await toPublicUser(req.user, { campaignId: result.campaign.id });
    const campaigns = await listUserCampaigns(req.user);

    await logAuditEvent({
      req,
      actorUserId: publicUser.id,
      actorEmail: publicUser.email,
      actorRole: "owner",
      campaignId: result.campaign.id,
      action: "campaigns.create",
      entityType: "campaign",
      entityId: result.campaign.id,
      metadata: { workspaceId: result.workspace.id, gameSystem: result.campaign.settings?.gameSystem || "" }
    });

    res.status(201).json({ ok: true, ...result, user, campaigns });
  } catch (error) {
    next(error);
  }
});

campaignsRouter.post("/campaigns/:campaignId/activate", async (req, res, next) => {
  try {
    requireUser(req);
    requireMongoIdentity();
    const context = await setActiveCampaignForUser({ user: req.user, campaignId: req.params.campaignId });
    const user = await toPublicUser(req.user, { campaignId: context.activeCampaign.id });
    const campaigns = await listUserCampaigns(req.user);

    await logAuditEvent({
      req,
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: context.role,
      campaignId: context.activeCampaign.id,
      action: "campaigns.activate",
      entityType: "campaign",
      entityId: context.activeCampaign.id
    });

    res.json({
      ok: true,
      user,
      campaigns,
      activeWorkspace: context.activeWorkspace,
      activeCampaign: context.activeCampaign,
      activeMembership: context.activeMembership,
      membership: context.activeMembership,
      role: context.role
    });
  } catch (error) {
    next(error);
  }
});
