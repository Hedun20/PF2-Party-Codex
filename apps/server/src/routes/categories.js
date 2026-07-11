import { Router } from "express";
import { campaignCategories } from "../services/campaignContentService.js";
import { requireCampaignMember, resolveRequestMode } from "../services/sessionService.js";

export const categoriesRouter = Router();
categoriesRouter.get("/categories", requireCampaignMember, async (req, res, next) => {
  try {
    const role = await resolveRequestMode(req, req.query.mode || "");
    const campaignId = req.campaignIdentity?.campaign?.id || req.campaignIdentity?.membership?.campaignId || "";
    res.json({ categories: await campaignCategories({ campaignId, role }), campaignId, role });
  } catch (error) {
    next(error);
  }
});
