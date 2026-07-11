import MiniSearch from "minisearch";
import { parseMarkdown, stringifyMarkdown } from "../utils/frontmatter.js";
import { slugify } from "../utils/slugify.js";
import {
  analyzePlayerSafety,
  redactPlayerContent
} from "./visibilityService.js";
import { extractWikiLinks, renderWikiMarkdown } from "./markdownService.js";
import {
  archiveEntryByPath,
  findRawEntryByPath,
  isMongoEntriesEnabled,
  listEntries,
  publicEntry,
  saveEntryByPath
} from "../repositories/entriesRepository.js";

const GM_ROLES = new Set(["owner", "gm"]);
const GM_HEADING = /^#{2,6}\s*(?:GM\s+Secrets?|GM\s+Notes?|Секреты\s+GM|Секреты\s+мастера|Заметки\s+мастера)\s*$/imu;
const SECRET_BLOCK = /\[secret\]([\s\S]*?)\[\/secret\]/gimu;

function isGm(role = "") {
  return GM_ROLES.has(String(role || "").toLowerCase());
}

function playerVisibleObjects(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => ["public", "revealed"].includes(String(item?.visibility || "public")) && item?.type !== "secret");
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (!value) return [];
  return String(value).split(/[;,\n]/).map((item) => item.trim()).filter(Boolean);
}

function normalizePath(value = "") {
  const normalized = String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .trim();
  if (!normalized || normalized.split("/").includes("..")) {
    const error = new Error("A safe campaign entry path is required.");
    error.status = 400;
    throw error;
  }
  return normalized.endsWith(".md") ? normalized : `${normalized}.md`;
}

function uiVisibility(entry = {}) {
  if (entry.status === "draft") return "draft";
  if (["gmOnly", "hidden", "needsReview"].includes(entry.visibility)) return "gm";
  return entry.visibility || "public";
}

function storageVisibility(value = "public") {
  const normalized = String(value || "public").toLowerCase();
  if (["gm", "gm-only", "gmonly", "private", "secret", "hidden"].includes(normalized)) return "gmOnly";
  if (normalized === "revealed") return "revealed";
  return "public";
}

function safeFrontmatter(frontmatter = {}) {
  const {
    gmSecrets: _gmSecrets,
    gmNotes: _gmNotes,
    secret: _secret,
    secrets: _secrets,
    ...safe
  } = frontmatter || {};
  return safe;
}

function splitContent(content = "", explicitGmContent = "") {
  const raw = String(content || "");
  const heading = GM_HEADING.exec(raw);
  GM_HEADING.lastIndex = 0;
  const headingGm = heading ? raw.slice(heading.index + heading[0].length).trim() : "";
  const blockGm = [...raw.matchAll(SECRET_BLOCK)].map((match) => match[1].trim()).filter(Boolean).join("\n\n");
  return {
    publicContent: redactPlayerContent(raw),
    gmContent: [explicitGmContent, headingGm, blockGm].map((item) => String(item || "").trim()).filter(Boolean).join("\n\n")
  };
}

function frontmatterFromEntry(entry = {}) {
  const stored = safeFrontmatter(entry.metadata?.frontmatter || {});
  const metadata = entry.metadata || {};
  return {
    ...stored,
    title: entry.title,
    name: entry.title,
    type: entry.type || "lore",
    category: entry.category || "lore",
    summary: entry.summary || "",
    visibility: uiVisibility(entry),
    tags: entry.tags || [],
    related: normalizeArray(stored.related || metadata.related),
    world: stored.world || metadata.world || undefined,
    country: stored.country || metadata.country || undefined,
    city: stored.city || metadata.city || undefined,
    parent: stored.parent || metadata.parent || undefined,
    mapImage: stored.mapImage || metadata.mapImage || undefined,
    avatarImage: stored.avatarImage || metadata.avatarImage || undefined,
    tokenImage: stored.tokenImage || metadata.tokenImage || undefined,
    handoutImage: stored.handoutImage || metadata.handoutImage || undefined,
    image: stored.image || metadata.image || undefined,
    pins: Array.isArray(stored.pins || metadata.pins) ? (stored.pins || metadata.pins) : [],
    mapObjects: Array.isArray(stored.mapObjects || metadata.mapObjects) ? (stored.mapObjects || metadata.mapObjects) : []
  };
}

export function entryToCampaignPage(entry = {}, role = "player") {
  const frontmatter = frontmatterFromEntry(entry);
  if (!isGm(role)) {
    frontmatter.pins = playerVisibleObjects(frontmatter.pins);
    frontmatter.mapObjects = playerVisibleObjects(frontmatter.mapObjects);
  }
  const publicContent = String(entry.publicContent || "").trim();
  const gmContent = isGm(role) ? String(entry.gmContent || "").trim() : "";
  const content = [publicContent, gmContent ? `## GM Secrets\n${gmContent}` : ""].filter(Boolean).join("\n\n");
  const path = entry.path || `${entry.category || entry.type || "lore"}/${entry.slug || slugify(entry.title || "untitled")}.md`;
  const page = {
    id: entry.id || String(entry._id || ""),
    entryId: entry.id || String(entry._id || ""),
    campaignId: entry.campaignId || "",
    path,
    title: entry.title || "Untitled",
    category: entry.category || "lore",
    type: entry.type || "lore",
    world: frontmatter.world,
    country: frontmatter.country,
    city: frontmatter.city,
    parent: frontmatter.parent,
    mapImage: frontmatter.mapImage,
    avatarImage: frontmatter.avatarImage,
    tokenImage: frontmatter.tokenImage,
    handoutImage: frontmatter.handoutImage,
    image: frontmatter.image,
    pins: frontmatter.pins,
    mapObjects: frontmatter.mapObjects,
    summary: entry.summary || "",
    tags: entry.tags || [],
    visibility: uiVisibility(entry),
    frontmatter,
    content,
    html: renderWikiMarkdown(content),
    links: extractWikiLinks(content),
    modifiedAt: entry.updatedAt || entry.createdAt || ""
  };
  return { ...page, playerSafety: analyzePlayerSafety(page) };
}

function compactPage(page = {}) {
  return { title: page.title, path: page.path, category: page.category, type: page.type, summary: page.summary };
}

function linkedPage(target, pages) {
  const key = slugify(String(target || ""));
  return pages.find((page) => [page.title, page.path, page.path?.replace(/\.md$/i, "")].some((value) => slugify(value || "") === key));
}

function withRelations(page, pages) {
  const backlinks = pages
    .filter((candidate) => candidate.path !== page.path)
    .filter((candidate) => candidate.links?.some((link) => linkedPage(link.target, [page]))
      || normalizeArray(candidate.frontmatter?.related).some((item) => linkedPage(item, [page])))
    .map(compactPage);
  const relatedPages = normalizeArray(page.frontmatter?.related).map((item) => linkedPage(item, pages)).filter(Boolean).map(compactPage);
  const children = pages
    .filter((candidate) => candidate.path !== page.path)
    .filter((candidate) => candidate.parent === page.title
      || (page.type === "world" && candidate.world === page.title)
      || (page.type === "country" && candidate.country === page.title)
      || (page.type === "city" && candidate.city === page.title))
    .map(compactPage);
  const missingLinks = (page.links || [])
    .filter((link) => !linkedPage(link.target, pages))
    .map((link) => ({ title: link.target, label: link.label, slug: slugify(link.target) }));
  return { ...page, backlinks, relatedPages, children, missingLinks };
}

export async function listCampaignPages({ campaignId, role = "player" } = {}) {
  const entries = await listEntries({ campaignId, role, limit: 500 });
  const pages = entries.map((entry) => entryToCampaignPage(entry, role));
  return pages.map((page) => withRelations(page, pages)).sort((a, b) => a.title.localeCompare(b.title));
}

export async function findCampaignPage({ campaignId, path, role = "player" } = {}) {
  const pages = await listCampaignPages({ campaignId, role });
  const normalized = String(path || "").replace(/\\/g, "/");
  return pages.find((page) => page.path === normalized)
    || linkedPage(normalized, pages)
    || null;
}

export async function campaignCategories(context) {
  const pages = await listCampaignPages(context);
  const grouped = new Map();
  for (const page of pages) {
    const category = page.category || "uncategorized";
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(page);
  }
  return [...grouped.entries()].map(([category, items]) => ({ category, count: items.length, pages: items }));
}

export async function campaignMissingLinks(context) {
  const pages = await listCampaignPages(context);
  const missing = new Map();
  for (const page of pages) {
    for (const link of page.missingLinks || []) {
      const entry = missing.get(link.slug) || { title: link.title, slug: link.slug, count: 0, sources: [] };
      entry.count += 1;
      if (!entry.sources.some((source) => source.path === page.path)) entry.sources.push(compactPage(page));
      missing.set(link.slug, entry);
    }
  }
  return [...missing.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
}

export async function searchCampaignPages(query = "", context = {}) {
  const pages = await listCampaignPages(context);
  if (!String(query || "").trim()) return pages.slice(0, 20);
  const search = new MiniSearch({
    fields: ["title", "summary", "tags", "category", "content"],
    storeFields: ["page"],
    searchOptions: { boost: { title: 4, tags: 2 }, fuzzy: 0.2, prefix: true }
  });
  search.addAll(pages.map((page) => ({
    id: page.path,
    title: page.title,
    summary: page.summary,
    tags: (page.tags || []).join(" "),
    category: page.category,
    content: page.content,
    page
  })));
  return search.search(query).map((result) => result.page);
}

function documentFromPageInput({ requestedPath, frontmatter = {}, content = "", existing = null } = {}) {
  const safeFrontmatterValue = safeFrontmatter(frontmatter);
  const title = String(frontmatter.title || frontmatter.name || existing?.title || "Untitled").trim().slice(0, 240);
  const type = String(frontmatter.type || existing?.type || "lore");
  const category = String(frontmatter.category || existing?.category || type || "lore");
  const requestedVisibility = frontmatter.visibility || existing?.visibility || "public";
  const split = splitContent(content, frontmatter.gmSecrets || "");
  return {
    path: normalizePath(requestedPath || `${category}/${slugify(title)}.md`),
    title,
    slug: slugify(title),
    type,
    category,
    summary: String(frontmatter.summary || existing?.summary || "").trim().slice(0, 1200),
    publicContent: split.publicContent,
    gmContent: split.gmContent,
    status: String(requestedVisibility).toLowerCase() === "draft" ? "draft" : "active",
    visibility: storageVisibility(requestedVisibility),
    tags: normalizeArray(frontmatter.tags),
    aliases: normalizeArray(frontmatter.aliases),
    metadata: {
      frontmatter: safeFrontmatterValue,
      related: normalizeArray(frontmatter.related),
      world: frontmatter.world || "",
      country: frontmatter.country || "",
      city: frontmatter.city || "",
      parent: frontmatter.parent || "",
      mapImage: frontmatter.mapImage || "",
      avatarImage: frontmatter.avatarImage || "",
      tokenImage: frontmatter.tokenImage || "",
      handoutImage: frontmatter.handoutImage || "",
      image: frontmatter.image || "",
      pins: Array.isArray(frontmatter.pins) ? frontmatter.pins : [],
      mapObjects: Array.isArray(frontmatter.mapObjects) ? frontmatter.mapObjects : []
    },
    source: existing?.source || { kind: "partyCodex" }
  };
}

export async function saveCampaignPage({ campaignId, userId, requestedPath, frontmatter, content, createOnly = false } = {}) {
  const existing = await findRawEntryByPath({ campaignId, path: requestedPath });
  const document = documentFromPageInput({ requestedPath, frontmatter, content, existing });
  const result = await saveEntryByPath({ campaignId, requestedPath: document.path, document, userId, createOnly });
  return entryToCampaignPage(publicEntry(result.entry), "gm");
}

export async function createCampaignPage({ campaignId, userId, payload = {} } = {}) {
  const type = payload.type || "lore";
  const category = payload.category || type;
  const title = String(payload.title || payload.name || "Untitled").trim();
  const requestedPath = normalizePath(payload.path || `${category}/${slugify(title)}.md`);
  const publicContent = [payload.summary || "", payload.publicNotes || ""].filter(Boolean).join("\n\n");
  return saveCampaignPage({
    campaignId,
    userId,
    requestedPath,
    createOnly: true,
    frontmatter: {
      ...payload,
      title,
      name: title,
      type,
      category,
      visibility: payload.visibility || "public",
      tags: normalizeArray(payload.tags),
      related: normalizeArray(payload.related),
      gmSecrets: payload.gmSecrets || ""
    },
    content: publicContent
  });
}

export async function readCampaignRawPage({ campaignId, path, role = "gm" } = {}) {
  const page = await findCampaignPage({ campaignId, path, role });
  if (!page) return null;
  const raw = stringifyMarkdown(page.frontmatter, page.content);
  return { page: compactPage(page), raw, frontmatter: page.frontmatter, content: page.content };
}

export async function saveCampaignRawPage({ campaignId, userId, requestedPath, raw } = {}) {
  const { frontmatter, content } = parseMarkdown(String(raw || ""));
  return saveCampaignPage({ campaignId, userId, requestedPath, frontmatter, content });
}

export async function deleteCampaignPage({ campaignId, userId, path } = {}) {
  return archiveEntryByPath({ campaignId, userId, path });
}

export async function commitCampaignMarkdownImports({ campaignId, userId, items = [], conflictMode = "skip" } = {}) {
  const written = [];
  const skipped = [];
  for (const item of items) {
    let targetPath = normalizePath(item.targetPath);
    const existing = await findRawEntryByPath({ campaignId, path: targetPath });
    if (existing && conflictMode === "skip") {
      skipped.push({ ...item, reason: "Conflict: entry already exists" });
      continue;
    }
    if (existing && conflictMode === "copy") {
      const base = targetPath.replace(/\.md$/i, "");
      let copy = 2;
      while (await findRawEntryByPath({ campaignId, path: `${base}-${copy}.md` })) copy += 1;
      targetPath = `${base}-${copy}.md`;
    }
    const page = await saveCampaignPage({
      campaignId,
      userId,
      requestedPath: targetPath,
      frontmatter: {
        ...(item.frontmatter || {}),
        title: item.title,
        name: item.title,
        type: item.type,
        category: item.category,
        summary: item.summary,
        visibility: item.frontmatter?.visibility || "public"
      },
      content: item.content || "",
      createOnly: false
    });
    written.push({ ...item, targetPath, page });
  }
  return { written, skipped };
}

export async function campaignMetadata(context) {
  const pages = await listCampaignPages(context);
  const compact = pages.map((page) => ({
    title: page.title,
    path: page.path,
    type: page.type,
    category: page.category,
    world: page.world,
    country: page.country,
    city: page.city,
    tags: page.tags,
    summary: page.summary,
    visibility: page.visibility
  }));
  return {
    pages: compact,
    tags: [...new Set(pages.flatMap((page) => page.tags || []))].sort((a, b) => a.localeCompare(b)),
    worlds: compact.filter((page) => page.type === "world" || page.category === "worlds"),
    countries: compact.filter((page) => page.type === "country" || page.category === "countries"),
    cities: compact.filter((page) => page.type === "city" || page.category === "cities"),
    locations: compact.filter((page) => page.category === "locations"),
    npcs: compact.filter((page) => page.category === "npcs"),
    enemies: compact.filter((page) => page.category === "enemies"),
    quests: compact.filter((page) => page.category === "quests")
  };
}

export async function campaignPlayerSafetyReview(context) {
  const pages = await listCampaignPages({ ...context, role: "gm" });
  const reviewPages = pages.map((page) => ({
    title: page.title,
    path: page.path,
    category: page.category,
    type: page.type,
    world: page.world,
    summary: page.summary,
    visibility: page.visibility,
    modifiedAt: page.modifiedAt,
    playerVisible: !["gm", "draft"].includes(page.visibility),
    playerContentPreview: redactPlayerContent(page.content).slice(0, 420),
    playerSummary: page.summary,
    tags: page.tags || [],
    safety: analyzePlayerSafety(page)
  }));
  const totals = reviewPages.reduce((acc, item) => {
    acc.total += 1;
    acc[item.safety.status] = (acc[item.safety.status] || 0) + 1;
    if (item.playerVisible) acc.playerVisible += 1;
    if (item.safety.containsSecrets) acc.containsSecrets += 1;
    if (item.safety.reviewNeeded) acc.reviewNeeded += 1;
    return acc;
  }, { total: 0, playerVisible: 0, containsSecrets: 0, reviewNeeded: 0 });
  return { totals, pages: reviewPages };
}

export { isMongoEntriesEnabled as isMongoCampaignContentEnabled };
