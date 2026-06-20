import fs from "fs/promises";
import multer from "multer";
import path from "path";
import { Router } from "express";
import { config } from "../config.js";
import { auditVault } from "../services/auditService.js";
import { listPages } from "../services/vaultService.js";
import { slugify } from "../utils/slugify.js";

const allowedExt = [".png", ".jpg", ".jpeg", ".webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const imageMime = /^image\/(png|jpeg|jpg|pjpeg|webp)$/i.test(file.mimetype);
    const imageExt = allowedExt.includes(ext);
    if (!imageMime && !imageExt) {
      return cb(new Error("Можно загружать только PNG, JPG, JPEG или WebP карты."));
    }
    cb(null, true);
  }
});

export const toolsRouter = Router();

toolsRouter.get("/metadata", (req, res) => {
  const pages = listPages(req.query.mode || "gm");
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
});

toolsRouter.get("/audit", async (req, res, next) => {
  try {
    res.json(await auditVault(req.query.mode || "gm"));
  } catch (error) {
    next(error);
  }
});

toolsRouter.post("/assets/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Файл карты не получен." });
    await fs.mkdir(config.imagesDir, { recursive: true });

    const rawExt = path.extname(req.file.originalname).toLowerCase();
    const ext = allowedExt.includes(rawExt)
      ? rawExt
      : req.file.mimetype.includes("png")
        ? ".png"
        : req.file.mimetype.includes("webp")
          ? ".webp"
          : ".jpg";

    const base = slugify(path.basename(req.file.originalname, rawExt || ext));
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
    res.status(201).json({ fileName, path: fileName, url: `/api/assets/${fileName}` });
  } catch (error) {
    next(error);
  }
});

toolsRouter.use((error, _req, res, next) => {
  if (error?.message?.includes("File too large")) {
    return res.status(413).json({ error: "Карта слишком большая. Сейчас лимит загрузки: 100MB." });
  }
  if (error?.message?.includes("Можно загружать")) {
    return res.status(400).json({ error: error.message });
  }
  next(error);
});
