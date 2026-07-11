import { Router } from "express";
import { searchPages } from "../services/searchService.js";
import { requireCampaignMember, resolveRequestMode } from "../services/sessionService.js";

export const searchRouter = Router();
searchRouter.get("/search", requireCampaignMember, async (req, res, next) => {
  try {
    res.json({ results: searchPages(req.query.q || "", await resolveRequestMode(req, "player")) });
  } catch (error) {
    next(error);
  }
});
