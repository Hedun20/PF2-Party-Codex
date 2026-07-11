import path from "path";
import TurndownService from "turndown";
import { slugify } from "../utils/slugify.js";
import { findRawEntryByPath } from "../repositories/entriesRepository.js";
import { saveCampaignPage } from "./campaignContentService.js";

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

function foundryLinksToWiki(text = "") {
  return text
    .replace(/@JournalEntry(?:Page)?\[[^\]]+\]\{([^}]+)\}/g, "[[$1]]")
    .replace(/@JournalEntry(?:Page)?\[([^\]]+)\]/g, "[[Foundry Journal $1]]")
    .replace(/@UUID\[([^\]]+)\]\{([^}]+)\}/g, "[[$2]]")
    .replace(/@UUID\[([^\]]+)\]/g, "[[Foundry UUID $1]]");
}

function categoryFromFolder(folder = "", name = "") {
  const value = `${folder} ${name}`.toLowerCase();
  if (/\bnpcs?\b/.test(value)) return "npcs";
  if (/(enemies|bestiary|monsters)/.test(value)) return "enemies";
  if (/gods?/.test(value)) return "lore/gods";
  if (/countr|nation/.test(value)) return "lore/countries";
  if (/faction/.test(value)) return "lore/factions";
  if (/history/.test(value)) return "lore/history";
  if (/planes?/.test(value)) return "lore/planes";
  if (/artifact/.test(value)) return "lore/artifacts";
  if (/magic/.test(value)) return "lore/magic";
  if (/cult/.test(value)) return "lore/cults";
  if (/prophec/.test(value)) return "lore/prophecies";
  if (/timeline/.test(value)) return "lore/timeline";
  if (/quests?/.test(value)) return "quests";
  if (/(sessions?|recaps?)/.test(value)) return "sessions";
  if (/locations?|places?/.test(value)) return "locations";
  return "imported";
}

function normalizeDocuments(input) {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.items)) return input.items;
  if (Array.isArray(input?.documents)) return input.documents;
  if (Array.isArray(input?.entries)) return input.entries;
  return [input];
}

function pageContent(page, doc) {
  const html = page?.text?.content || page?.content || page?.description || doc?.content || "";
  return foundryLinksToWiki(turndown.turndown(html));
}

export async function previewFoundryImport(files = [], { campaignId = "" } = {}) {
  const previews = [];
  for (const file of files) {
    const parsed = JSON.parse(file.buffer.toString("utf8"));
    for (const doc of normalizeDocuments(parsed)) {
      const pages = Array.isArray(doc.pages) && doc.pages.length ? doc.pages : [doc];
      for (const page of pages) {
        const title = page.name || doc.name || "Imported Journal";
        const folder = doc.folder?.name || doc.folder || page.folder || "";
        const category = categoryFromFolder(folder, title);
        const targetPath = `${category}/${slugify(title)}.md`;
        previews.push({
          sourceFile: file.originalname,
          sourceTitle: title,
          detectedCategory: category,
          targetPath,
          conflict: Boolean(await findRawEntryByPath({ campaignId, path: targetPath })),
          warnings: [
            !doc.pages && !doc.content && !page.content && !page.text?.content ? "No obvious journal content field found." : null,
            /@UUID\[/.test(JSON.stringify(page)) ? "Contains Foundry UUID links that may need manual cleanup." : null
          ].filter(Boolean),
          document: doc,
          page
        });
      }
    }
  }
  return previews;
}

export async function commitFoundryImport(items = [], conflictMode = "skip", { campaignId = "", userId = "" } = {}) {
  const written = [];
  for (const item of items) {
    let targetPath = item.targetPath;
    const conflict = Boolean(await findRawEntryByPath({ campaignId, path: targetPath }));
    if (conflict && conflictMode === "skip") continue;
    if (conflict && conflictMode === "copy") {
      const ext = path.extname(targetPath);
      const base = targetPath.slice(0, -ext.length);
      let index = 2;
      while (await findRawEntryByPath({ campaignId, path: `${base}-${index}${ext}` })) index += 1;
      targetPath = `${base}-${index}${ext}`;
    }
    const doc = item.document || {};
    const page = item.page || {};
    const title = item.sourceTitle || page.name || doc.name || "Imported Journal";
    const content = pageContent(page, doc);
    const saved = await saveCampaignPage({
      campaignId,
      userId,
      requestedPath: targetPath,
      frontmatter: {
        title,
        name: title,
        type: item.detectedCategory?.startsWith("lore") ? "lore" : item.detectedCategory?.replace(/s$/, "") || "journal",
        category: item.detectedCategory,
        visibility: "public",
        tags: ["foundry-import"],
        foundry: {
          id: page._id || page.id || doc._id || doc.id,
          uuid: page.uuid || doc.uuid,
          originalName: doc.name || title,
          folder: doc.folder?.name || doc.folder || "",
          importedAt: new Date().toISOString()
        }
      },
      content
    });
    written.push(saved);
  }
  return written;
}
