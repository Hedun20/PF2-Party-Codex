import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Castle, Clock3, Compass, Eye, FileQuestion, MapPinned, PenLine, PlayCircle, ScrollText, Swords, UsersRound } from "lucide-react";
import EntityCard from "../components/EntityCard.jsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";
import { getSharedArchivePages, getWorldOwnedPages, isWorldPage, resolveWorldBySlug, worldRoute } from "../utils/worldContext.js";

const WORLD_BLOCKS = [
  ["Страны", "countries", Castle],
  ["Города", "cities", Castle],
  ["NPC", "npcs", UsersRound],
  ["Квесты", "quests", ScrollText],
  ["Локации", "locations", MapPinned],
  ["Сессии", "sessions", BookOpen]
];

const CREATOR_ACTIONS = [
  ["Сессия", "session", BookOpen, "recap, решения игроков и hooks"],
  ["Сцена / локация", "location", Compass, "комната, таверна, башня, encounter-зона"],
  ["NPC", "npc", UsersRound, "союзник, торговец, свидетель, предатель"],
  ["Квест", "quest", ScrollText, "цель, ставки, награда, последствия"],
  ["Событие", "timelineEvent", Clock3, "год, эра, важность, связи"]
];

const QUEST_DONE_RE = /^(done|completed|complete|closed|failed|archived|cancelled|canceled|готово|закрыт|провален|архив)/i;

function lowerValue(value = "") {
  return String(value || "").trim().toLowerCase();
}

function pageDateValue(page) {
  return page?.frontmatter?.sessionDate
    || page?.frontmatter?.date
    || page?.frontmatter?.updated
    || page?.frontmatter?.created
    || page?.mtime
    || page?.updatedAt
    || page?.createdAt
    || "";
}

function sortByDateDesc(a, b) {
  return String(pageDateValue(b)).localeCompare(String(pageDateValue(a)));
}

function isActiveQuest(page) {
  if (page?.category !== "quests" && page?.type !== "quest") return false;
  const status = lowerValue(page?.frontmatter?.status || page?.status);
  return !QUEST_DONE_RE.test(status);
}

function isNpcLike(page) {
  return ["npcs", "enemies", "characters"].includes(page?.category) || ["npc", "enemy", "pc"].includes(page?.type);
}

function isSessionLike(page) {
  return page?.category === "sessions" || page?.type === "session";
}

function isTimelineLike(page) {
  return page?.type === "timelineEvent" || page?.category === "timeline" || page?.frontmatter?.year || page?.frontmatter?.timelineYear;
}

function editorCreateLink(world, type = "lore", title = "") {
  const params = new URLSearchParams();
  params.set("world", world.title);
  if (type) params.set("type", type);
  if (title) params.set("title", title);
  return `/editor?${params.toString()}`;
}

function compactText(text = "", fallback = "Описание пока не заполнено.") {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return fallback;
  return value.length > 96 ? `${value.slice(0, 93)}...` : value;
}

function PageMiniList({ title, kicker, icon: Icon, items = [], empty, action }) {
  return (
    <section className="codex-card world-desk-card">
      <div className="world-desk-card-head">
        <div>
          {kicker && <span className="kicker">{kicker}</span>}
          <h3>{title}</h3>
        </div>
        {Icon && <Icon size={19} />}
      </div>
      {items.length > 0 ? (
        <div className="world-desk-list">
          {items.map((page) => (
            <Link key={page.path} to={`/page/${encodeURIComponent(page.path)}`} className="world-desk-list-item">
              <strong>{page.title}</strong>
              <span>{compactText(page.summary || page.frontmatter?.summary)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="world-desk-empty">{empty}</p>
      )}
      {action}
    </section>
  );
}

function WorldGmDesktop({ world, ownedPages, session }) {
  const canEdit = Boolean(session?.canEdit);
  const maps = ownedPages.filter((page) => page.mapImage).slice(0, 4);
  const activeQuests = ownedPages.filter(isActiveQuest).slice(0, 4);
  const npcPages = ownedPages.filter(isNpcLike).slice(0, 4);
  const sessions = ownedPages.filter(isSessionLike).sort(sortByDateDesc).slice(0, 4);
  const timeline = ownedPages.filter(isTimelineLike).sort(sortByDateDesc).slice(0, 4);
  const playerHandouts = ownedPages.filter((page) => page.visibility === "public" && !isWorldPage(page)).slice(0, 4);
  const nextTitle = `${world.title}: следующая сессия`;

  return (
    <section className="world-gm-desktop">
      <div className="world-gm-desktop-main codex-card">
        <div className="world-desk-orb"><PlayCircle size={34} /></div>
        <span className="kicker">GM Desktop</span>
        <h2>Запуск мира за два клика</h2>
        <p>Перед сессией мастеру нужны не все статьи сразу, а сцена, карта, NPC, активный квест, последний recap и заметки следующей игры. Этот блок собирает рабочий стол мира без лишнего архива вокруг.</p>
        <div className="world-desk-primary-actions">
          <CodexButton as={Link} to={`${worldRoute(world)}/session`}><PlayCircle size={16} /> Start Session</CodexButton>
          <CodexButton as={Link} to={`${worldRoute(world)}/maps`} variant="secondary"><MapPinned size={16} /> Карты</CodexButton>
          <CodexButton as={Link} to={`${worldRoute(world)}/timeline`} variant="secondary"><Clock3 size={16} /> Timeline</CodexButton>
          {canEdit && <CodexButton as={Link} to={editorCreateLink(world, "session", nextTitle)} variant="ghost"><BookOpen size={16} /> Recap</CodexButton>}
        </div>
        {canEdit && (
          <div className="world-create-dock">
            {CREATOR_ACTIONS.map(([label, type, Icon, hint]) => (
              <Link key={type} to={editorCreateLink(world, type)} className="world-create-pill">
                <Icon size={15} />
                <span>{label}</span>
                <em>{hint}</em>
              </Link>
            ))}
          </div>
        )}
      </div>

      <PageMiniList title="Сцены и карты" kicker="Вести игру" icon={MapPinned} items={maps} empty="Добавь mapImage в статью карты или локации — она появится здесь." action={<Link className="small-context-link" to={`${worldRoute(world)}/maps`}>Все карты</Link>} />
      <PageMiniList title="Активные квесты" kicker="Что движет партию" icon={Swords} items={activeQuests} empty="Активных квестов пока нет. Создай квест со статусом active/idea." action={canEdit ? <Link className="small-context-link" to={editorCreateLink(world, "quest")}>Создать квест</Link> : null} />
      <PageMiniList title="NPC рядом" kicker="Кого играть" icon={UsersRound} items={npcPages} empty="NPC мира появятся здесь после привязки к миру/стране/городу." action={canEdit ? <Link className="small-context-link" to={editorCreateLink(world, "npc")}>Создать NPC</Link> : null} />
      <PageMiniList title="Последние сессии" kicker="Recap" icon={BookOpen} items={sessions} empty="Создай сессию после игры — recap станет памятью кампании." action={canEdit ? <Link className="small-context-link" to={editorCreateLink(world, "session", nextTitle)}>Создать recap</Link> : null} />
      <PageMiniList title="События timeline" kicker="История мира" icon={Clock3} items={timeline} empty="События с year/timelineYear или типом timelineEvent будут здесь." action={canEdit ? <Link className="small-context-link" to={editorCreateLink(world, "timelineEvent")}>Добавить событие</Link> : null} />
      <PageMiniList title="Показать игрокам" kicker="Player handout" icon={Eye} items={playerHandouts} empty="Публичные статьи мира можно быстро открыть как handout для игроков." />
    </section>
  );
}

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

      <WorldGmDesktop world={world} ownedPages={ownedPages} session={session} />

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
