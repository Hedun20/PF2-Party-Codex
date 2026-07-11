import { Router } from "express";
import { clearRevealState, getRevealState, revealPageToPlayers } from "../services/revealService.js";
import { requireCampaignMember, requireGm } from "../services/sessionService.js";
import { logAuditEvent } from "../services/auditLogService.js";

export const revealRouter = Router();

revealRouter.get("/reveal", requireCampaignMember, (req, res) => {
  res.json({ reveal: getRevealState(req.query.world || "") });
});

revealRouter.post("/reveal", requireGm, async (req, res, next) => {
  try {
    const reveal = revealPageToPlayers(req.body || {});
    await logAuditEvent({ req, action: "player.reveal.set", entityType: "reveal", entityId: reveal?.path || "", metadata: { world: reveal?.world || "" } });
    res.json({ reveal });
  } catch (error) {
    next(error);
  }
});

revealRouter.delete("/reveal", requireGm, async (req, res, next) => {
  try {
    const world = req.query.world || req.body?.world || "";
    const reveal = clearRevealState(world);
    await logAuditEvent({ req, action: "player.reveal.clear", entityType: "reveal", metadata: { world } });
    res.json({ reveal });
  } catch (error) {
    next(error);
  }
});
