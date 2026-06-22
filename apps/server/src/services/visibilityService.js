import { renderWikiMarkdown } from "./markdownService.js";

const SECRET_BLOCK = /\[secret\]([\s\S]*?)\[\/secret\]/gim;
const COLON_SECRET_BLOCK = /:::(?:gm|secret|spoiler)[\s\S]*?:::/gim;
const HTML_SECRET_BLOCK = /<!--\s*(?:gm|secret|spoiler)\s*-->[\s\S]*?<!--\s*\/(?:gm|secret|spoiler)\s*-->/gim;
const GM_HEADING_RE = /^#{2,6}\s*(?:GM\s+Secrets?|GM\s+Notes?|Secrets?\s+GM|Секреты\s+GM|GM\s+секреты|Секреты\s+мастера|Заметки\s+мастера|Правда\s+мастера|Спойлеры?)\s*$/gimu;
const ANY_HEADING_RE = /^#{1,6}\s+/gm;
const SUSPICIOUS_RE = /(секрет|тайн|спойлер|не\s+говорить|не\s+показывать|только\s+gm|только\s+мастер|gm\s+only|master\s+only|предател|истинн\w*\s+личност|финальн\w*\s+босс|заговор|лич|вампир|культист)/iu;

const PLAYER_VISIBILITY = new Set(["public", "player", "player-visible", "players", "visible"]);
const GM_VISIBILITY = new Set(["gm", "gm-only", "private", "secret", "draft", "review-needed", "review", "hidden"]);

function normalizeVisibility(frontmatter = {}) {
  return String(frontmatter.visibility || "public").trim().toLowerCase();
}

export function isPublic(frontmatter = {}) {
  const visibility = normalizeVisibility(frontmatter);
  if (GM_VISIBILITY.has(visibility)) return false;
  if (PLAYER_VISIBILITY.has(visibility)) return true;
  return visibility === "" || visibility === "public";
}

function removeHeadingSections(content = "") {
  let redacted = String(content || "");
  let match;
  GM_HEADING_RE.lastIndex = 0;
  while ((match = GM_HEADING_RE.exec(redacted)) !== null) {
    const start = match.index;
    ANY_HEADING_RE.lastIndex = start + match[0].length;
    const next = ANY_HEADING_RE.exec(redacted);
    const end = next ? next.index : redacted.length;
    redacted = `${redacted.slice(0, start).trimEnd()}\n\n${redacted.slice(end).trimStart()}`;
    GM_HEADING_RE.lastIndex = 0;
    ANY_HEADING_RE.lastIndex = 0;
  }
  return redacted;
}

export function redactPlayerContent(content = "") {
  const redacted = removeHeadingSections(
    String(content || "")
      .replace(COLON_SECRET_BLOCK, "")
      .replace(HTML_SECRET_BLOCK, "")
      .replace(SECRET_BLOCK, "")
  );
  return redacted.trim() ? `${redacted.trim()}\n` : "";
}

function countMatches(content = "", regex) {
  return [...String(content || "").matchAll(regex)].length;
}

function hasSecretHeading(content = "") {
  GM_HEADING_RE.lastIndex = 0;
  return GM_HEADING_RE.test(String(content || ""));
}

function hasSuspiciousText(content = "") {
  return SUSPICIOUS_RE.test(String(content || ""));
}

function objectVisibility(item = {}) {
  return String(item.visibility || "public").toLowerCase();
}

function isPlayerVisibleObject(item = {}) {
  const visibility = objectVisibility(item);
  return !GM_VISIBILITY.has(visibility) && item.type !== "secret";
}

function onlyPlayerVisibleObjects(items = []) {
  if (!Array.isArray(items)) return [];
  return items.filter(isPlayerVisibleObject);
}

export function analyzePlayerSafety(page = {}) {
  const frontmatter = page.frontmatter || {};
  const content = String(page.content || "");
  const visibility = normalizeVisibility(frontmatter);
  const secretBlockCount = countMatches(content, SECRET_BLOCK)
    + countMatches(content, COLON_SECRET_BLOCK)
    + countMatches(content, HTML_SECRET_BLOCK);
  const secretHeading = hasSecretHeading(content);
  const redacted = redactPlayerContent(content);
  const publicTextLength = redacted.replace(/[#>*_`\[\]()]/g, "").trim().length;
  const gmOnly = !isPublic(frontmatter);
  const mapObjects = Array.isArray(page.mapObjects) ? page.mapObjects : [];
  const pins = Array.isArray(page.pins) ? page.pins : [];
  const gmOnlyMapObjects = mapObjects.filter((item) => !isPlayerVisibleObject(item)).length;
  const gmOnlyPins = pins.filter((item) => !isPlayerVisibleObject(item)).length;
  const suspicious = hasSuspiciousText(content);
  const containsSecrets = secretBlockCount > 0 || secretHeading || gmOnlyMapObjects > 0 || gmOnlyPins > 0;
  const reviewNeeded = gmOnly || visibility === "review-needed" || publicTextLength === 0 || suspicious;

  let status = "safe";
  if (gmOnly) status = "gm-only";
  else if (visibility === "review-needed" || publicTextLength === 0) status = "review-needed";
  else if (containsSecrets || suspicious) status = "contains-secrets";

  const warnings = [];
  if (gmOnly) warnings.push("Статья не видна игрокам целиком по visibility.");
  if (secretBlockCount) warnings.push(`Найдено secret-блоков: ${secretBlockCount}.`);
  if (secretHeading) warnings.push("Есть раздел GM Secrets / секреты мастера.");
  if (gmOnlyMapObjects) warnings.push(`GM-only объектов карты: ${gmOnlyMapObjects}.`);
  if (gmOnlyPins) warnings.push(`GM-only пинов: ${gmOnlyPins}.`);
  if (suspicious) warnings.push("Найдены слова, похожие на мастерские спойлеры — стоит проверить вручную.");
  if (!publicTextLength) warnings.push("Нет player-safe публичного текста.");

  return {
    status,
    playerVisible: !gmOnly && visibility !== "review-needed",
    visibility,
    containsSecrets,
    hasSecretBlocks: secretBlockCount > 0,
    hasSecretHeading: secretHeading,
    suspicious,
    reviewNeeded,
    publicTextLength,
    redactedLength: redacted.length,
    secretBlockCount,
    gmOnlyMapObjects,
    gmOnlyPins,
    warnings
  };
}

function playerSafeRelated(page = {}, visiblePages = []) {
  if (!Array.isArray(page.frontmatter?.related)) return [];
  const visibleKeys = new Set(visiblePages.map((item) => [item.title, item.path].map((value) => String(value || "").toLowerCase())).flat());
  return page.frontmatter.related.filter((item) => visibleKeys.has(String(item || "").toLowerCase()));
}

export function filterByMode(page, mode = "gm") {
  const safety = analyzePlayerSafety(page);
  if (mode !== "player") return { ...page, playerSafety: safety };
  if (!isPublic(page.frontmatter)) return null;
  const content = redactPlayerContent(page.content);
  const mapObjects = onlyPlayerVisibleObjects(page.mapObjects);
  const pins = onlyPlayerVisibleObjects(page.pins);
  return {
    ...page,
    content,
    html: renderWikiMarkdown(content),
    links: page.links,
    pins,
    mapObjects,
    playerSafety: analyzePlayerSafety({ ...page, content, pins, mapObjects }),
    frontmatter: {
      ...page.frontmatter,
      gmNotes: undefined,
      gmSecrets: undefined,
      secret: undefined,
      secrets: undefined,
      pins,
      mapObjects
    }
  };
}
