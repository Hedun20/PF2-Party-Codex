import fs from "fs/promises";
import multer from "multer";
import path from "path";
import { Router } from "express";
import { auditPages } from "../services/auditService.js";
import {
  campaignMetadata,
  campaignPlayerSafetyReview,
  listCampaignPages
} from "../services/campaignContentService.js";
import { campaignAssetDirectory, referencedCampaignAssetNames, workspaceAssetUsageBytes } from "../services/campaignAssetsService.js";
import { slugify } from "../utils/slugify.js";
import { requireGm } from "../services/sessionService.js";
import { repairUploadedFilename } from "../utils/encoding.js";
import { logAuditEvent, listAuditEvents } from "../services/auditLogService.js";
import { workspaceUsage } from "../repositories/identityRepository.js";
import { assertPlanCapacity } from "../services/entitlementsService.js";

const allowedExt = [".png", ".jpg", ".jpeg", ".webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const imageMime = /^image\/(png|jpeg|jpg|pjpeg|webp)$/i.test(file.mimetype);
    const imageExt = allowedExt.includes(ext);
    if (!imageMime && !imageExt) return cb(new Error("Only PNG, JPG, JPEG or WebP maps can be uploaded."));
    cb(null, true);
  }
});

export const toolsRouter = Router();

function contentContext(req) {
  return {
    campaignId: req.campaignIdentity?.campaign?.id || req.campaignIdentity?.membership?.campaignId || "",
    userId: req.campaignIdentity?.user?.id || req.campaignIdentity?.membership?.userId || "",
    role: req.campaignIdentity?.role || "player"
  };
}

toolsRouter.get("/metadata", requireGm, async (req, res, next) => {
  try {
    res.json(await campaignMetadata(contentContext(req)));
  } catch (error) {
    next(error);
  }
});

toolsRouter.get("/player-safety", requireGm, async (req, res, next) => {
  try {
    res.json(await campaignPlayerSafetyReview(contentContext(req)));
  } catch (error) {
    next(error);
  }
});

toolsRouter.get("/assets/list", requireGm, async (req, res, next) => {
  try {
    const visiblePages = await listCampaignPages(contentContext(req));
    const used = referencedCampaignAssetNames(visiblePages);
    const assetDir = campaignAssetDirectory(contentContext(req).campaignId);
    let files = [];
    try {
      files = await fs.readdir(assetDir, { withFileTypes: true });
    } catch {
      files = [];
    }
    const assets = files
      .filter((entry) => entry.isFile())
      .map((entry) => ({ fileName: entry.name, path: entry.name, url: `/api/assets/${encodeURIComponent(entry.name)}`, used: used.has(entry.name) }));
    res.json({ assets, unused: assets.filter((asset) => !asset.used) });
  } catch (error) {
    next(error);
  }
});

toolsRouter.get("/audit", requireGm, async (req, res, next) => {
  try {
    const pages = await listCampaignPages(contentContext(req));
    res.json(await auditPages(pages, { imagesDir: campaignAssetDirectory(contentContext(req).campaignId) }));
  } catch (error) {
    next(error);
  }
});

toolsRouter.get("/audit-log", requireGm, async (req, res, next) => {
  try {
    res.json({ events: await listAuditEvents({ limit: req.query.limit, campaignId: contentContext(req).campaignId }) });
  } catch (error) {
    next(error);
  }
});

toolsRouter.post("/assets/upload", requireGm, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No map file received." });
    const workspace = req.campaignIdentity.workspace;
    const usage = await workspaceUsage(workspace.id);
    const assetBytes = await workspaceAssetUsageBytes(usage.campaignIds);
    assertPlanCapacity({ workspace, resource: "assetBytes", current: assetBytes, increase: req.file.size });
    const assetDir = campaignAssetDirectory(contentContext(req).campaignId);
    await fs.mkdir(assetDir, { recursive: true });

    const originalName = repairUploadedFilename(req.file.originalname);
    const rawExt = path.extname(originalName).toLowerCase();
    const ext = allowedExt.includes(rawExt)
      ? rawExt
      : req.file.mimetype.includes("png")
        ? ".png"
        : req.file.mimetype.includes("webp")
          ? ".webp"
          : ".jpg";

    const base = slugify(path.basename(originalName, rawExt || ext));
    let fileName = `${base}${ext}`;
    let target = path.join(assetDir, fileName);
    let copy = 2;
    while (true) {
      try {
        await fs.writeFile(target, req.file.buffer, { flag: "wx" });
        break;
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
        fileName = `${base}-${copy}${ext}`;
        target = path.join(assetDir, fileName);
        copy += 1;
      }
    }

    await logAuditEvent({ req, action: "campaign.asset.upload", entityType: "asset", entityId: fileName, metadata: { size: req.file.size } });
    res.status(201).json({ fileName, path: fileName, url: `/api/assets/${fileName}` });
  } catch (error) {
    next(error);
  }
});

toolsRouter.use((error, _req, res, next) => {
  if (error?.message?.includes("File too large")) return res.status(413).json({ error: "Map is too large. Upload limit is 100MB." });
  if (error?.message?.includes("Only PNG")) return res.status(400).json({ error: error.message });
  next(error);
});
