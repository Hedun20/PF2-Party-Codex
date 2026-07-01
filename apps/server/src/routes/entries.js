import { Router } from "express";
import { toPublicUser } from "../services/authStore.js";
import { listEntries, findEntryById, findEntryByPath, isMongoEntriesEnabled } from "../repositories/entriesRepository.js";

export const entriesRouter = Router();

async function requestContext(req) {
  const user = await toPublicUser(req.user);
  return {
    user,
    campaignId: req.query.campaignId || user?.activeCampaign?.id || user?.membership?.campaignId || "",
    role: user?.role || "player"
  };
}

function requireMongoEntries(res) {
  if (!isMongoEntriesEnabled()) {
    res.status(503).json({ error: "Mongo entries storage is not connected. Vault compatibility routes are still available." });
    return false;
  }
  return true;
}

entriesRouter.get("/entries", async (req, res, next) => {
  try {
    if (!requireMongoEntries(res)) return;
    const context = await requestContext(req);
    if (!context.campaignId) return res.status(401).json({ error: "Login with a campaign membership to read entries." });
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

entriesRouter.get("/entries/by-path", async (req, res, next) => {
  try {
    if (!requireMongoEntries(res)) return;
    const context = await requestContext(req);
    if (!context.campaignId) return res.status(401).json({ error: "Login with a campaign membership to read entries." });
    const entry = await findEntryByPath({ campaignId: context.campaignId, path: req.query.path || "", role: context.role });
    if (!entry) return res.status(404).json({ error: "Entry not found." });
    res.json({ entry });
  } catch (error) {
    next(error);
  }
});

entriesRouter.get("/entries/:id", async (req, res, next) => {
  try {
    if (!requireMongoEntries(res)) return;
    const context = await requestContext(req);
    if (!context.campaignId) return res.status(401).json({ error: "Login with a campaign membership to read entries." });
    const entry = await findEntryById({ campaignId: context.campaignId, id: req.params.id, role: context.role });
    if (!entry) return res.status(404).json({ error: "Entry not found." });
    res.json({ entry });
  } catch (error) {
    next(error);
  }
});
