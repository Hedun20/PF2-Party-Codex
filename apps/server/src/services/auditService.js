import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";
import { listPages } from "./vaultService.js";

function hasPage(titleOrPath, pages) {
  const value = String(titleOrPath || "").toLowerCase();
  return pages.some((page) => page.title.toLowerCase() === value || page.path.toLowerCase() === value);
}

async function imageExists(image, imagesDir = config.imagesDir) {
  if (!image) return true;
  const file = image.replace(/^\/api\/assets\//, "").replace(/^images\//, "");
  try {
    await fs.access(path.join(imagesDir, file));
    return true;
  } catch {
    return false;
  }
}

export async function auditPages(pages = [], { imagesDir = config.imagesDir } = {}) {
  const issues = [];

  for (const page of pages) {
    if (page.type === "country" && !page.world) {
      issues.push({ level: "warning", path: page.path, title: page.title, message: "У страны не указан мир." });
    }
    if (page.type === "city" && (!page.world || !page.country)) {
      issues.push({ level: "warning", path: page.path, title: page.title, message: "У города должен быть указан мир и страна." });
    }
    if (["npc", "enemy", "quest", "location"].includes(page.type) && !page.world) {
      issues.push({ level: "info", path: page.path, title: page.title, message: "Сущность не привязана к миру." });
    }
    if (page.mapImage && !(await imageExists(page.mapImage, imagesDir))) {
      issues.push({ level: "error", path: page.path, title: page.title, message: `PNG/JPG карта не найдена: ${page.mapImage}` });
    }
    for (const pin of page.pins || []) {
      if (!pin.path || !hasPage(pin.path, pages)) {
        issues.push({ level: "error", path: page.path, title: page.title, message: `Пин "${pin.label || "без названия"}" ведёт на несуществующую статью.` });
      }
    }
    for (const related of page.frontmatter?.related || []) {
      if (!hasPage(related, pages)) {
        issues.push({ level: "warning", path: page.path, title: page.title, message: `Связь "${related}" не найдена.` });
      }
    }
    if (!page.relatedPages?.length && !page.backlinks?.length && page.path !== "index.md") {
      issues.push({ level: "info", path: page.path, title: page.title, message: "Статья пока не связана с другими материалами." });
    }
  }

  return {
    total: issues.length,
    errors: issues.filter((issue) => issue.level === "error").length,
    warnings: issues.filter((issue) => issue.level === "warning").length,
    info: issues.filter((issue) => issue.level === "info").length,
    issues
  };
}

export async function auditVault(mode = "gm") {
  return auditPages(listPages(mode), { imagesDir: config.imagesDir });
}
