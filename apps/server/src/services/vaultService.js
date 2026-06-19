import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";
import { parseMarkdown, stringifyMarkdown } from "../utils/frontmatter.js";
import { ensureMarkdownPath, normalizeVaultPath, resolveInside } from "../utils/safePath.js";
import { slugify, titleFromPath } from "../utils/slugify.js";
import { extractWikiLinks, renderWikiMarkdown } from "./markdownService.js";
import { filterByMode } from "./visibilityService.js";

let pages = [];
let pageByPath = new Map();

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith("_")) return walk(full);
    if (entry.isFile() && entry.name.endsWith(".md")) return [full];
    return [];
  }));
  return nested.flat();
}

function inferCategory(relativePath, frontmatter) {
  if (frontmatter.category) return frontmatter.category;
  const parts = normalizeVaultPath(relativePath).split("/");
  if (parts[0] === "lore" && parts[1]) return parts.slice(0, 2).join("/");
  return parts.length > 1 ? parts[0] : "dashboard";
}

function summarize(content, frontmatter) {
  if (frontmatter.summary) return frontmatter.summary;
  return content
    .replace(/^---[\s\S]*?---/, "")
    .replace(/[#>*_[\]()`]/g, "")
    .split(/\n+/)
    .find((line) => line.trim().length > 20)
    ?.trim()
    .slice(0, 220) || "";
}

export async function rebuildVaultIndex() {
  await fs.mkdir(config.vaultDir, { recursive: true });
  const files = await walk(config.vaultDir);
  const nextPages = await Promise.all(files.map(async (file) => {
    const raw = await fs.readFile(file, "utf8");
    const relativePath = normalizeVaultPath(path.relative(config.vaultDir, file));
    const stat = await fs.stat(file);
    const { frontmatter, content } = parseMarkdown(raw);
    const title = frontmatter.name || frontmatter.title || titleFromPath(relativePath);
    return {
      path: relativePath,
      title,
      category: inferCategory(relativePath, frontmatter),
      type: frontmatter.type || inferCategory(relativePath, frontmatter),
      summary: summarize(content, frontmatter),
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      visibility: frontmatter.visibility || "public",
      frontmatter,
      content,
      html: renderWikiMarkdown(content),
      links: extractWikiLinks(content),
      modifiedAt: stat.mtime.toISOString()
    };
  }));
  pages = nextPages.sort((a, b) => a.title.localeCompare(b.title));
  pageByPath = new Map(pages.map((page) => [page.path, page]));
  return pages;
}

export function listPages(mode = "gm") {
  return pages.map((page) => filterByMode(page, mode)).filter(Boolean);
}

export function getPage(requestedPath, mode = "gm") {
  const normalized = normalizeVaultPath(requestedPath);
  const direct = pageByPath.get(normalized);
  const byTitle = pages.find((page) => page.title.toLowerCase() === normalized.toLowerCase());
  const bySlug = pages.find((page) => slugify(page.title) === slugify(normalized));
  const page = direct || byTitle || bySlug;
  return page ? filterByMode(page, mode) : null;
}

export function getCategories(mode = "gm") {
  const grouped = new Map();
  for (const page of listPages(mode)) {
    const key = page.category || "uncategorized";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(page);
  }
  return [...grouped.entries()].map(([category, items]) => ({ category, count: items.length, pages: items }));
}

export async function savePage({ requestedPath, frontmatter = {}, content = "" }) {
  const safe = ensureMarkdownPath(requestedPath);
  const target = resolveInside(config.vaultDir, safe);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, stringifyMarkdown(frontmatter, content), "utf8");
  await rebuildVaultIndex();
  return getPage(safe, "gm");
}

export async function createPage(payload) {
  const type = payload.type || "lore";
  const category = payload.category || (type === "npc" ? "npcs" : `${type}s`);
  const title = payload.title || payload.name || "Untitled";
  const requestedPath = payload.path || `${category}/${slugify(title)}.md`;
  const content = [
    payload.summary || "",
    "",
    "## Public Notes",
    payload.publicNotes || "",
    "",
    payload.gmSecrets ? `## GM Secrets\n${payload.gmSecrets}` : ""
  ].join("\n").trim();
  return savePage({
    requestedPath,
    frontmatter: {
      title,
      name: payload.name || title,
      type,
      category,
      subtype: payload.subtype || undefined,
      summary: payload.summary || "",
      tags: payload.tags || [],
      related: payload.related || [],
      image: payload.image || undefined,
      visibility: payload.visibility || "public",
      status: payload.status || undefined
    },
    content
  });
}

export async function pageExists(relativePath) {
  try {
    await fs.access(resolveInside(config.vaultDir, ensureMarkdownPath(relativePath)));
    return true;
  } catch {
    return false;
  }
}

export { pages };
