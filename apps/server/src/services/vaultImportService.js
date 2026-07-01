import crypto from "crypto";
import { slugify } from "../utils/slugify.js";
import { extractWikiLinks } from "./markdownService.js";
import { analyzePlayerSafety, redactPlayerContent } from "./visibilityService.js";
import { listPages } from "./vaultService.js";
import {
  createImportJob,
  idString,
  publicEntry,
  publicRelation,
  replaceRelationsForImport,
  rollbackImportJob,
  upsertEntryFromImport,
  updateImportJob
} from "../repositories/entriesRepository.js";

const KNOWN_TYPES = new Set([
  "world", "country", "city", "location", "npc", "enemy", "faction", "quest", "item", "lore", "deity", "organization", "map", "timeline", "session", "handout", "pc", "character"
]);

const CATEGORY_TYPE_MAP = {
  worlds: "world",
  countries: "country",
  cities: "city",
  locations: "location",
  npcs: "npc",
  enemies: "enemy",
  quests: "quest",
  maps: "map",
  timeline: "timeline",
  sessions: "session",
  handouts: "handout",
  characters: "npc",
  "lore/factions": "faction",
  "lore/gods": "deity",
  "lore/cults": "organization",
  "lore/history": "lore",
  "lore/planes": "lore",
  "lore/artifacts": "item"
};

const SECRET_BLOCK_RE = /\[secret\]([\s\S]*?)\[\/secret\]/gim;
const COLON_BLOCK_RE = /:::(?:gm|secret|spoiler)\s*\n?([\s\S]*?):::/gim;
const HTML_BLOCK_RE = /<!--\s*(?:gm|secret|spoiler)\s*-->([\s\S]*?)<!--\s*\/(?:gm|secret|spoiler)\s*-->/gim;
const GM_SECTION_HEADING_RE = /^#{2,6}\s*(?:GM\s+Secrets?|GM\s+Notes?|Secrets?\s+GM|Секреты\s+GM|GM\s+секреты|Секреты\s+мастера|Заметки\s+мастера|Правда\s+мастера|Спойлеры?)\s*$/gimu;
const ANY_HEADING_RE = /^#{1,6}\s+/gm;

function now() {
  return new Date().toISOString();
}

function sha256(value = "") {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function normalizeVisibility(value = "") {
  const raw = String(value || "public").trim().toLowerCase();
  if (["gm", "gm-only", "private", "secret"].includes(raw)) return "gmOnly";
  if (["draft", "hidden"].includes(raw)) return "hidden";
  if (["review", "review-needed", "needsreview", "needs-review"].includes(raw)) return "needsReview";
  if (["revealed", "open"].includes(raw)) return "revealed";
  return "public";
}

function inferType(page) {
  const rawType = String(page.frontmatter?.type || page.type || "").trim().toLowerCase();
  if (KNOWN_TYPES.has(rawType)) {
    if (rawType === "pc" || rawType === "character") return "npc";
    if (rawType === "timeline") return "lore";
    return rawType;
  }
  const category = String(page.category || page.frontmatter?.category || "").trim().toLowerCase();
  if (CATEGORY_TYPE_MAP[category]) return CATEGORY_TYPE_MAP[category];
  const firstPath = String(page.path || "").split("/")[0]?.toLowerCase();
  return CATEGORY_TYPE_MAP[firstPath] || "lore";
}

function extractSecretSections(content = "") {
  const gmParts = [];
  for (const regex of [SECRET_BLOCK_RE, COLON_BLOCK_RE, HTML_BLOCK_RE]) {
    regex.lastIndex = 0;
    for (const match of String(content || "").matchAll(regex)) {
      if (match[1]?.trim()) gmParts.push(match[1].trim());
    }
  }

  const raw = String(content || "");
  let match;
  GM_SECTION_HEADING_RE.lastIndex = 0;
  while ((match = GM_SECTION_HEADING_RE.exec(raw)) !== null) {
    const start = match.index;
    ANY_HEADING_RE.lastIndex = start + match[0].length;
    const next = ANY_HEADING_RE.exec(raw);
    const end = next ? next.index : raw.length;
    const section = raw.slice(start, end).trim();
    if (section) gmParts.push(section);
    GM_SECTION_HEADING_RE.lastIndex = match.index + match[0].length;
  }

  return [...new Set(gmParts)].join("\n\n---\n\n");
}

function titleKey(value = "") {
  return slugify(String(value || "").replace(/\.md$/i, ""));
}

function pageKeySet(page) {
  return new Set([
    titleKey(page.title),
    titleKey(page.path),
    titleKey(String(page.path || "").replace(/\.md$/i, "")),
    titleKey(page.frontmatter?.slug),
    ...normalizeArray(page.frontmatter?.aliases).map(titleKey)
  ].filter(Boolean));
}

function buildPageLookup(pages) {
  const lookup = new Map();
  for (const page of pages) {
    for (const key of pageKeySet(page)) {
      if (key && !lookup.has(key)) lookup.set(key, page);
    }
  }
  return lookup;
}

function findTargetPage(lookup, value = "") {
  return lookup.get(titleKey(value)) || null;
}

function relationTypeFromField(field) {
  if (field === "world") return "locatedIn";
  if (field === "country") return "locatedIn";
  if (field === "city") return "locatedIn";
  if (field === "parent") return "parent";
  if (field === "related") return "related";
  return "related";
}

function mapPageToEntry({ page, campaignId, createdBy = null, importJobId = "dry-run" }) {
  const safety = page.playerSafety || analyzePlayerSafety(page);
  const publicContent = redactPlayerContent(page.content || "");
  const gmContent = extractSecretSections(page.content || "");
  const visibility = normalizeVisibility(page.visibility || page.frontmatter?.visibility);
  const status = safety.reviewNeeded && visibility === "public" ? "needsReview" : "active";
  const type = inferType(page);
  return {
    campaignId,
    worldId: null,
    type,
    category: page.category || page.frontmatter?.category || type,
    title: page.title || "Untitled",
    slug: slugify(page.title || page.path || "untitled"),
    path: page.path,
    summary: page.summary || "",
    publicContent,
    gmContent,
    status,
    visibility,
    tags: normalizeArray(page.tags || page.frontmatter?.tags),
    aliases: normalizeArray(page.frontmatter?.aliases),
    metadata: {
      sourceCategory: page.category || "",
      originalType: page.type || page.frontmatter?.type || "",
      world: page.world || page.frontmatter?.world || "",
      country: page.country || page.frontmatter?.country || "",
      city: page.city || page.frontmatter?.city || "",
      parent: page.parent || page.frontmatter?.parent || "",
      mapImage: page.mapImage || page.frontmatter?.mapImage || "",
      image: page.image || page.frontmatter?.image || "",
      avatarImage: page.avatarImage || page.frontmatter?.avatarImage || "",
      tokenImage: page.tokenImage || page.frontmatter?.tokenImage || "",
      pins: Array.isArray(page.pins) ? page.pins : [],
      mapObjects: Array.isArray(page.mapObjects) ? page.mapObjects : [],
      playerSafety: safety
    },
    source: {
      kind: "vaultImport",
      originalPath: page.path,
      originalHash: sha256(`${page.path}\n${page.content || ""}\n${JSON.stringify(page.frontmatter || {})}`),
      importJobId
    },
    createdBy,
    updatedBy: createdBy
  };
}

function buildRelationCandidates({ pages, entriesByPath, campaignId, importJobId }) {
  const lookup = buildPageLookup(pages);
  const warnings = [];
  const candidates = [];

  for (const page of pages) {
    const sourceEntry = entriesByPath.get(page.path);
    if (!sourceEntry) continue;
    const addRelation = ({ targetValue, type = "related", label = "", field = "" }) => {
      if (!targetValue) return;
      const targetPage = findTargetPage(lookup, targetValue);
      if (!targetPage) {
        warnings.push({ code: "missingRelation", severity: "warning", path: page.path, message: `Cannot resolve ${field || type}: ${targetValue}` });
        return;
      }
      const targetEntry = entriesByPath.get(targetPage.path);
      if (!targetEntry || idString(targetEntry._id) === idString(sourceEntry._id)) return;
      candidates.push({
        campaignId,
        sourceEntryId: idString(sourceEntry._id),
        targetEntryId: idString(targetEntry._id),
        type,
        visibility: normalizeVisibility(page.visibility || page.frontmatter?.visibility),
        label: label || String(targetValue),
        sourcePath: page.path,
        targetPath: targetPage.path,
        source: { kind: "vaultImport", importJobId }
      });
    };

    for (const link of extractWikiLinks(page.content || "")) {
      addRelation({ targetValue: link.target, type: "related", label: link.label, field: "wikiLink" });
    }
    for (const field of ["world", "country", "city", "parent"]) {
      addRelation({ targetValue: page[field] || page.frontmatter?.[field], type: relationTypeFromField(field), field });
    }
    for (const related of normalizeArray(page.frontmatter?.related)) {
      addRelation({ targetValue: related, type: "related", field: "related" });
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const relation of candidates) {
    const key = [relation.sourceEntryId, relation.targetEntryId, relation.type].join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(relation);
  }

  return { relations: deduped, warnings };
}

function summarizePages(pages) {
  const byType = {};
  const byVisibility = {};
  let secretCount = 0;
  let needsReview = 0;
  let mapLike = 0;
  for (const page of pages) {
    const type = inferType(page);
    const visibility = normalizeVisibility(page.visibility || page.frontmatter?.visibility);
    byType[type] = (byType[type] || 0) + 1;
    byVisibility[visibility] = (byVisibility[visibility] || 0) + 1;
    const safety = page.playerSafety || analyzePlayerSafety(page);
    if (safety.containsSecrets) secretCount += 1;
    if (safety.reviewNeeded) needsReview += 1;
    if (type === "map" || page.mapImage || page.frontmatter?.mapImage || page.pins?.length || page.mapObjects?.length) mapLike += 1;
  }
  return { entries: pages.length, byType, byVisibility, pagesWithSecrets: secretCount, needsReview, mapLike };
}

export async function dryRunVaultImport({ campaignId, createdBy = null } = {}) {
  const pages = listPages("gm");
  const lookup = buildPageLookup(pages);
  const warnings = [];
  for (const page of pages) {
    const safety = page.playerSafety || analyzePlayerSafety(page);
    if (safety.reviewNeeded) warnings.push({ code: "needsReview", severity: "info", path: page.path, message: `Needs review: ${safety.warnings?.join(" ") || "player safety review"}` });
    for (const link of extractWikiLinks(page.content || "")) {
      if (!findTargetPage(lookup, link.target)) warnings.push({ code: "missingWikiLink", severity: "warning", path: page.path, message: `Missing wiki link: ${link.target}` });
    }
    if (page.playerSafety?.suspicious) warnings.push({ code: "suspiciousPublicText", severity: "warning", path: page.path, message: "Potential spoiler words detected; review public content." });
  }
  const job = {
    campaignId,
    type: "vaultImport",
    status: "dryRun",
    summary: summarizePages(pages),
    warnings,
    createdBy,
    completedAt: now()
  };
  return job;
}

export async function commitVaultImport({ campaignId, createdBy = null } = {}) {
  const dryRun = await dryRunVaultImport({ campaignId, createdBy });
  const job = await createImportJob({ ...dryRun, status: "committing", completedAt: "" });
  const importJobId = idString(job._id);
  const pages = listPages("gm");
  const entriesByPath = new Map();
  let inserted = 0;
  let updated = 0;

  for (const page of pages) {
    const importEntry = mapPageToEntry({ page, campaignId, createdBy, importJobId });
    const result = await upsertEntryFromImport(importEntry);
    if (result.inserted) inserted += 1;
    else updated += 1;
    entriesByPath.set(page.path, result.entry);
  }

  const relationBuild = buildRelationCandidates({ pages, entriesByPath, campaignId, importJobId });
  const relationResult = await replaceRelationsForImport({ campaignId, importJobId, relations: relationBuild.relations });
  const warnings = [...dryRun.warnings, ...relationBuild.warnings];
  const committed = await updateImportJob(importJobId, {
    status: "committed",
    summary: {
      ...dryRun.summary,
      inserted,
      updated,
      relations: relationResult.inserted
    },
    warnings,
    completedAt: now()
  });

  return {
    importJob: committed,
    summary: committed.summary,
    warnings,
    entries: [...entriesByPath.values()].map(publicEntry),
    relations: relationBuild.relations.map(publicRelation)
  };
}

export async function rollbackVaultImport(importJobId) {
  return rollbackImportJob(importJobId);
}
