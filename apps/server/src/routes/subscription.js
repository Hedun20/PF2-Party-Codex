import { Router } from "express";
import { requireCampaignMember } from "../services/sessionService.js";
import { workspaceUsage } from "../repositories/identityRepository.js";
import { subscriptionForWorkspace } from "../services/entitlementsService.js";
import { workspaceAssetUsageBytes } from "../services/campaignAssetsService.js";

export const subscriptionRouter = Router();

subscriptionRouter.get("/subscription", requireCampaignMember, async (req, res, next) => {
  try {
    const workspace = req.campaignIdentity.workspace;
    const usage = await workspaceUsage(workspace.id);
    const assetBytes = await workspaceAssetUsageBytes(usage.campaignIds);
    res.json({ subscription: subscriptionForWorkspace(workspace, { ...usage, assetBytes }) });
  } catch (error) {
    next(error);
  }
});
