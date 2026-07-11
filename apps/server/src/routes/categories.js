import { Router } from "express";
import { getCategories } from "../services/vaultService.js";
import { requireCampaignMember, resolveRequestMode } from "../services/sessionService.js";

export const categoriesRouter = Router();
categoriesRouter.get("/categories", requireCampaignMember, async (req, res, next) => {
  try {
    res.json({ categories: getCategories(await resolveRequestMode(req, "gm")) });
  } catch (error) {
    next(error);
  }
});
