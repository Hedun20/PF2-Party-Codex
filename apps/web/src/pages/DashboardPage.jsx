import EntityCard from "../components/EntityCard.jsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import WorldAtlas from "../components/WorldAtlas.jsx";

const blocks = [
  ["Активные квесты", "quests"],
  ["Важные NPC", "npcs"],
  ["Известные враги", "enemies"],
  ["Свежий лор", "lore"],
  ["Сессии", "sessions"],
  ["Локации", "locations"]
];

export default function DashboardPage({ pages, dashboard, mode }) {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <span className="kicker">Кодекс кампании</span>
        <h1>PF2 Party Codex</h1>
        <p>{dashboard?.summary || "Локальный архив Pathfinder 2e для миров, лора, сессий, секретов GM и Foundry-журналов."}</p>
      </section>
      <WorldAtlas />
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
