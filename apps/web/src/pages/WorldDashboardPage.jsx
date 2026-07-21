import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Castle, Clock3, MapPinned, PenLine, ScrollText, UsersRound } from "lucide-react";
import EntityCard from "../components/EntityCard.jsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";
import { getWorldOwnedPages, resolveWorldBySlug, worldRoute } from "../utils/worldContext.js";

const WORLD_BLOCKS = [
  ["Страны", "countries", Castle],
  ["Города", "cities", Castle],
  ["Персонажи", "npcs", UsersRound],
  ["Задания", "quests", ScrollText],
  ["Локации", "locations", MapPinned],
  ["Хроника сессий", "sessions", BookOpen]
];

function categoryMatches(page, category) {
  return page.category === category || page.category?.startsWith(`${category}/`);
}

function WorldStat({ value, label }) {
  return <span><strong>{value}</strong>{label}</span>;
}

function ArchiveLink({ to, icon: Icon, title, meta }) {
  return (
    <Link to={to} className="codex-card world-command-card">
      <Icon size={19} aria-hidden="true" />
      <strong>{title}</strong>
      <span>{meta}</span>
    </Link>
  );
}

export default function WorldDashboardPage({ pages = [], mode = "player", session }) {
  const { worldSlug } = useParams();
  const world = resolveWorldBySlug(pages, worldSlug);
  const canEdit = mode === "gm" && Boolean(session?.canEdit);

  if (!world) {
    return (
      <div className="page-stack">
        <section className="hero-panel world-missing-panel">
          <span className="kicker">Мир не найден</span>
          <h1>Этого мира нет в архиве</h1>
          <p>Проверьте ссылку или вернитесь к списку миров. Возможно, мир был переименован или удалён.</p>
          <CodexButton as={Link} to="/category/worlds" variant="secondary"><ArrowLeft size={16} /> К списку миров</CodexButton>
        </section>
      </div>
    );
  }

  const ownedPages = getWorldOwnedPages(pages, world).filter((page) => page.path !== world.path);
  const mapCount = ownedPages.filter((page) => page.mapImage).length;
  const timelineCount = ownedPages.filter((page) => (
    page.type === "timelineEvent"
    || page.category === "timeline"
    || page.category === "sessions"
    || page.frontmatter?.year
    || page.frontmatter?.timelineYear
  )).length;
  const characterCount = ownedPages.filter((page) => ["npcs", "enemies", "characters"].includes(page.category)).length;
  const locationCount = ownedPages.filter((page) => ["countries", "cities", "locations"].includes(page.category)).length;

  return (
    <div className="page-stack world-mode-page">
      <section className="hero-panel world-mode-hero">
        <div className="world-mode-hero-copy">
          <span className="kicker">Архив мира</span>
          <h1>{world.title}</h1>
          <p>{world.summary || "Описание мира пока не заполнено. Здесь собраны его знания, история, места и персонажи."}</p>
          <div className="world-mode-actions">
            <CodexButton as={Link} to="/archive" variant="secondary"><ArrowLeft size={16} /> К архиву</CodexButton>
            <CodexButton as={Link} to={`/page/${encodeURIComponent(world.path)}`} variant="ghost"><BookOpen size={16} /> Статья о мире</CodexButton>
            {canEdit ? (
              <CodexButton as={Link} to={`/editor?world=${encodeURIComponent(world.title)}`}>
                <PenLine size={16} /> Добавить материал
              </CodexButton>
            ) : null}
          </div>
        </div>

        <div className="world-mode-stat-card codex-card" aria-label="Сводка архива мира">
          <WorldStat value={ownedPages.length} label="материалов" />
          <WorldStat value={locationCount} label="мест" />
          <WorldStat value={characterCount} label="персонажей" />
          <WorldStat value={mapCount} label="карт" />
          <WorldStat value={timelineCount} label="событий" />
        </div>
      </section>

      <section className="world-command-strip" aria-label="Разделы архива мира">
        <ArchiveLink to={`${worldRoute(world)}/maps`} icon={MapPinned} title="Карты мира" meta={`${mapCount} карт`} />
        <ArchiveLink to={`${worldRoute(world)}/timeline`} icon={Clock3} title="Хронология" meta={`${timelineCount} событий`} />
        <ArchiveLink to={`${worldRoute(world)}/category/locations`} icon={Castle} title="Места" meta={`${locationCount} записей`} />
        <ArchiveLink to={`${worldRoute(world)}/category/sessions`} icon={BookOpen} title="Хроника сессий" meta="Записи прошедших игр" />
      </section>

      {world.content ? (
        <section className="section-band world-intro-band">
          <div className="section-title-row">
            <h2>О мире</h2>
            <Link to={`/page/${encodeURIComponent(world.path)}`}>Открыть полную статью</Link>
          </div>
          <MarkdownViewer content={world.content} pages={pages} />
        </section>
      ) : null}

      {WORLD_BLOCKS.map(([title, category, Icon]) => {
        const items = ownedPages.filter((page) => categoryMatches(page, category)).slice(0, 6);
        if (!items.length) return null;

        return (
          <section className="section-band" key={category}>
            <div className="section-title-row">
              <div>
                <span className="kicker">{world.title}</span>
                <h2><Icon size={20} aria-hidden="true" /> {title}</h2>
              </div>
              <Link to={`${worldRoute(world)}/category/${category}`}>Все материалы</Link>
            </div>
            <div className="codex-card-grid card-grid">
              {items.map((page) => <EntityCard key={page.path} page={page} mode={mode} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
