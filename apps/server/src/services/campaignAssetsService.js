import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";

export function campaignAssetDirectory(campaignId) {
  const safeCampaignId = String(campaignId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeCampaignId) {
    const error = new Error("An active campaign is required for campaign assets.");
    error.status = 403;
    throw error;
  }
  return path.join(config.campaignAssetsDir, safeCampaignId);
}

export function normalizeCampaignAssetName(value = "") {
  const file = decodeURIComponent(String(value || ""))
    .replace(/^\/api\/assets\//, "")
    .replace(/^images\//, "")
    .replace(/^[\\/]+/, "");
  if (!file || file.includes("..") || /[\\/]/.test(file)) return "";
  return file;
}

export function referencedCampaignAssetNames(pages = []) {
  const values = pages.flatMap((page) => [
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
  ]);
  return new Set(values.map(normalizeCampaignAssetName).filter(Boolean));
}

export async function importLegacyAssetsForCampaign({ campaignId, pages = [] } = {}) {
  const targetDir = campaignAssetDirectory(campaignId);
  await fs.mkdir(targetDir, { recursive: true });
  const report = { copied: [], existing: [], missing: [] };

  for (const fileName of referencedCampaignAssetNames(pages)) {
    const source = path.join(config.imagesDir, fileName);
    const target = path.join(targetDir, fileName);
    try {
      await fs.access(target);
      report.existing.push(fileName);
      continue;
    } catch {}
    try {
      await fs.copyFile(source, target);
      report.copied.push(fileName);
    } catch {
      report.missing.push(fileName);
    }
  }
  return report;
}
