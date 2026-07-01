import { Link } from "react-router-dom";
import { BookOpen, Clock3, MapPinned, NotebookPen, Sparkles, UserRound, UsersRound } from "lucide-react";

function displayRole(session) {
  return session?.role || session?.membership?.role || (session?.canEdit ? "gm" : "player");
}

export default function MyWorkspacePage({ session, pages = [], mode = "player" }) {
  const isGm = Boolean(session?.canEdit) && mode === "gm";
  const publicCount = pages.filter((page) => page.visibility === "public").length;
  const worldCount = pages.filter((page) => page.category === "worlds" || page.type === "world").length;
  const mapCount = pages.filter((page) => page.mapImage).length;

  return (
    <div className="page-stack workspace-page">
      <section className="hero-panel workspace-hero">
        <span className="kicker">My Workspace</span>
        <h1>{isGm ? "GM command desk" : "Player home desk"}</h1>
        <p>{isGm
          ? "Личная рабочая зона мастера: заметки, персонажи, подготовка, handouts и быстрый доступ к миру без кладбища в сайдбаре."
          : "Личная зона игрока: персонаж, заметки, известный лор, карты и материалы, открытые мастером."}</p>
        <div className="workspace-identity-strip">
          <span><UserRound size={16} /> {session?.user?.name || session?.user?.email || "Guest"}</span>
          <span>Role: {displayRole(session)}</span>
          {session?.activeCampaign?.name && <span>Campaign: {session.activeCampaign.name}</span>}
        </div>
      </section>

      <section className="workspace-grid">
        <Link to="/notes" className="codex-card workspace-card primary-workspace-card">
          <NotebookPen size={22} />
          <div>
            <strong>Notes</strong>
            <span>Private, GM-shared and party-visible notes.</span>
          </div>
        </Link>
        <Link to="/characters" className="codex-card workspace-card primary-workspace-card">
          <UsersRound size={22} />
          <div>
            <strong>Characters</strong>
            <span>Imported sheets, portraits, build notes and GM visibility.</span>
          </div>
        </Link>
        <Link to="/handouts" className="codex-card workspace-card">
          <Sparkles size={22} />
          <div>
            <strong>Handouts</strong>
            <span>Shared player-facing material and revealed campaign context.</span>
          </div>
        </Link>
        <Link to="/maps" className="codex-card workspace-card">
          <MapPinned size={22} />
          <div>
            <strong>Maps</strong>
            <span>{mapCount} map-linked pages currently visible.</span>
          </div>
        </Link>
        <Link to="/timeline" className="codex-card workspace-card">
          <Clock3 size={22} />
          <div>
            <strong>Timeline</strong>
            <span>Campaign history and session chronology.</span>
          </div>
        </Link>
        {isGm && (
          <Link to="/gm-tools" className="codex-card workspace-card">
            <BookOpen size={22} />
            <div>
              <strong>GM Tools</strong>
              <span>Vault health, Foundry, missing links, safety and import tools.</span>
            </div>
          </Link>
        )}
      </section>

      <section className="codex-card workspace-status-card">
        <span className="kicker">Campaign snapshot</span>
        <div className="workspace-stats-row">
          <span><strong>{worldCount}</strong> worlds</span>
          <span><strong>{publicCount}</strong> public pages</span>
          <span><strong>{mapCount}</strong> maps</span>
        </div>
      </section>
    </div>
  );
}
