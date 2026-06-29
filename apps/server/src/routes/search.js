import { Router } from "express";
import { searchPages } from "../services/searchService.js";
import { resolveRequestMode } from "../services/sessionService.js";

export const searchRouter = Router();
searchRouter.get("/search", async (req, res) => res.json({ results: searchPages(req.query.q || "", await resolveRequestMode(req, "player")) }));