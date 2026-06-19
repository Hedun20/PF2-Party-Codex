import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

function renderWikiLinks(text) {
  return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => `[${label || target}](/page/${encodeURIComponent(target)})`);
}

export default function MarkdownViewer({ content }) {
  return (
    <article className="markdown-view">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ href, children }) => href?.startsWith("/page/")
            ? <Link to={href}>{children}</Link>
            : <a href={href} target="_blank" rel="noreferrer">{children}</a>
        }}
      >
        {renderWikiLinks(content || "")}
      </ReactMarkdown>
    </article>
  );
}
