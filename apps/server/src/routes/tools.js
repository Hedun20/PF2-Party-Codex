import fs from "fs/promises";
import multer from "multer";
import path from "path";
import { Router } from "express";
import { config } from "../config.js";
import { auditVault } from "../services/auditService.js";
import { listPages } from "../services/vaultService.js";
import { slugify } from "../utils/slugify.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.mimetype)) {
      return cb(new Error("Можно загружать только PNG, JPG или WebP карты."));
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
    summary: page.summary
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
    const ext = path.extname(req.file.originalname).toLowerCase() || ".png";
    const base = slugify(path.basename(req.file.originalname, ext));
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
