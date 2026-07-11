import fs from "fs/promises";
import multer from "multer";
import path from "path";
import { Router } from "express";
import { config } from "../config.js";
import { auditVault } from "../services/auditService.js";
import { getPlayerSafetyReview, listPages } from "../services/vaultService.js";
import { slugify } from "../utils/slugify.js";
import { resolveRequestMode, requireGm } from "../services/sessionService.js";
import { repairUploadedFilename } from "../utils/encoding.js";
import { logAuditEvent, listAuditEvents } from "../services/auditLogService.js";

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

toolsRouter.get("/metadata", requireGm, async (req, res, next) => {
  try {
    const pages = listPages(await resolveRequestMode(req, "gm"));
    const compact = pages.map((page) => ({
      title: page.title,
      path: page.path,
      type: page.type,
      category: page.category,
      world: page.world,
      country: page.country,
      city: page.city,
      tags: page.tags,
      summary: page.summary,
      visibility: page.visibility
    }));
    const tags = [...new Set(pages.flatMap((page) => page.tags || []))].sort((a, b) => a.localeCompare(b));
    res.json({
      pages: compact,
      tags,
      worlds: compact.filter((page) => page.type === "world" || page.category === "worlds"),
      countries: compact.filter((page) => page.type === "country" || page.category === "countries"),
      cities: compact.filter((page) => page.type === "city" || page.category === "cities"),
      locations: compact.filter((page) => page.category === "locations"),
      npcs: compact.filter((page) => page.category === "npcs"),
      enemies: compact.filter((page) => page.category === "enemies"),
      quests: compact.filter((page) => page.category === "quests")
    });
  } catch (error) {
    next(error);
  }
});

toolsRouter.get("/player-safety", requireGm, (_req, res) => {
  res.json(getPlayerSafetyReview());
});

toolsRouter.get("/assets/list", requireGm, async (req, res, next) => {
  try {
    const visiblePages = listPages("gm");
    const used = new Set(visiblePages.flatMap((page) => [page.mapImage, page.avatarImage, page.tokenImage, page.handoutImage, page.image]).filter(Boolean).map((item) => String(item).replace(/^images\//, "")));
    let files = [];
    try {
      files = await fs.readdir(config.imagesDir, { withFileTypes: true });
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

toolsRouter.get("/audit", requireGm, async (_req, res, next) => {
  try {
    res.json(await auditVault("gm"));
  } catch (error) {
    next(error);
  }
});

toolsRouter.get("/audit-log", requireGm, async (req, res, next) => {
  try {
    res.json({ events: await listAuditEvents(req.query.limit) });
  } catch (error) {
    next(error);
  }
});

toolsRouter.post("/assets/upload", requireGm, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No map file received." });
    await fs.mkdir(config.imagesDir, { recursive: true });

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
    let target = path.join(config.imagesDir, fileName);
    let copy = 2;
    while (true) {
      try {
        await fs.access(target);
        fileName = `${base}-${copy}${ext}`;
        target = path.join(config.imagesDir, fileName);
        copy += 1;
      } catch {
        break;
      }
    }

    await fs.writeFile(target, req.file.buffer);
    await logAuditEvent({ req, action: "vault.asset.upload", entityType: "asset", entityId: fileName, metadata: { size: req.file.size } });
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
