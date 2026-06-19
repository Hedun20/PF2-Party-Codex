import EntityCard from "../components/EntityCard.jsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";

const blocks = [
  ["Active quests", "quests"],
  ["Important NPCs", "npcs"],
  ["Known enemies", "enemies"],
  ["Recent lore", "lore"],
  ["Sessions", "sessions"],
  ["Locations", "locations"]
];

export default function DashboardPage({ pages, dashboard, mode }) {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <span className="kicker">Campaign Codex</span>
        <h1>PF2 Party Codex</h1>
        <p>{dashboard?.summary || "Local-first Pathfinder 2e archive for table lore, secrets, sessions, and Foundry journals."}</p>
      </section>
      {dashboard && <MarkdownViewer content={dashboard.content} />}
      {blocks.map(([title, category]) => {
        const items = pages.filter((page) => page.category === category || page.category?.startsWith(`${category}/`)).slice(0, 4);
        return (
          <section className="section-band" key={category}>
            <h2>{title}</h2>
            <div className="card-grid">{items.map((page) => <EntityCard key={page.path} page={page} mode={mode} />)}</div>
          </section>
        );
      })}
    </div>
  );
}
