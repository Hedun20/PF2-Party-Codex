import fs from "fs/promises";
import express from "express";
import { Router } from "express";
import { config } from "../config.js";
import { resolveRequestMode } from "../services/sessionService.js";

export const assetsRouter = Router();

assetsRouter.get("/assets/list", async (req, res, next) => {
  try {
    const mode = resolveRequestMode(req, req.query.mode);
    if (mode !== "gm") return res.json({ assets: [] });
    const entries = await fs.readdir(config.imagesDir, { withFileTypes: true }).catch(() => []);
    const assets = entries
      .filter((entry) => entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name))
      .map((entry) => ({ fileName: entry.name, path: entry.name, url: `/api/assets/${entry.name}` }))
      .sort((a, b) => a.fileName.localeCompare(b.fileName));
    res.json({ assets });
  } catch (error) {
    next(error);
  }
});

assetsRouter.use("/assets", express.static(config.imagesDir, { fallthrough: false, index: false }));
