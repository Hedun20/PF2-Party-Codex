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
  deletePage,
  savePage,
  saveRawPage
} from "../services/vaultService.js";
import { decodeMarkdownBuffer, repairUploadedFilename } from "../utils/encoding.js";
import { requestMode, requireGm } from "../middleware/sessionMode.js";

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
  res.json({ pages: listPages(requestMode(req, "gm")) });
});

pagesRouter.get("/missing-links", (req, res) => {
  res.json({ missingLinks: listMissingLinks(requestMode(req, "gm")) });
});

pagesRouter.get("/page", (req, res) => {
  const page = getPage(req.query.path, requestMode(req, "gm"));
  if (!page) return res.status(404).json({ error: "Page not found" });
  res.json({ page });
});

pagesRouter.get("/page/raw", async (req, res, next) => {
  try {
    const data = await readRawPage(req.query.path, requestMode(req, "gm"));
    if (!data) return res.status(404).json({ error: "Page not found" });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

pagesRouter.get("/preview", (req, res) => {
  const page = getPage(req.query.path, req.query.mode || "player");
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

pagesRouter.delete("/page", requireGm, async (req, res, next) => {
  try {
    const deleted = await deletePage(req.query.path || req.body?.path);
    if (!deleted) return res.status(404).json({ error: "Page not found" });
    res.json({ deleted });
  } catch (error) {
    next(error);
  }
});

pagesRouter.post("/markdown/import/preview", requireGm, mdUpload.array("files", 200), (req, res, next) => {
  try {
    const files = (req.files || []).map((file, index) => ({
      id: `${Date.now()}-${index}-${repairUploadedFilename(file.originalname)}`,
      originalName: repairUploadedFilename(file.originalname),
      ...decodeMarkdownBuffer(file.buffer)
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
