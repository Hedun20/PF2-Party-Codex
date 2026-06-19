import { Link } from "react-router-dom";
import HoverPreviewCard from "./HoverPreviewCard.jsx";
import { labelCategory } from "../utils/labels.js";

export default function EntityCard({ page, mode }) {
  return (
    <Link className="entity-card" to={`/page/${encodeURIComponent(page.path)}`}>
      <div>
        <span className="kicker">{labelCategory(page.category)}</span>
        <h3>{page.title}</h3>
        <p>{page.summary || "Описание пока не заполнено."}</p>
      </div>
      <div className="tag-row">{page.tags?.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
      <HoverPreviewCard page={page} mode={mode} />
    </Link>
  );
}
