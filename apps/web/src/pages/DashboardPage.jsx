import { Link } from "react-router-dom";
import { Clock3, FileQuestion, FileUp, MapPinned, PenLine } from "lucide-react";
import EntityCard from "../components/EntityCard.jsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";

const blocks = [
  ["Active quests", "quests"],
  ["Important NPC", "npcs"],
  ["Known enemies", "enemies"],
  ["Fresh lore", "lore"],
  ["Sessions", "sessions"],
  ["Locations", "locations"]
];

function MasterWorkbench({ pages, canEdit = false }) {
  const mapCount = pages.filter((page) => page.mapImage).length;
  const worldCount = pages.filter((page) => page.category === "worlds" || page.type === "world").length;
  const publicCount = pages.filter((page) => page.visibility === "public").length;

  return (
    <section className="workbench-panel">
      <div className="workbench-copy">
        <span className="kicker">{canEdit ? "GM desktop" : "Player portal"}</span>
        <h2>{canEdit ? "Campaign control desk" : "Campaign archive"}</h2>
        <p>{canEdit
          ? "Create articles, check missing links, prepare maps, timeline and player-safe handouts from one desktop."
          : "Browse player-visible worlds, public lore, maps and handouts. GM notes and preparation tools stay hidden."}</p>
      </div>

      <div className="workbench-actions">
        {canEdit && (
          <Link to="/missing" className="codex-card workbench-action">
            <FileQuestion size={20} />
            <strong>Missing articles</strong>
            <span>Wiki links that exist in lore but do not yet have a file.</span>
          </Link>
        )}
        {canEdit && (
          <Link to="/editor" className="codex-card workbench-action">
            <PenLine size={20} />
            <strong>Create article</strong>
            <span>World, country, city, NPC, quest, session, location or timeline event.</span>
          </Link>
        )}
        <Link to="/maps" className="codex-card workbench-action">
          <MapPinned size={20} />
          <strong>Maps</strong>
          <span>{mapCount} maps connected. Player mode shows only player-visible layers.</span>
        </Link>
        <Link to="/timeline" className="codex-card workbench-action">
          <Clock3 size={20} />
          <strong>Timeline</strong>
          <span>Public timeline and linked events filtered through player-safe data.</span>
        </Link>
        {canEdit && (
          <Link to="/editor" className="codex-card workbench-action muted-action">
            <FileUp size={20} />
            <strong>MD / Obsidian import</strong>
            <span>Import Markdown files into the vault from the GM workspace.</span>
          </Link>
        )}
      </div>

      <div className="workbench-stats">
        <span><strong>{worldCount}</strong> worlds</span>
        <span><strong>{publicCount}</strong> public</span>
        <span><strong>{mapCount}</strong> maps</span>
      </div>
    </section>
  );
}

export default function DashboardPage({ pages, dashboard, mode, session }) {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <span className="kicker">Campaign Codex</span>
        <h1>PF2 Party Codex</h1>
        <p>{dashboard?.summary || "Local Pathfinder 2e campaign archive for worlds, lore, sessions, GM secrets and Foundry journals."}</p>
      </section>
      <MasterWorkbench pages={pages} canEdit={mode === "gm" && Boolean(session?.canEdit)} />
      {dashboard && <MarkdownViewer content={dashboard.content} pages={pages} />}
      {blocks.map(([title, category]) => {
        const items = pages.filter((page) => page.category === category || page.category?.startsWith(`${category}/`)).slice(0, 4);
        return (
          <section className="section-band" key={category}>
            <h2>{title}</h2>
            <div className="codex-card-grid card-grid">{items.map((page) => <EntityCard key={page.path} page={page} mode={mode} />)}</div>
          </section>
        );
      })}
    </div>
  );
}