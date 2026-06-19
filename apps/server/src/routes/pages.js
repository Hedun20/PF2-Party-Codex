import { Router } from "express";
import { createPage, getPage, listPages, savePage } from "../services/vaultService.js";

export const pagesRouter = Router();

pagesRouter.get("/pages", (req, res) => {
  res.json({ pages: listPages(req.query.mode || "gm") });
});

pagesRouter.get("/page", (req, res) => {
  const page = getPage(req.query.path, req.query.mode || "gm");
  if (!page) return res.status(404).json({ error: "Page not found" });
  res.json({ page });
});

pagesRouter.get("/preview", (req, res) => {
  const page = getPage(req.query.path, req.query.mode || "player");
  if (!page) return res.status(404).json({ error: "Page not found" });
  res.json({ preview: { title: page.title, summary: page.summary, tags: page.tags, category: page.category, links: page.links, modifiedAt: page.modifiedAt } });
});

pagesRouter.post("/page", async (req, res, next) => {
  try {
    res.status(201).json({ page: await createPage(req.body) });
  } catch (error) {
    next(error);
  }
});

pagesRouter.put("/page", async (req, res, next) => {
  try {
    res.json({ page: await savePage(req.body) });
  } catch (error) {
    next(error);
  }
});
