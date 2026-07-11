import { Router } from "express";
import multer from "multer";
import {
  previewMarkdownImports,
} from "../services/vaultService.js";
import {
  campaignMissingLinks,
  commitCampaignMarkdownImports,
  createCampaignPage,
  deleteCampaignPage,
  findCampaignPage,
  listCampaignPages,
  readCampaignRawPage,
  saveCampaignPage,
  saveCampaignRawPage
} from "../services/campaignContentService.js";
import { decodeMarkdownBuffer, repairUploadedFilename } from "../utils/encoding.js";
import { requireCampaignMember, resolveRequestMode, requireGm } from "../services/sessionService.js";
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

async function requestContentContext(req, requestedMode = "") {
  const identity = req.campaignIdentity;
  return {
    campaignId: identity?.campaign?.id || identity?.membership?.campaignId || "",
    userId: identity?.user?.id || identity?.membership?.userId || "",
    role: requestedMode ? await resolveRequestMode(req, requestedMode) : identity?.role || "player"
  };
}

pagesRouter.get("/pages", requireCampaignMember, async (req, res, next) => {
  try {
    const context = await requestContentContext(req, req.query.mode || "");
    res.json({ pages: await listCampaignPages(context), campaignId: context.campaignId, role: context.role });
  } catch (error) {
    next(error);
  }
});

pagesRouter.get("/missing-links", requireGm, async (req, res, next) => {
  try {
    const context = await requestContentContext(req, "gm");
    res.json({ missingLinks: await campaignMissingLinks(context), campaignId: context.campaignId });
  } catch (error) {
    next(error);
  }
});

pagesRouter.get("/page", requireCampaignMember, async (req, res, next) => {
  try {
    const context = await requestContentContext(req, req.query.mode || "");
    const page = await findCampaignPage({ ...context, path: req.query.path });
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json({ page });
  } catch (error) {
    next(error);
  }
});

pagesRouter.get("/page/raw", requireGm, async (req, res, next) => {
  try {
    const context = await requestContentContext(req, "gm");
    const data = await readCampaignRawPage({ ...context, path: req.query.path });
    if (!data) return res.status(404).json({ error: "Page not found" });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

pagesRouter.get("/preview", requireCampaignMember, async (req, res, next) => {
  try {
    const context = await requestContentContext(req, req.query.mode || "player");
    const page = await findCampaignPage({ ...context, path: req.query.path });
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json({ preview: { title: page.title, summary: page.summary, tags: page.tags, category: page.category, links: page.links, modifiedAt: page.modifiedAt } });
  } catch (error) {
    next(error);
  }
});

pagesRouter.post("/page", requireGm, async (req, res, next) => {
  try {
    const context = await requestContentContext(req, "gm");
    const page = await createCampaignPage({ ...context, payload: req.body || {} });
    await logAuditEvent({ req, action: "vault.page.create", entityType: "page", entityId: page.path, metadata: { title: page.title } });
    res.status(201).json({ page });
  } catch (error) {
    next(error);
  }
});

pagesRouter.put("/page", requireGm, async (req, res, next) => {
  try {
    const context = await requestContentContext(req, "gm");
    const page = await saveCampaignPage({ ...context, ...(req.body || {}) });
    await logAuditEvent({ req, action: "vault.page.update", entityType: "page", entityId: page.path, metadata: { title: page.title } });
    res.json({ page });
  } catch (error) {
    next(error);
  }
});

pagesRouter.put("/page/raw", requireGm, async (req, res, next) => {
  try {
    const context = await requestContentContext(req, "gm");
    const page = await saveCampaignRawPage({ ...context, ...(req.body || {}) });
    await logAuditEvent({ req, action: "vault.page.raw_update", entityType: "page", entityId: page.path, metadata: { title: page.title } });
    res.json({ page });
  } catch (error) {
    next(error);
  }
});

pagesRouter.delete("/page", requireGm, async (req, res, next) => {
  try {
    const path = req.query.path || req.body?.path;
    const context = await requestContentContext(req, "gm");
    const deleted = await deleteCampaignPage({ ...context, path });
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
    const context = await requestContentContext(req, "gm");
    const result = await commitCampaignMarkdownImports({ ...context, ...(req.body || {}) });
    await logAuditEvent({ req, action: "vault.markdown_import.commit", entityType: "vault", metadata: { written: result?.written?.length || 0 } });
    res.json(result);
  } catch (error) {
    next(error);
  }
});
