import fs from "fs/promises";
import { Router } from "express";
import { config } from "../config.js";
import { resolveRequestMode } from "../services/sessionService.js";
import { listPages } from "../services/vaultService.js";
import { resolveInside } from "../utils/safePath.js";

export const assetsRouter = Router();

function normalizeAssetName(value = "") {
  return decodeURIComponent(String(value || ""))
    .replace(/^\/api\/assets\//, "")
    .replace(/^images\//, "")
    .replace(/^[\\/]+/, "");
}

function assetNamesFromPage(page = {}) {
  return [
    page.mapImage,
    page.avatarImage,
    page.tokenImage,
    page.handoutImage,
    page.image,
    page.frontmatter?.mapImage,
    page.frontmatter?.avatarImage,
    page.frontmatter?.tokenImage,
    page.frontmatter?.handoutImage,
    page.frontmatter?.image
  ].filter(Boolean).map(normalizeAssetName);
}

function playerVisibleAssetNames() {
  return new Set(listPages("player").flatMap(assetNamesFromPage));
}

assetsRouter.get("/assets/list", async (req, res, next) => {
  try {
    const mode = await resolveRequestMode(req, req.query.mode);
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

assetsRouter.get("/assets/:file(*)", async (req, res, next) => {
  try {
    const file = normalizeAssetName(req.params.file);
    if (!file || file.includes("..") || /[\\/]/.test(file)) return res.status(404).json({ error: "Asset not found" });
    const mode = await resolveRequestMode(req, req.query.mode);
    if (mode !== "gm" && !playerVisibleAssetNames().has(file)) {
      return res.status(404).json({ error: "Asset not found" });
    }
    res.sendFile(resolveInside(config.imagesDir, file), (error) => error && next(error));
  } catch (error) {
    next(error);
  }
});