import { Router } from "express";
import { clearRevealState, getRevealState, revealPageToPlayers } from "../services/revealService.js";
import { requireCampaignMember, requireGm } from "../services/sessionService.js";
import { logAuditEvent } from "../services/auditLogService.js";

export const revealRouter = Router();

revealRouter.get("/reveal", requireCampaignMember, async (req, res, next) => {
  try {
    const campaignId = req.campaignIdentity?.campaign?.id || req.campaignIdentity?.membership?.campaignId || "";
    res.json({ reveal: await getRevealState({ campaignId, world: req.query.world || "" }) });
  } catch (error) {
    next(error);
  }
});

revealRouter.post("/reveal", requireGm, async (req, res, next) => {
  try {
    const campaignId = req.campaignIdentity?.campaign?.id || req.campaignIdentity?.membership?.campaignId || "";
    const userId = req.campaignIdentity?.user?.id || req.campaignIdentity?.membership?.userId || "";
    const reveal = await revealPageToPlayers({ ...(req.body || {}), campaignId, userId });
    await logAuditEvent({ req, action: "player.reveal.set", entityType: "reveal", entityId: reveal?.path || "", metadata: { world: reveal?.world || "" } });
    res.json({ reveal });
  } catch (error) {
    next(error);
  }
});

revealRouter.delete("/reveal", requireGm, async (req, res, next) => {
  try {
    const world = req.query.world || req.body?.world || "";
    const campaignId = req.campaignIdentity?.campaign?.id || req.campaignIdentity?.membership?.campaignId || "";
    const userId = req.campaignIdentity?.user?.id || req.campaignIdentity?.membership?.userId || "";
    const reveal = await clearRevealState({ campaignId, userId, world });
    await logAuditEvent({ req, action: "player.reveal.clear", entityType: "reveal", metadata: { world } });
    res.json({ reveal });
  } catch (error) {
    next(error);
  }
});
