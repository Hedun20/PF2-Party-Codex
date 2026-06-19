import sanitizeHtml from "sanitize-html";
import { marked } from "marked";

const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function extractWikiLinks(content = "") {
  return [...content.matchAll(WIKI_LINK_RE)].map((match) => ({
    target: match[1].trim(),
    label: (match[2] || match[1]).trim()
  }));
}

export function renderWikiMarkdown(content = "") {
  const linked = content.replace(WIKI_LINK_RE, (_, target, label) => {
    const text = label || target;
    return `[${text}](/page/${encodeURIComponent(target)})`;
  });
  return sanitizeHtml(marked.parse(linked), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "h3"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title"]
    }
  });
}
