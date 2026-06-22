import { Router } from "express";
import { clearRevealState, getRevealState, revealPageToPlayers } from "../services/revealService.js";
import { requireGm } from "../middleware/sessionMode.js";

export const revealRouter = Router();

revealRouter.get("/reveal", (req, res) => {
  res.json({ reveal: getRevealState(req.query.world || "") });
});

revealRouter.post("/reveal", requireGm, (req, res, next) => {
  try {
    res.json({ reveal: revealPageToPlayers(req.body || {}) });
  } catch (error) {
    next(error);
  }
});

revealRouter.delete("/reveal", requireGm, (req, res) => {
  res.json({ reveal: clearRevealState(req.query.world || req.body?.world || "") });
});
