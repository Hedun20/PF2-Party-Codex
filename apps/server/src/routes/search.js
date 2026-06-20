import { Router } from "express";
import { searchPages } from "../services/searchService.js";
import { requestMode } from "../middleware/sessionMode.js";

export const searchRouter = Router();
searchRouter.get("/search", (req, res) => res.json({ results: searchPages(req.query.q || "", requestMode(req, "player")) }));
