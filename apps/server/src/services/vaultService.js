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
      world: frontmatter.world || undefined,
      country: frontmatter.country || undefined,
      city: frontmatter.city || undefined,
      parent: frontmatter.parent || undefined,
      mapImage: frontmatter.mapImage || undefined,
      avatarImage: frontmatter.avatarImage || undefined,
      tokenImage: frontmatter.tokenImage || undefined,
      handoutImage: frontmatter.handoutImage || undefined,
      image: frontmatter.image || undefined,
      pins: Array.isArray(frontmatter.pins) ? frontmatter.pins : [],
      mapObjects: Array.isArray(frontmatter.mapObjects) ? frontmatter.mapObjects : [],
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
  const visiblePages = pages.map((page) => filterByMode(page, mode)).filter(Boolean);
  return visiblePages.map((page) => withBacklinks(page, visiblePages));
}

export function listMissingLinks(mode = "gm") {
  const visiblePages = pages.map((page) => filterByMode(page, mode)).filter(Boolean);
  const missing = new Map();

  for (const page of visiblePages) {
    for (const link of page.links || []) {
      if (findLinkedPage(link.target, visiblePages)) continue;
      const key = slugify(link.target);
      const entry = missing.get(key) || {
        title: link.target,
        slug: key,
        count: 0,
        sources: []
      };
      entry.count += 1;
      if (!entry.sources.some((source) => source.path === page.path)) {
        entry.sources.push(compactPage(page));
      }
      missing.set(key, entry);
    }
  }

  return [...missing.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
}

export function getPage(requestedPath, mode = "gm") {
  const normalized = normalizeVaultPath(requestedPath);
  const direct = pageByPath.get(normalized);
  const byTitle = pages.find((page) => page.title.toLowerCase() === normalized.toLowerCase());
  const bySlug = pages.find((page) => slugify(page.title) === slugify(normalized));
  const page = direct || byTitle || bySlug;
  const filtered = page ? filterByMode(page, mode) : null;
  if (!filtered) return null;
  const visiblePages = pages.map((item) => filterByMode(item, mode)).filter(Boolean);
  return withBacklinks(filtered, visiblePages);
}

function compactPage(page) {
  return {
    title: page.title,
    path: page.path,
    category: page.category,
    type: page.type,
    summary: page.summary
  };
}

function linkMatchesPage(link, page) {
  const target = slugify(link.target || "");
  return target === slugify(page.title) || target === slugify(page.path.replace(/\.md$/i, ""));
}

function findLinkedPage(target, visiblePages) {
  const normalized = slugify(target || "");
  return visiblePages.find((page) => (
    normalized === slugify(page.title)
    || normalized === slugify(page.path)
    || normalized === slugify(page.path.replace(/\.md$/i, ""))
  ));
}

function relatedMatchesPage(related, page) {
  const target = slugify(String(related || ""));
  return target === slugify(page.title) || target === slugify(page.path);
}

function withBacklinks(page, visiblePages) {
  const backlinks = visiblePages
    .filter((candidate) => candidate.path !== page.path)
    .filter((candidate) => {
      const wikiLinked = candidate.links?.some((link) => linkMatchesPage(link, page));
      const relatedLinked = Array.isArray(candidate.frontmatter?.related)
        && candidate.frontmatter.related.some((item) => relatedMatchesPage(item, page));
      return wikiLinked || relatedLinked;
    })
    .map(compactPage);

  const related = Array.isArray(page.frontmatter?.related)
    ? page.frontmatter.related
      .map((item) => visiblePages.find((candidate) => relatedMatchesPage(item, candidate)))
      .filter(Boolean)
      .map(compactPage)
    : [];

  const children = visiblePages
    .filter((candidate) => candidate.path !== page.path)
    .filter((candidate) => {
      if (page.type === "world") return candidate.world === page.title || candidate.parent === page.title;
      if (page.type === "country") return candidate.country === page.title || candidate.parent === page.title;
      if (page.type === "city") return candidate.city === page.title || candidate.parent === page.title;
      return false;
    })
    .map(compactPage);

  const missingLinks = (page.links || [])
    .filter((link) => !findLinkedPage(link.target, visiblePages))
    .map((link) => ({ title: link.target, label: link.label, slug: slugify(link.target) }));

  return { ...page, backlinks, relatedPages: related, children, missingLinks };
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
  await fs.writeFile(target, stringifyMarkdown(cleanFrontmatter(frontmatter), content), "utf8");
  await rebuildVaultIndex();
  return getPage(safe, "gm");
}

export async function readRawPage(requestedPath, mode = "gm") {
  const page = getPage(requestedPath, mode);
  if (!page) return null;
  const safe = ensureMarkdownPath(page.path);
  const raw = await fs.readFile(resolveInside(config.vaultDir, safe), "utf8");
  const { frontmatter, content } = parseMarkdown(raw);
  return { page: compactPage(page), raw, frontmatter, content };
}

export async function saveRawPage({ requestedPath, raw }) {
  const safe = ensureMarkdownPath(requestedPath);
  const target = resolveInside(config.vaultDir, safe);
  parseMarkdown(raw || "");
  await fs.writeFile(target, raw.endsWith("\n") ? raw : `${raw}\n`, "utf8");
  await rebuildVaultIndex();
  return getPage(safe, "gm");
}

export function previewMarkdownImports(files = []) {
  return files.map((file) => {
    const raw = file.content || "";
    const { frontmatter, content } = parseMarkdown(raw);
    const obsidianInfo = parseObsidianShortcut(raw) || parseObsidianShortcut(content);
    const cleanContent = obsidianInfo ? stripObsidianShortcutLines(content || raw) : content;
    const safeFrontmatter = obsidianInfo ? cleanObsidianShortcutFrontmatter(frontmatter) : frontmatter;
    const filenameTitle = titleFromImportedFilename(file.originalName);
    const title = obsidianInfo
      ? filenameTitle
      : (safeFrontmatter.name || safeFrontmatter.title || firstHeading(cleanContent) || filenameTitle);
    const inferredType = inferTypeFromText(title, cleanContent);
    const type = obsidianInfo || safeFrontmatter.type === "link"
      ? inferredType
      : (safeFrontmatter.type || inferredType);
    const category = obsidianInfo || safeFrontmatter.category === "link"
      ? defaultCategory(type)
      : (safeFrontmatter.category || defaultCategory(type));
    const targetPath = `${category}/${slugify(title)}.md`;
    const existing = pageByPath.has(targetPath);
    const warnings = [];
    if (existing) warnings.push("Файл с таким путём уже существует");
    if (obsidianInfo) {
      warnings.push("Похоже, это Obsidian-ссылка/ярлык. Название взято из имени загруженного файла, а служебные строки Obsidian будут очищены.");
      if (obsidianInfo.file) warnings.push(`Obsidian path: ${obsidianInfo.file}`);
      if (obsidianInfo.vault) warnings.push(`Obsidian vault: ${obsidianInfo.vault}`);
    }
    if (file.encoding && file.encoding !== "utf-8") warnings.push(`Кодировка распознана как ${file.encoding}`);
    return {
      id: file.id,
      originalName: file.originalName,
      title,
      type,
      category,
      targetPath,
      summary: summarize(cleanContent, safeFrontmatter),
      frontmatter: safeFrontmatter,
      content: cleanContent,
      encoding: file.encoding,
      obsidianInfo,
      warnings
    };
  });
}

export async function commitMarkdownImports({ items = [], conflictMode = "skip" }) {
  const written = [];
  const skipped = [];

  for (const item of items) {
    const safe = ensureMarkdownPath(item.targetPath);
    const exists = pageByPath.has(safe);
    if (exists && conflictMode === "skip") {
      skipped.push({ ...item, reason: "Конфликт: файл уже существует" });
      continue;
    }

    const finalPath = exists && conflictMode === "copy"
      ? await nextCopyPath(safe)
      : safe;

    const content = stringifyMarkdown(
      cleanFrontmatter({
        ...item.frontmatter,
        title: item.title,
        name: item.title,
        type: item.type,
        category: item.category,
        summary: item.summary,
        visibility: item.frontmatter?.visibility || "public"
      }),
      item.content || ""
    );

    const target = resolveInside(config.vaultDir, finalPath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, "utf8");
    written.push({ ...item, targetPath: finalPath });
  }

  await rebuildVaultIndex();
  return { written, skipped };
}

export async function createPage(payload) {
  const type = payload.type || "lore";
  const category = payload.category || defaultCategory(type);
  const title = payload.title || payload.name || payload.mapObjects?.[0]?.label || payload.pins?.[0]?.label || draftTitle(type);
  const requestedPath = payload.path || `${category}/${slugify(title)}.md`;
  const content = [
    payload.summary || "",
    "",
    "## Публичные заметки",
    payload.publicNotes || "",
    "",
    payload.gmSecrets ? `## GM Secrets\n${payload.gmSecrets}` : ""
  ].join("\n").trim();

  const excluded = new Set(["path", "requestedPath", "content", "publicNotes", "gmSecrets"]);
  const structuredFields = Object.fromEntries(
    Object.entries(payload).filter(([key]) => !excluded.has(key))
  );

  return savePage({
    requestedPath,
    frontmatter: {
      ...structuredFields,
      title,
      name: payload.name || title,
      type,
      category,
      summary: payload.summary || "",
      tags: payload.tags || [],
      related: payload.related || [],
      pins: payload.pins || [],
      mapObjects: payload.mapObjects || [],
      visibility: payload.visibility || "public"
    },
    content
  });
}

function cleanFrontmatter(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanFrontmatter(item))
      .filter((item) => item !== undefined && item !== "" && !(Array.isArray(item) && item.length === 0));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, cleanFrontmatter(item)])
        .filter(([, item]) => item !== undefined && item !== "" && !(Array.isArray(item) && item.length === 0))
    );
  }
  return value === null ? undefined : value;
}

function draftTitle(type) {
  const labels = {
    world: "Новый мир",
    country: "Новая страна",
    city: "Новый город",
    npc: "Новый NPC",
    enemy: "Новый враг",
    quest: "Новый квест",
    session: "Новая сессия",
    location: "Новая локация",
    timelineEvent: "Новое событие",
    lore: "Новая статья"
  };
  return `${labels[type] || "Новая статья"} ${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`;
}

function firstHeading(content = "") {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

function titleFromImportedFilename(originalName = "") {
  const base = String(originalName || "untitled.md")
    .split(/[\\/]/)
    .pop()
    .replace(/\.md$/i, "")
    .trim();
  if (!base) return "Untitled";
  if (/[\p{L}]/u.test(base) && /\s/.test(base)) {
    return base.replace(/\s+-\s+/g, " — ").replace(/[_]+/g, " ").replace(/\s{2,}/g, " ").trim();
  }
  return titleFromPath(base);
}

function cleanObsidianShortcutFrontmatter(frontmatter = {}) {
  const cleaned = { ...frontmatter };
  if (String(cleaned.type || "").toLowerCase() === "link") delete cleaned.type;
  if (String(cleaned.category || "").toLowerCase() === "link") delete cleaned.category;
  if (cleaned.action && String(cleaned.action).includes("obsidian://")) delete cleaned.action;
  if (cleaned.url && String(cleaned.url).includes("obsidian://")) delete cleaned.url;
  if (cleaned.name && String(cleaned.name).trim().toLowerCase() === "фракции") delete cleaned.name;
  return cleaned;
}

function stripObsidianShortcutLines(value = "") {
  const lines = String(value || "").split(/\r?\n/);
  const cleaned = lines.filter((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (/^action\s+obsidian:\/\/open\?/i.test(trimmed)) return false;
    if (/^action:\s*obsidian:\/\/open\?/i.test(trimmed)) return false;
    if (/^type\s*:?\s*link\s*$/i.test(trimmed)) return false;
    if (/^url:\s*obsidian:\/\/open\?/i.test(trimmed)) return false;
    if (index < 8 && /^name\s+/i.test(trimmed)) return false;
    return true;
  });
  return cleaned.join("\n").replace(/^\n+/, "").trim();
}

function parseObsidianShortcut(raw = "") {
  const match = raw.match(/obsidian:\/\/open\?([^\s]+)/i);
  if (!match) return null;
  const params = new URLSearchParams(match[1]);
  const file = params.get("file") ? decodeURIComponent(params.get("file")) : "";
  const vault = params.get("vault") ? decodeURIComponent(params.get("vault")) : "";
  const title = file ? titleFromPath(file.replace(/\\/g, "/").replace(/\.md$/i, "")) : "Obsidian shortcut";
  return { file, vault, title };
}

function inferTypeFromText(title = "", content = "") {
  const text = `${title}\n${content}`.toLowerCase();
  if (/(восстание|битва|война|эпоха|история|событие|revolt|uprising|battle|war|history|event)/i.test(text)) return "lore";
  if (/(мир|план|plane|world)/i.test(text)) return "world";
  if (/(страна|королевство|империя|country|kingdom|empire)/i.test(text)) return "country";
  if (/(город|поселение|city|town)/i.test(text)) return "city";
  if (/(npc|персонаж|капитан|магистр|торговец)/i.test(text)) return "npc";
  if (/(враг|монстр|enemy|monster|creature)/i.test(text)) return "enemy";
  if (/(квест|задание|quest)/i.test(text)) return "quest";
  if (/(сессия|session|recap)/i.test(text)) return "session";
  if (/(локация|таверна|башня|храм|location)/i.test(text)) return "location";
  return "lore";
}

async function nextCopyPath(safePath) {
  const ext = ".md";
  const base = safePath.endsWith(ext) ? safePath.slice(0, -ext.length) : safePath;
  let index = 2;
  while (pageByPath.has(`${base}-${index}${ext}`)) index += 1;
  return `${base}-${index}${ext}`;
}

function defaultCategory(type) {
  const categories = {
    world: "worlds",
    country: "countries",
    city: "cities",
    npc: "npcs",
    enemy: "enemies",
    quest: "quests",
    session: "sessions",
    location: "locations",
    timelineEvent: "lore/timeline"
  };
  return categories[type] || "lore";
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
