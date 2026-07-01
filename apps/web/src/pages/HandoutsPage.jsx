import { Link } from "react-router-dom";
import { BookOpen, ImageIcon, Sparkles } from "lucide-react";
import { labelCategory } from "../utils/labels.js";

function compactText(text = "", limit = 150) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "No public summary yet.";
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function imageFor(page) {
  return page?.handoutImage || page?.avatarImage || page?.mapImage || page?.image || page?.tokenImage || page?.frontmatter?.handoutImage || page?.frontmatter?.avatarImage || "";
}

export default function HandoutsPage({ pages = [], mode = "player" }) {
  const items = pages
    .filter((page) => mode === "gm" || page.visibility === "public")
    .filter((page) => page.handoutImage || page.frontmatter?.handoutImage || page.visibility === "public")
    .slice(0, 60);

  return (
    <div className="page-stack handouts-page">
      <section className="hero-panel">
        <span className="kicker">Handouts</span>
        <h1>Shared campaign materials</h1>
        <p>Persistent player-facing materials: public lore, images, maps and revealed context. Live reveal can stay as a helper, but handouts are the archive players return to.</p>
      </section>

      {items.length ? (
        <section className="handout-grid">
          {items.map((page) => {
            const image = imageFor(page);
            return (
              <article key={page.path} className="codex-card handout-card">
                {image ? <img src={image.startsWith("/api/") ? image : `/api/assets/${String(image).replace(/^images\//, "")}`} alt="" /> : <div className="handout-card-placeholder"><ImageIcon size={26} /></div>}
                <div className="handout-card-body">
                  <span className="kicker">{labelCategory(page.category)}</span>
                  <h2>{page.title}</h2>
                  <p>{compactText(page.summary || page.frontmatter?.summary)}</p>
                  <Link to={`/page/${encodeURIComponent(page.path)}`}><BookOpen size={15} /> Open</Link>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="codex-card workspace-status-card">
          <Sparkles size={24} />
          <h2>No handouts yet</h2>
          <p>Public pages and future Mongo handouts will appear here after the GM releases material to the party.</p>
        </section>
      )}
    </div>
  );
}
