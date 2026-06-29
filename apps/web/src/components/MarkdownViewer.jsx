import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

function renderWikiLinks(text) {
  return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => `[${label || target}](/page/${encodeURIComponent(target)})`);
}

function pageMatchesTarget(page, target) {
  const normalize = (value = "") => value.toLowerCase().replace(/\.md$/i, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  return normalize(page.title) === normalize(target) || normalize(page.path) === normalize(target);
}

export default function MarkdownViewer({ content, pages = [], canEdit = false }) {
  return (
    <article className="markdown-view">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ href, children }) => {
            if (!href?.startsWith("/page/")) return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
            const target = decodeURIComponent(href.replace("/page/", ""));
            const exists = pages.some((page) => pageMatchesTarget(page, target));
            if (exists) return <Link to={href}>{children}</Link>;
            if (canEdit) return <Link className="phantom-link" to={`/missing?target=${encodeURIComponent(target)}`}>{children}</Link>;
            return <span className="phantom-link is-disabled">{children}</span>;
          }
        }}
      >
        {renderWikiLinks(content || "")}
      </ReactMarkdown>
    </article>
  );
}