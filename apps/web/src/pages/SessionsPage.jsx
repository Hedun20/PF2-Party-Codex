import { Link } from "react-router-dom";
import { BookOpen, CalendarDays, Clock3, ScrollText } from "lucide-react";

function isSessionPage(page) {
  return page?.category === "sessions" || page?.type === "session" || page?.frontmatter?.sessionDate;
}

export default function SessionsPage({ pages = [], mode = "player" }) {
  const sessions = pages.filter(isSessionPage).slice(0, 40);

  return (
    <div className="page-stack sessions-page">
      <section className="hero-panel">
        <span className="kicker">Sessions</span>
        <h1>Campaign sessions</h1>
        <p>Preparation, recap and session-linked materials. Mongo-backed sessions are available through the new backend and can be wired into the UI after the debug pass.</p>
      </section>

      {sessions.length ? (
        <section className="workspace-grid">
          {sessions.map((page) => (
            <Link key={page.path} to={`/page/${encodeURIComponent(page.path)}`} className="codex-card workspace-card">
              <CalendarDays size={22} />
              <div>
                <strong>{page.title}</strong>
                <span>{page.summary || page.frontmatter?.sessionDate || "Session note"}</span>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="codex-card workspace-status-card">
          <Clock3 size={24} />
          <h2>No session pages yet</h2>
          <p>Create a session note or use the Mongo sessions API as the next UI wiring step.</p>
          {mode === "gm" && <Link className="small-context-link" to="/editor"><BookOpen size={15} /> Create session article</Link>}
        </section>
      )}

      <section className="codex-card workspace-status-card">
        <ScrollText size={20} />
        <p>Live “show player” flow is no longer the product center. Sessions are treated as prep, play reference and recap.</p>
      </section>
    </div>
  );
}
