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
import { resolveRequestMode, requireGm } from "../services/sessionService.js";
import { logAuditEvent } from "../services/auditLogService.js";

export const pagesRouter = Router();
const mdUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 200 },
  fileFilter: (_req, file, cb) => {
    if (/\.md$/i.test(file.originalname) || file.mimetype === "text/markdown" || file.mimetype === "text/plain") cb(null, true);
    else cb(new Error("Only .md files are supported"));
  }
});

pagesRouter.get("/pages", async (req, res) => {
  res.json({ pages: listPages(await resolveRequestMode(req, "gm")) });
});

pagesRouter.get("/missing-links", requireGm, async (req, res) => {
  res.json({ missingLinks: listMissingLinks(await resolveRequestMode(req, "gm")) });
});

pagesRouter.get("/page", async (req, res) => {
  const page = getPage(req.query.path, await resolveRequestMode(req, "gm"));
  if (!page) return res.status(404).json({ error: "Page not found" });
  res.json({ page });
});

pagesRouter.get("/page/raw", requireGm, async (req, res, next) => {
  try {
    const data = await readRawPage(req.query.path, "gm");
    if (!data) return res.status(404).json({ error: "Page not found" });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

pagesRouter.get("/preview", async (req, res) => {
  const page = getPage(req.query.path, await resolveRequestMode(req, req.query.mode || "player"));
  if (!page) return res.status(404).json({ error: "Page not found" });
  res.json({ preview: { title: page.title, summary: page.summary, tags: page.tags, category: page.category, links: page.links, modifiedAt: page.modifiedAt } });
});

pagesRouter.post("/page", requireGm, async (req, res, next) => {
  try {
    const page = await createPage(req.body);
    await logAuditEvent({ req, action: "vault.page.create", entityType: "page", entityId: page.path, metadata: { title: page.title } });
    res.status(201).json({ page });
  } catch (error) {
    next(error);
  }
});

pagesRouter.put("/page", requireGm, async (req, res, next) => {
  try {
    const page = await savePage(req.body);
    await logAuditEvent({ req, action: "vault.page.update", entityType: "page", entityId: page.path, metadata: { title: page.title } });
    res.json({ page });
  } catch (error) {
    next(error);
  }
});

pagesRouter.put("/page/raw", requireGm, async (req, res, next) => {
  try {
    const page = await saveRawPage(req.body);
    await logAuditEvent({ req, action: "vault.page.raw_update", entityType: "page", entityId: page.path, metadata: { title: page.title } });
    res.json({ page });
  } catch (error) {
    next(error);
  }
});

pagesRouter.delete("/page", requireGm, async (req, res, next) => {
  try {
    const path = req.query.path || req.body?.path;
    const deleted = await deletePage(path);
    if (!deleted) return res.status(404).json({ error: "Page not found" });
    await logAuditEvent({ req, action: "vault.page.delete", entityType: "page", entityId: path });
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
    const result = await commitMarkdownImports(req.body);
    await logAuditEvent({ req, action: "vault.markdown_import.commit", entityType: "vault", metadata: { written: result?.written?.length || 0 } });
    res.json(result);
  } catch (error) {
    next(error);
  }
});