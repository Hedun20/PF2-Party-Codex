import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BookOpen, ImageIcon, Sparkles } from "lucide-react";
import { api } from "../api/client.js";
import { labelCategory } from "../utils/labels.js";

function compactText(text = "", limit = 170) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "No summary yet.";
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function imageFor(page) {
  return page?.handoutImage || page?.avatarImage || page?.mapImage || page?.image || page?.tokenImage || page?.frontmatter?.handoutImage || page?.frontmatter?.avatarImage || "";
}

function isLegacyHandout(page, mode) {
  if (mode !== "gm" && page.visibility !== "public") return false;
  return Boolean(page.handoutImage || page.frontmatter?.handoutImage || page.visibility === "public");
}

function handoutSummary(handout = {}) {
  return compactText(handout.body || handout.summary || handout.description || "");
}

function MongoHandoutCard({ handout }) {
  return (
    <article className="codex-card handout-card">
      <div className="handout-card-placeholder"><ImageIcon size={26} /></div>
      <div className="handout-card-body">
        <span className="kicker">{handout.visibility || "handout"}</span>
        <h2>{handout.title || "Untitled handout"}</h2>
        <p>{handoutSummary(handout)}</p>
        {handout.releasedAt && <p>Released: {handout.releasedAt}</p>}
      </div>
    </article>
  );
}

function LegacyHandouts({ items }) {
  return (
    <>
      <section className="codex-card workspace-status-card">
        <AlertTriangle size={22} />
        <span className="kicker">Compatibility fallback</span>
        <p>Mongo handouts could not be loaded. Showing legacy vault handout pages instead.</p>
      </section>
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
    </>
  );
}

export default function HandoutsPage({ pages = [], mode = "player" }) {
  const legacyItems = useMemo(() => pages.filter((page) => isLegacyHandout(page, mode)).slice(0, 60), [pages, mode]);
  const [state, setState] = useState({ loading: true, error: "", handouts: null, role: "" });

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: "", handouts: null, role: "" });
    api.handouts()
      .then((data) => {
        if (!active) return;
        setState({ loading: false, error: "", handouts: Array.isArray(data.handouts) ? data.handouts : [], role: data.role || "" });
      })
      .catch((error) => {
        if (!active) return;
        setState({ loading: false, error: error.message || "Handouts API failed.", handouts: null, role: "" });
      });
    return () => {
      active = false;
    };
  }, []);

  const handouts = state.handouts || [];

  return (
    <div className="page-stack handouts-page">
      <section className="hero-panel">
        <span className="kicker">Handouts</span>
        <h1>Shared campaign materials</h1>
        <p>Persistent player-facing materials released through the campaign workspace.</p>
        {state.role && <div className="workspace-identity-strip"><span>Role: {state.role}</span></div>}
      </section>

      {state.loading ? (
        <section className="codex-card workspace-status-card">
          <Sparkles size={24} />
          <h2>Loading handouts</h2>
          <p>Fetching campaign handouts from Mongo.</p>
        </section>
      ) : null}

      {!state.loading && state.error && legacyItems.length ? <LegacyHandouts items={legacyItems} /> : null}

      {!state.loading && state.error && !legacyItems.length ? (
        <section className="codex-card workspace-status-card">
          <AlertTriangle size={24} />
          <h2>Handouts unavailable</h2>
          <p>{state.error}</p>
        </section>
      ) : null}

      {!state.loading && !state.error && handouts.length ? (
        <section className="handout-grid">
          {handouts.map((handout) => <MongoHandoutCard key={handout.id || handout.title} handout={handout} />)}
        </section>
      ) : null}

      {!state.loading && !state.error && !handouts.length ? (
        <section className="codex-card workspace-status-card">
          <Sparkles size={24} />
          <h2>No handouts yet</h2>
          <p>No Mongo handouts are available for this campaign.</p>
        </section>
      ) : null}
    </div>
  );
}