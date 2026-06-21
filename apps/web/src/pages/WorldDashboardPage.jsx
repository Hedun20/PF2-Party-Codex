import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Castle, Clock3, FileQuestion, MapPinned, PenLine, ScrollText, UsersRound } from "lucide-react";
import EntityCard from "../components/EntityCard.jsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";
import { getSharedArchivePages, getWorldOwnedPages, resolveWorldBySlug, worldRoute } from "../utils/worldContext.js";

const WORLD_BLOCKS = [
  ["Страны", "countries", Castle],
  ["Города", "cities", Castle],
  ["NPC", "npcs", UsersRound],
  ["Квесты", "quests", ScrollText],
  ["Локации", "locations", MapPinned],
  ["Сессии", "sessions", BookOpen]
];

function categoryMatches(page, category) {
  return page.category === category || page.category?.startsWith(`${category}/`);
}

function WorldStat({ value, label }) {
  return <span><strong>{value}</strong>{label}</span>;
}

export default function WorldDashboardPage({ pages = [], mode = "player", session }) {
  const { worldSlug } = useParams();
  const world = resolveWorldBySlug(pages, worldSlug);

  if (!world) {
    return (
      <div className="page-stack">
        <section className="hero-panel world-missing-panel">
          <span className="kicker">Мир не найден</span>
          <h1>Такого мира в Архиве нет</h1>
          <p>Проверь ссылку или вернись в общий Архив. Возможно, статья мира была переименована или удалена.</p>
          <CodexButton as={Link} to="/category/worlds" variant="secondary"><ArrowLeft size={16} /> К списку миров</CodexButton>
        </section>
      </div>
    );
  }

  const ownedPages = getWorldOwnedPages(pages, world).filter((page) => page.path !== world.path);
  const sharedPages = getSharedArchivePages(pages).filter((page) => !["dashboard", "_examples"].includes(page.category)).slice(0, 8);
  const mapCount = ownedPages.filter((page) => page.mapImage).length;
  const timelineCount = ownedPages.filter((page) => page.type === "timelineEvent" || page.category === "timeline" || page.category === "sessions" || page.frontmatter?.year || page.frontmatter?.timelineYear).length;
  const characterCount = ownedPages.filter((page) => ["npcs", "enemies", "characters"].includes(page.category)).length;
  const locationCount = ownedPages.filter((page) => ["countries", "cities", "locations"].includes(page.category)).length;

  return (
    <div className="page-stack world-mode-page">
      <section className="hero-panel world-mode-hero">
        <div className="world-mode-hero-copy">
          <span className="kicker">Активный мир</span>
          <h1>{world.title}</h1>
          <p>{world.summary || "Этот мир уже открыт как отдельный контекст. Добавь summary, главный конфликт, стартовую зону и player-safe вводную в статье мира."}</p>
          <div className="world-mode-actions">
            <CodexButton as={Link} to="/" variant="secondary"><ArrowLeft size={16} /> В Архив</CodexButton>
            <CodexButton as={Link} to={`/page/${encodeURIComponent(world.path)}`} variant="ghost"><BookOpen size={16} /> Статья мира</CodexButton>
            {session?.canEdit && <CodexButton as={Link} to={`/editor?world=${encodeURIComponent(world.title)}`}><PenLine size={16} /> Создать в мире</CodexButton>}
          </div>
        </div>
        <div className="world-mode-stat-card codex-card">
          <WorldStat value={ownedPages.length} label="материалов" />
          <WorldStat value={locationCount} label="мест" />
          <WorldStat value={characterCount} label="персонажей" />
          <WorldStat value={mapCount} label="карт" />
          <WorldStat value={timelineCount} label="событий" />
        </div>
      </section>

      <section className="world-command-strip">
        <Link to={`${worldRoute(world)}/maps`} className="codex-card world-command-card"><MapPinned size={19} /><strong>Карты мира</strong><span>{mapCount} карт</span></Link>
        <Link to={`${worldRoute(world)}/timeline`} className="codex-card world-command-card"><Clock3 size={19} /><strong>Timeline мира</strong><span>{timelineCount} событий</span></Link>
        <Link to={`${worldRoute(world)}/category/npcs`} className="codex-card world-command-card"><UsersRound size={19} /><strong>NPC мира</strong><span>{characterCount} персонажей</span></Link>
        <Link to="/missing" className="codex-card world-command-card"><FileQuestion size={19} /><strong>Ненаписанные</strong><span>фантомные ссылки</span></Link>
      </section>

      {world.content && (
        <section className="section-band world-intro-band">
          <div className="section-title-row">
            <h2>Вводная мира</h2>
            <Link to={`/page/${encodeURIComponent(world.path)}`}>Открыть полную статью</Link>
          </div>
          <MarkdownViewer content={world.content} pages={pages} />
        </section>
      )}

      {WORLD_BLOCKS.map(([title, category]) => {
        const items = ownedPages.filter((page) => categoryMatches(page, category)).slice(0, 6);
        if (!items.length) return null;
        return (
          <section className="section-band" key={category}>
            <div className="section-title-row">
              <div>
                <span className="kicker">{world.title}</span>
                <h2>{title}</h2>
              </div>
              <Link to={`${worldRoute(world)}/category/${category}`}>Все записи</Link>
            </div>
            <div className="codex-card-grid card-grid">{items.map((page) => <EntityCard key={page.path} page={page} mode={mode} />)}</div>
          </section>
        );
      })}

      <section className="section-band shared-archive-band">
        <div className="section-title-row">
          <div>
            <span className="kicker">Общие материалы</span>
            <h2>Из общего Архива</h2>
          </div>
          <Link to="/">Вернуться в Архив</Link>
        </div>
        {sharedPages.length > 0 ? (
          <div className="codex-card-grid card-grid">{sharedPages.map((page) => <EntityCard key={page.path} page={page} mode={mode} />)}</div>
        ) : (
          <p className="empty-copy">Общие статьи пока не созданы. Материалы без `world` будут появляться здесь отдельно, не смешиваясь с миром.</p>
        )}
      </section>
    </div>
  );
}
