import { Router } from "express";
import { searchPages } from "../services/searchService.js";
import { resolveRequestMode } from "../services/sessionService.js";

export const searchRouter = Router();
searchRouter.get("/search", (req, res) => res.json({ results: searchPages(req.query.q || "", resolveRequestMode(req, req.query.mode || "player")) }));
