import { Router } from "express";
import multer from "multer";
import {
  commitMarkdownImports,
  createPage,
  getPage,
  listMissingLinks,
  listPages,
  previewMarkdownImports,
  readRawPage,
  savePage,
  saveRawPage
} from "../services/vaultService.js";
import { requireGm, resolveRequestMode } from "../services/sessionService.js";

export const pagesRouter = Router();
const mdUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 200 },
  fileFilter: (_req, file, cb) => {
    if (/\.md$/i.test(file.originalname) || file.mimetype === "text/markdown" || file.mimetype === "text/plain") cb(null, true);
    else cb(new Error("Only .md files are supported"));
  }
});

pagesRouter.get("/pages", (req, res) => {
  res.json({ pages: listPages(resolveRequestMode(req, req.query.mode)) });
});

pagesRouter.get("/missing-links", (req, res) => {
  res.json({ missingLinks: listMissingLinks(resolveRequestMode(req, req.query.mode)) });
});

pagesRouter.get("/page", (req, res) => {
  const page = getPage(req.query.path, resolveRequestMode(req, req.query.mode));
  if (!page) return res.status(404).json({ error: "Page not found" });
  res.json({ page });
});

pagesRouter.get("/page/raw", async (req, res, next) => {
  try {
    const data = await readRawPage(req.query.path, resolveRequestMode(req, req.query.mode));
    if (!data) return res.status(404).json({ error: "Page not found" });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

pagesRouter.get("/preview", (req, res) => {
  const page = getPage(req.query.path, resolveRequestMode(req, req.query.mode || "player"));
  if (!page) return res.status(404).json({ error: "Page not found" });
  res.json({ preview: { title: page.title, summary: page.summary, tags: page.tags, category: page.category, links: page.links, modifiedAt: page.modifiedAt } });
});

pagesRouter.post("/page", requireGm, async (req, res, next) => {
  try {
    res.status(201).json({ page: await createPage(req.body) });
  } catch (error) {
    next(error);
  }
});

pagesRouter.put("/page", requireGm, async (req, res, next) => {
  try {
    res.json({ page: await savePage(req.body) });
  } catch (error) {
    next(error);
  }
});

pagesRouter.put("/page/raw", requireGm, async (req, res, next) => {
  try {
    res.json({ page: await saveRawPage(req.body) });
  } catch (error) {
    next(error);
  }
});

pagesRouter.post("/markdown/import/preview", requireGm, mdUpload.array("files", 200), (req, res, next) => {
  try {
    const files = (req.files || []).map((file, index) => ({
      id: `${Date.now()}-${index}-${file.originalname}`,
      originalName: file.originalname,
      content: file.buffer.toString("utf8")
    }));
    res.json({ preview: previewMarkdownImports(files) });
  } catch (error) {
    next(error);
  }
});

pagesRouter.post("/markdown/import/commit", requireGm, async (req, res, next) => {
  try {
    res.json(await commitMarkdownImports(req.body));
  } catch (error) {
    next(error);
  }
});
