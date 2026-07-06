import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BookOpen, CalendarDays, Clock3, ScrollText } from "lucide-react";
import { api } from "../api/client.js";

function isSessionPage(page) {
  return page?.category === "sessions" || page?.type === "session" || page?.frontmatter?.sessionDate;
}

function compactText(text = "", limit = 220) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function formatDate(value = "") {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function sessionSummary(session = {}) {
  return compactText(session.recapPublic || session.summary || session.description || session.prepNotes || session.recapGm || "");
}

function SessionCard({ session }) {
  const scheduled = formatDate(session.scheduledAt);
  const summary = sessionSummary(session);

  return (
    <article className="codex-card workspace-card">
      <CalendarDays size={22} />
      <div>
        <strong>{session.title || "Untitled session"}</strong>
        <span>{[session.status, scheduled].filter(Boolean).join(" · ") || "Session"}</span>
        {summary && <span>{summary}</span>}
        {session.prepNotes && <span>Prep: {compactText(session.prepNotes, 180)}</span>}
        {session.recapGm && <span>GM recap: {compactText(session.recapGm, 180)}</span>}
      </div>
    </article>
  );
}

function LegacySessions({ pages, mode }) {
  return (
    <>
      <section className="codex-card workspace-status-card">
        <AlertTriangle size={22} />
        <span className="kicker">Compatibility fallback</span>
        <p>Mongo sessions could not be loaded. Showing legacy vault session pages instead.</p>
      </section>
      <section className="workspace-grid">
        {pages.map((page) => (
          <Link key={page.path} to={`/page/${encodeURIComponent(page.path)}`} className="codex-card workspace-card">
            <CalendarDays size={22} />
            <div>
              <strong>{page.title}</strong>
              <span>{page.summary || page.frontmatter?.sessionDate || "Session note"}</span>
            </div>
          </Link>
        ))}
      </section>
      {mode === "gm" && <Link className="small-context-link" to="/editor"><BookOpen size={15} /> Create session article</Link>}
    </>
  );
}

export default function SessionsPage({ pages = [], mode = "player" }) {
  const legacySessions = useMemo(() => pages.filter(isSessionPage).slice(0, 40), [pages]);
  const [state, setState] = useState({ loading: true, error: "", sessions: null, role: "" });

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: "", sessions: null, role: "" });
    api.sessions()
      .then((data) => {
        if (!active) return;
        setState({ loading: false, error: "", sessions: Array.isArray(data.sessions) ? data.sessions : [], role: data.role || "" });
      })
      .catch((error) => {
        if (!active) return;
        setState({ loading: false, error: error.message || "Sessions API failed.", sessions: null, role: "" });
      });
    return () => {
      active = false;
    };
  }, []);

  const mongoSessions = state.sessions || [];

  return (
    <div className="page-stack sessions-page">
      <section className="hero-panel">
        <span className="kicker">Sessions</span>
        <h1>Campaign sessions</h1>
        <p>Preparation, recap and session-linked materials from the campaign workspace.</p>
        {state.role && <div className="workspace-identity-strip"><span>Role: {state.role}</span></div>}
      </section>

      {state.loading ? (
        <section className="codex-card workspace-status-card">
          <Clock3 size={24} />
          <h2>Loading sessions</h2>
          <p>Fetching campaign sessions from Mongo.</p>
        </section>
      ) : null}

      {!state.loading && state.error && legacySessions.length ? <LegacySessions pages={legacySessions} mode={mode} /> : null}

      {!state.loading && state.error && !legacySessions.length ? (
        <section className="codex-card workspace-status-card">
          <AlertTriangle size={24} />
          <h2>Sessions unavailable</h2>
          <p>{state.error}</p>
        </section>
      ) : null}

      {!state.loading && !state.error && mongoSessions.length ? (
        <section className="workspace-grid">
          {mongoSessions.map((session) => <SessionCard key={session.id || session.title} session={session} />)}
        </section>
      ) : null}

      {!state.loading && !state.error && !mongoSessions.length ? (
        <section className="codex-card workspace-status-card">
          <Clock3 size={24} />
          <h2>No sessions yet</h2>
          <p>No Mongo sessions are available for this campaign.</p>
        </section>
      ) : null}

      <section className="codex-card workspace-status-card">
        <ScrollText size={20} />
        <p>Sessions are read from the Mongo campaign workspace. Legacy vault pages appear only as a labeled compatibility fallback if the API is unavailable.</p>
      </section>
    </div>
  );
}