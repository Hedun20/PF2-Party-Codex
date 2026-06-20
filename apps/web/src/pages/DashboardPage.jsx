import { Link } from "react-router-dom";
import { Clock3, FileQuestion, FileUp, MapPinned, PenLine } from "lucide-react";
import EntityCard from "../components/EntityCard.jsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";

const blocks = [
  ["Активные квесты", "quests"],
  ["Важные NPC", "npcs"],
  ["Известные враги", "enemies"],
  ["Свежий лор", "lore"],
  ["Сессии", "sessions"],
  ["Локации", "locations"]
];

function MasterWorkbench({ pages, canEdit = false }) {
  const mapCount = pages.filter((page) => page.mapImage).length;
  const worldCount = pages.filter((page) => page.category === "worlds").length;
  const publicCount = pages.filter((page) => page.visibility === "public").length;

  return (
    <section className="workbench-panel">
      <div className="workbench-copy">
        <span className="kicker">Рабочий стол мастера</span>
        <h2>Навигационная база кампании</h2>
        <p>Здесь собраны быстрые инструменты: создание статей, импорт Markdown, будущие ссылки, карты 2.0 и timeline. Общая карта Atlas убрана — теперь каждая карта живёт в своей статье.</p>
      </div>

      <div className="workbench-actions">
        <Link to="/missing" className="codex-card workbench-action">
          <FileQuestion size={20} />
          <strong>Ненаписанные статьи</strong>
          <span>Ссылки `[[...]]`, которые уже есть в лоре, но ещё не имеют файла.</span>
        </Link>
        {canEdit && (
          <Link to="/editor" className="codex-card workbench-action">
            <PenLine size={20} />
            <strong>Создать статью</strong>
            <span>Умный конструктор мира, страны, города, NPC, квеста или локации.</span>
          </Link>
        )}
        <Link to="/maps" className="codex-card workbench-action">
          <MapPinned size={20} />
          <strong>Карты 2.0</strong>
          <span>{mapCount} карт подключено. Пины, области, GM/player слой и быстрые переходы к статьям.</span>
        </Link>
        <Link to="/timeline" className="codex-card workbench-action">
          <Clock3 size={20} />
          <strong>Timeline</strong>
          <span>Линия событий с точками-ссылками на статьи и фильтром по миру.</span>
        </Link>
        {canEdit && (
          <Link to="/editor" className="codex-card workbench-action muted-action">
            <FileUp size={20} />
            <strong>MD / Obsidian импорт</strong>
            <span>Можно заполнить форму из настоящего .md или массово импортировать архив.</span>
          </Link>
        )}
      </div>

      <div className="workbench-stats">
        <span><strong>{worldCount}</strong> миров</span>
        <span><strong>{publicCount}</strong> публичных</span>
        <span><strong>{mapCount}</strong> карт</span>
      </div>
    </section>
  );
}

export default function DashboardPage({ pages, dashboard, mode, session }) {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <span className="kicker">Кодекс кампании</span>
        <h1>PF2 Party Codex</h1>
        <p>{dashboard?.summary || "Локальный архив Pathfinder 2e для миров, лора, сессий, секретов GM и Foundry-журналов."}</p>
      </section>
      <MasterWorkbench pages={pages} canEdit={Boolean(session?.canEdit)} />
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
