import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";
import { renderWikiMarkdown } from "./markdownService.js";
import { getCategories, listPages } from "./vaultService.js";

function toJournal(page) {
  return {
    name: page.title,
    type: "JournalEntry",
    folder: page.category,
    flags: {
      pf2PartyCodex: {
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

export async function buildFoundryExport({ mode = "gm", paths = [], category = "", exportMode = "single" } = {}) {
  let pages = listPages(mode);
  if (paths.length) pages = pages.filter((page) => paths.includes(page.path));
  if (category) pages = pages.filter((page) => page.category === category || page.category.startsWith(`${category}/`));
  const journals = pages.map(toJournal);
  await fs.mkdir(config.exportDir, { recursive: true });
  const singlePath = path.join(config.exportDir, "pf2-party-codex-journals.json");
  await fs.writeFile(singlePath, JSON.stringify(journals, null, 2), "utf8");

  if (exportMode === "per-page" || exportMode === "module") {
    await Promise.all(journals.map((journal) => {
      const file = path.join(config.exportDir, `${journal.name.replace(/[^\w-]+/g, "-").toLowerCase()}.json`);
      return fs.writeFile(file, JSON.stringify(journal, null, 2), "utf8");
    }));
  }

  if (exportMode === "module") {
    await fs.mkdir(path.join(config.exportDir, "packs"), { recursive: true });
    await fs.writeFile(path.join(config.exportDir, "module.json"), JSON.stringify({
      id: "pf2-party-codex-export",
      title: "Party Codex Export",
      version: "0.1.0",
      compatibility: { minimum: "13", verified: "13" },
      packs: []
    }, null, 2), "utf8");
    await fs.writeFile(path.join(config.exportDir, "README_IMPORT.md"), [
      "# Party Codex Foundry Export",
      "",
      "Import these JSON files into a test world first.",
      "Foundry schemas vary by version, and links or images may need manual adjustment.",
      "Back up the real world before importing any generated data."
    ].join("\n"), "utf8");
  }

  return { journals, categories: getCategories(mode), downloadPath: singlePath };
}
