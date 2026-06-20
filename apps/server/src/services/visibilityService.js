import { renderWikiMarkdown } from "./markdownService.js";

const GM_HEADING = /^##\s+GM Secrets\s*$/gim;
const NEXT_HEADING = /^##\s+/gm;
const SECRET_BLOCK = /\[secret\]([\s\S]*?)\[\/secret\]/gim;

export function isPublic(frontmatter = {}) {
  const visibility = String(frontmatter.visibility || "public").toLowerCase();
  return visibility === "public";
}

export function redactPlayerContent(content = "") {
  let redacted = String(content || "").replace(/:::gm[\s\S]*?:::/gim, "").replace(SECRET_BLOCK, "");
  let match;
  while ((match = GM_HEADING.exec(redacted)) !== null) {
    const start = match.index;
    NEXT_HEADING.lastIndex = start + match[0].length;
    const next = NEXT_HEADING.exec(redacted);
    const end = next ? next.index : redacted.length;
    redacted = redacted.slice(0, start).trimEnd() + "\n\n" + redacted.slice(end).trimStart();
    GM_HEADING.lastIndex = 0;
  }
  return redacted.trim() + "\n";
}

function onlyPlayerVisibleObjects(items = []) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => String(item.visibility || "public").toLowerCase() === "public" && item.type !== "secret");
}

export function filterByMode(page, mode = "gm") {
  if (mode !== "player") return page;
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
    frontmatter: {
      ...page.frontmatter,
      gmNotes: undefined,
      gmSecrets: undefined,
      pins,
      mapObjects
    }
  };
}
