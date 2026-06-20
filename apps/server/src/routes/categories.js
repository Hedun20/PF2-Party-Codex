import { Router } from "express";
import { getCategories } from "../services/vaultService.js";
import { resolveRequestMode } from "../services/sessionService.js";

export const categoriesRouter = Router();
categoriesRouter.get("/categories", (req, res) => res.json({ categories: getCategories(resolveRequestMode(req, req.query.mode)) }));
