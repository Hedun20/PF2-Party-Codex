import { Link } from "react-router-dom";
import { FileQuestion, FileUp, MapPinned, PenLine } from "lucide-react";
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

function MasterWorkbench({ pages }) {
  const mapCount = pages.filter((page) => page.mapImage).length;
  const worldCount = pages.filter((page) => page.category === "worlds").length;
  const publicCount = pages.filter((page) => page.visibility === "public").length;

  return (
    <section className="workbench-panel">
      <div className="workbench-copy">
        <span className="kicker">Рабочий стол мастера</span>
        <h2>Навигационная база кампании</h2>
        <p>Здесь собраны ближайшие инструменты: будущие статьи, создание лора, карты с пинами и подготовка массового MD-импорта.</p>
      </div>

      <div className="workbench-actions">
        <Link to="/missing" className="workbench-action">
          <FileQuestion size={20} />
          <strong>Ненаписанные статьи</strong>
          <span>Ссылки `[[...]]`, которые уже есть в лоре, но ещё не имеют файла.</span>
        </Link>
        <Link to="/editor" className="workbench-action">
          <PenLine size={20} />
          <strong>Создать статью</strong>
          <span>Умный конструктор мира, страны, города, NPC, квеста или локации.</span>
        </Link>
        <Link to="/editor" className="workbench-action">
          <MapPinned size={20} />
          <strong>Карты и пины</strong>
          <span>{mapCount} карт уже подключено. Следующий этап: области и типы слоёв.</span>
        </Link>
        <Link to="/editor" className="workbench-action muted-action">
          <FileUp size={20} />
          <strong>MD-импорт</strong>
          <span>Заготовка интерфейса есть, дальше добавим массовую загрузку архива.</span>
        </Link>
      </div>

      <div className="workbench-stats">
        <span><strong>{worldCount}</strong> миров</span>
        <span><strong>{publicCount}</strong> публичных</span>
        <span><strong>{mapCount}</strong> карт</span>
      </div>
    </section>
  );
}

export default function DashboardPage({ pages, dashboard, mode }) {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <span className="kicker">Кодекс кампании</span>
        <h1>PF2 Party Codex</h1>
        <p>{dashboard?.summary || "Локальный архив Pathfinder 2e для миров, лора, сессий, секретов GM и Foundry-журналов."}</p>
      </section>
      <MasterWorkbench pages={pages} />
      <WorldAtlas pages={pages} />
      {dashboard && <MarkdownViewer content={dashboard.content} pages={pages} />}
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
