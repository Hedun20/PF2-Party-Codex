import { Router } from "express";
import { requireCampaignMember, resolveRequestMode } from "../services/sessionService.js";
import { listCampaignPages } from "../services/campaignContentService.js";
import { campaignAssetDirectory, normalizeCampaignAssetName, referencedCampaignAssetNames } from "../services/campaignAssetsService.js";
import { resolveInside } from "../utils/safePath.js";

export const assetsRouter = Router();

function normalizeAssetName(value = "") {
  return normalizeCampaignAssetName(value);
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

function playerVisibleAssetNames(pages = []) {
  return new Set([...referencedCampaignAssetNames(pages), ...pages.flatMap(assetNamesFromPage)]);
}

assetsRouter.get("/assets/:file(*)", requireCampaignMember, async (req, res, next) => {
  try {
    const file = normalizeAssetName(req.params.file);
    if (!file || file.includes("..") || /[\\/]/.test(file)) return res.status(404).json({ error: "Asset not found" });
    const mode = await resolveRequestMode(req, req.query.mode);
    const campaignId = req.campaignIdentity?.campaign?.id || req.campaignIdentity?.membership?.campaignId || "";
    const pages = await listCampaignPages({ campaignId, role: mode });
    if (mode !== "gm" && !playerVisibleAssetNames(pages).has(file)) {
      return res.status(404).json({ error: "Asset not found" });
    }
    const assetDir = campaignAssetDirectory(campaignId);
    res.sendFile(resolveInside(assetDir, file), (error) => error && next(error));
  } catch (error) {
    next(error);
  }
});
