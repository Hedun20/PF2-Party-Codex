import { Link } from "react-router-dom";
import HoverPreviewCard from "./HoverPreviewCard.jsx";

export default function EntityCard({ page, mode }) {
  return (
    <Link className="entity-card" to={`/page/${encodeURIComponent(page.path)}`}>
      <div>
        <span className="kicker">{page.category}</span>
        <h3>{page.title}</h3>
        <p>{page.summary || "No summary yet."}</p>
      </div>
      <div className="tag-row">{page.tags?.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
      <HoverPreviewCard page={page} mode={mode} />
    </Link>
  );
}
