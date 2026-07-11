import { Router } from "express";
import { requireCampaignMember } from "../services/sessionService.js";
import { listEntries, findEntryById, findEntryByPath, isMongoEntriesEnabled } from "../repositories/entriesRepository.js";

export const entriesRouter = Router();

function requestContext(req) {
  return {
    campaignId: req.campaignIdentity?.campaign?.id || req.campaignIdentity?.membership?.campaignId || "",
    role: req.campaignIdentity?.role || "player"
  };
}

function requireMongoEntries(res) {
  if (!isMongoEntriesEnabled()) {
    res.status(503).json({ error: "Mongo campaign storage is not connected. Content reads are unavailable until the database connection is restored." });
    return false;
  }
  return true;
}

entriesRouter.get("/entries", requireCampaignMember, async (req, res, next) => {
  try {
    if (!requireMongoEntries(res)) return;
    const context = requestContext(req);
    const entries = await listEntries({
      campaignId: context.campaignId,
      role: context.role,
      type: req.query.type || "",
      search: req.query.search || "",
      limit: req.query.limit || 200
    });
    res.json({ entries, campaignId: context.campaignId, role: context.role });
  } catch (error) {
    next(error);
  }
});

entriesRouter.get("/entries/by-path", requireCampaignMember, async (req, res, next) => {
  try {
    if (!requireMongoEntries(res)) return;
    const context = requestContext(req);
    const entry = await findEntryByPath({ campaignId: context.campaignId, path: req.query.path || "", role: context.role });
    if (!entry) return res.status(404).json({ error: "Entry not found." });
    res.json({ entry });
  } catch (error) {
    next(error);
  }
});

entriesRouter.get("/entries/:id", requireCampaignMember, async (req, res, next) => {
  try {
    if (!requireMongoEntries(res)) return;
    const context = requestContext(req);
    const entry = await findEntryById({ campaignId: context.campaignId, id: req.params.id, role: context.role });
    if (!entry) return res.status(404).json({ error: "Entry not found." });
    res.json({ entry });
  } catch (error) {
    next(error);
  }
});
