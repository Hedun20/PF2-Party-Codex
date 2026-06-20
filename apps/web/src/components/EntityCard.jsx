import HoverPreviewCard from "./HoverPreviewCard.jsx";
import CodexCard from "./ui/CodexCard.jsx";
import { labelCategory } from "../utils/labels.js";

export default function EntityCard({ page, mode }) {
  return (
    <CodexCard className="entity-card" to={`/page/${encodeURIComponent(page.path)}`} tone={page.type || page.category || "article"}>
      <div className="codex-card__body">
        <span className="codex-card__eyebrow">{labelCategory(page.category)}</span>
        <h3 className="codex-card__title">{page.title}</h3>
        <p className="codex-card__summary">{page.summary || "Описание пока не заполнено."}</p>
      </div>
      <div className="codex-card__meta tag-row">
        {page.tags?.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
        {!page.tags?.length && <span>draft</span>}
      </div>
      <HoverPreviewCard page={page} mode={mode} />
    </CodexCard>
  );
}
