import { Router } from "express";
import { createWorkspaceCampaignForUser } from "../repositories/identityRepository.js";
import { toPublicUser } from "../services/authStore.js";
import { logAuditEvent } from "../services/auditLogService.js";

export const onboardingRouter = Router();

function requireUser(req) {
  if (!req.user) {
    const error = new Error("Login is required to create a campaign workspace.");
    error.status = 401;
    throw error;
  }
}

onboardingRouter.post("/onboarding/workspace", async (req, res, next) => {
  try {
    requireUser(req);
    if (!req.user.emailVerified) {
      return res.status(403).json({ error: "Confirm your email before creating a campaign workspace." });
    }

    const user = await toPublicUser(req.user);
    if (user?.activeMembership?.id || user?.membership?.id) {
      return res.status(409).json({ error: "This account already has an active campaign membership." });
    }

    const result = await createWorkspaceCampaignForUser({
      userId: user.id,
      workspaceName: req.body?.workspaceName || "",
      campaignName: req.body?.campaignName || "",
      gameSystem: req.body?.gameSystem || "pf2e",
      displayName: user.name || user.email || "Campaign owner"
    });

    await logAuditEvent({
      req,
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: "owner",
      campaignId: result.campaign.id,
      action: "onboarding.workspace.create",
      entityType: "workspace",
      entityId: result.workspace.id,
      metadata: { campaignId: result.campaign.id, role: result.role }
    });

    const refreshedUser = await toPublicUser(req.user);
    res.status(201).json({ ok: true, ...result, user: refreshedUser });
  } catch (error) {
    next(error);
  }
});
