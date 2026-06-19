const GM_HEADING = /^##\s+GM Secrets\s*$/gim;
const NEXT_HEADING = /^##\s+/gm;

export function isPublic(frontmatter = {}) {
  const visibility = String(frontmatter.visibility || "public").toLowerCase();
  return visibility === "public";
}

export function redactPlayerContent(content = "") {
  let redacted = content.replace(/:::gm[\s\S]*?:::/gim, "");
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

export function filterByMode(page, mode = "gm") {
  if (mode !== "player") return page;
  if (!isPublic(page.frontmatter)) return null;
  const content = redactPlayerContent(page.content);
  return {
    ...page,
    content,
    html: renderWikiMarkdown(content),
    links: page.links,
    frontmatter: { ...page.frontmatter, gmNotes: undefined }
  };
}
import { renderWikiMarkdown } from "./markdownService.js";
