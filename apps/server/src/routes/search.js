import { Router } from "express";
import { searchCampaignPages } from "../services/campaignContentService.js";
import { requireCampaignMember, resolveRequestMode } from "../services/sessionService.js";

export const searchRouter = Router();
searchRouter.get("/search", requireCampaignMember, async (req, res, next) => {
  try {
    const role = await resolveRequestMode(req, req.query.mode || "player");
    const campaignId = req.campaignIdentity?.campaign?.id || req.campaignIdentity?.membership?.campaignId || "";
    res.json({ results: await searchCampaignPages(req.query.q || "", { campaignId, role }), campaignId, role });
  } catch (error) {
    next(error);
  }
});
