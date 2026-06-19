import { Router } from "express";
import { getCategories } from "../services/vaultService.js";

export const categoriesRouter = Router();
categoriesRouter.get("/categories", (req, res) => res.json({ categories: getCategories(req.query.mode || "gm") }));
