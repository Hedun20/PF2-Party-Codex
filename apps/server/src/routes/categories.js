import { Router } from "express";
import { getCategories } from "../services/vaultService.js";
import { requestMode } from "../middleware/sessionMode.js";

export const categoriesRouter = Router();
categoriesRouter.get("/categories", (req, res) => res.json({ categories: getCategories(requestMode(req, "gm")) }));
