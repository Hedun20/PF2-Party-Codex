import { Router } from "express";
import { searchPages } from "../services/searchService.js";

export const searchRouter = Router();
searchRouter.get("/search", (req, res) => res.json({ results: searchPages(req.query.q || "", req.query.mode || "player") }));
