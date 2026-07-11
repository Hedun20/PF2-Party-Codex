import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";
import { renderWikiMarkdown } from "./markdownService.js";
import { campaignCategories, listCampaignPages } from "./campaignContentService.js";

function toJournal(page) {
  return {
    name: page.title,
    type: "JournalEntry",
    folder: page.category,
    flags: {
      partyCodex: {
        sourcePath: page.path,
        exportedAt: new Date().toISOString()
      }
    },
    pages: [
      {
        name: page.title,
        type: "text",
        text: {
          format: 1,
          content: renderWikiMarkdown(page.content)
        }
      }
    ]
  };
}

export function campaignFoundryExportPath(campaignId) {
  const safeCampaignId = String(campaignId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeCampaignId) return "";
  return path.join(config.campaignExportsDir, safeCampaignId, "party-codex-journals.json");
}

export async function buildFoundryExport({ campaignId = "", role = "gm", mode = "gm", paths = [], category = "", exportMode = "single" } = {}) {
  const effectiveRole = mode === "player" ? "player" : role;
  let pages = await listCampaignPages({ campaignId, role: effectiveRole });
  if (paths.length) pages = pages.filter((page) => paths.includes(page.path));
  if (category) pages = pages.filter((page) => page.category === category || page.category.startsWith(`${category}/`));
  const journals = pages.map(toJournal);
  const singlePath = campaignFoundryExportPath(campaignId);
  if (!singlePath) {
    const error = new Error("An active campaign is required for Foundry export.");
    error.status = 403;
    throw error;
  }
  const exportDir = path.dirname(singlePath);
  await fs.mkdir(exportDir, { recursive: true });
  await fs.writeFile(singlePath, JSON.stringify(journals, null, 2), "utf8");

  if (exportMode === "per-page" || exportMode === "module") {
    await Promise.all(journals.map((journal) => {
      const file = path.join(exportDir, `${journal.name.replace(/[^\w-]+/g, "-").toLowerCase()}.json`);
      return fs.writeFile(file, JSON.stringify(journal, null, 2), "utf8");
    }));
  }

  if (exportMode === "module") {
    await fs.mkdir(path.join(exportDir, "packs"), { recursive: true });
    await fs.writeFile(path.join(exportDir, "module.json"), JSON.stringify({
      id: "party-codex-export",
      title: "Party Codex Export",
      version: "0.1.0",
      compatibility: { minimum: "13", verified: "13" },
      packs: []
    }, null, 2), "utf8");
    await fs.writeFile(path.join(exportDir, "README_IMPORT.md"), [
      "# Party Codex Foundry Export",
      "",
      "Import these JSON files into a test world first.",
      "Foundry schemas vary by version, and links or images may need manual adjustment.",
      "Back up the real world before importing any generated data."
    ].join("\n"), "utf8");
  }

  return { journals, categories: await campaignCategories({ campaignId, role: effectiveRole }), downloadPath: singlePath };
}
