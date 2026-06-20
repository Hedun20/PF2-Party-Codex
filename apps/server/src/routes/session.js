import { Router } from "express";
import { sessionInfo } from "../services/sessionService.js";

export const sessionRouter = Router();

sessionRouter.get("/session", (req, res) => {
  res.json(sessionInfo(req));
});
