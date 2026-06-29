import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CalendarDays, ClipboardCopy, Eye, ImageIcon, MapPinned, MonitorPlay, NotebookPen, Radio, RadioTower, ScrollText, Sparkles, Swords, UserRound, UsersRound, XCircle } from "lucide-react";
import { api } from "../api/client.js";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";
import { getWorldOwnedPages, isWorldPage, resolveWorldBySlug, worldRoute } from "../utils/worldContext.js";
import { labelCategory } from "../utils/labels.js";
import { usePlayerCharacters } from "../utils/playerCharacters.js";

function assetUrl(path = "") {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith("/api/assets/") ? path : `/api/assets/${String(path).replace(/^images\//, "")}`;
}

function compactText(text = "", limit = 140) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "Описание пока не заполнено.";
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function playerUrl(world) {
  if (typeof window === "undefined") return `${worldRoute(world)}/player`;
  return `${window.location.origin}${worldRoute(world)}/player`;
}

function pageDateValue(page) {
  return page?.frontmatter?.sessionDate || page?.frontmatter?.date || page?.frontmatter?.year || page?.frontmatter?.timelineYear || page?.mtime || "";
}

function sortByDateDesc(a, b) {
  return String(pageDateValue(b)).localeCompare(String(pageDateValue(a)));
}

function isActiveQuest(page) {
  if (page?.category !== "quests" && page?.type !== "quest") return false;
  return !/^(done|completed|complete|closed|failed|archived|cancelled|canceled)/i.test(String(page?.frontmatter?.status || page?.status || ""));
}

function isTimelineLike(page) {
  return page?.type === "timelineEvent" || page?.category === "timeline" || page?.frontmatter?.year || page?.frontmatter?.timelineYear;
}

function publicWorldPages(pages, world) {
  if (!world) return [];
  return getWorldOwnedPages(pages, world).filter((page) => page.path !== world.path && !isWorldPage(page) && page.visibility === "public");
}

function RevealPreview({ active, pages = [], emptyTitle = "Ничего не показано" }) {
  if (!active) {
    return (
      <section className="codex-card reveal-preview reveal-preview-empty">
        <div className="reveal-empty-orb"><Radio size={28} /></div>
        <h2>{emptyTitle}</h2>
        <p>Когда GM нажмёт Reveal, здесь появится player-safe карточка: изображение, краткое описание и публичный текст без GM-секретов.</p>
      </section>
    );
  }

  const image = assetUrl(active.image);
  return (
    <section className="codex-card reveal-preview reveal-preview-live">
      <div className="reveal-preview-head">
        <span className="kicker">Сейчас показано</span>
        <strong>{labelCategory(active.category)}</strong>
      </div>
      {image ? <img className="reveal-preview-image" src={image} alt={active.title} /> : <div className="reveal-preview-image reveal-preview-image-empty"><ImageIcon size={36} /></div>}
      <div className="reveal-preview-body">
        <h1>{active.title}</h1>
        <p>{active.summary || "Описание пока не заполнено."}</p>
        {active.note && <blockquote>{active.note}</blockquote>}
        <div className="tag-row">{(active.tags || []).slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div>
        {active.content && <MarkdownViewer content={active.content} pages={pages} canEdit={false} />}
      </div>
    </section>
  );
}

function HandoutCard({ page, activePath, onReveal, disabled }) {
  const image = assetUrl(page.handoutImage || page.avatarImage || page.mapImage || page.image || page.tokenImage || page.frontmatter?.handoutImage || page.frontmatter?.avatarImage);
  const isActive = activePath === page.path;
  return (
    <article className={`codex-card reveal-handout-card ${isActive ? "is-active" : ""}`}>
      {image ? <img src={image} alt="" /> : <div className="reveal-handout-card-icon"><Eye size={24} /></div>}
      <div className="reveal-handout-card-body">
        <span className="kicker">{labelCategory(page.category)}</span>
        <h3>{page.title}</h3>
        <p>{compactText(page.summary || page.frontmatter?.summary)}</p>
      </div>
      <div className="reveal-handout-card-actions">
        <CodexButton as={Link} to={`/page/${encodeURIComponent(page.path)}`} variant="ghost" size="sm"><BookOpen size={14} /> Открыть</CodexButton>
        <CodexButton type="button" onClick={() => onReveal(page)} disabled={disabled} size="sm"><RadioTower size={14} /> {isActive ? "Показано" : "Reveal"}</CodexButton>
      </div>
    </article>
  );
}

function PortalList({ title, kicker, icon: Icon, items = [], empty, action }) {
  return (
    <section className="codex-card player-portal-panel">
      <div className="player-portal-panel-head">
        <div>
          <span className="kicker">{kicker}</span>
          <h2>{title}</h2>
        </div>
        {Icon && <Icon size={20} />}
      </div>
      {items.length ? (
        <div className="player-portal-list">
          {items.map((page) => (
            <Link key={page.path} to={`/page/${encodeURIComponent(page.path)}`}>
              <strong>{page.title}</strong>
              <span>{compactText(page.summary || page.frontmatter?.summary, 110)}</span>
            </Link>
          ))}
        </div>
      ) : <p className="player-portal-empty">{empty}</p>}
      {action}
    </section>
  );
}

function NotesPortalWidget({ world }) {
  return (
    <section className="codex-card player-portal-notes player-portal-notes-widget">
      <div className="player-portal-panel-head">
        <div>
          <span className="kicker">Personal notebook</span>
          <h2>Заметки</h2>
        </div>
        <NotebookPen size={20} />
      </div>
      <p>Блокнот находится на отдельной странице Notes. Там можно вести личные записи и привязывать их к статьям, NPC, картам или миру.</p>
      <div className="player-portal-note-actions">
        <Link className="small-context-link" to="/notes">Открыть Notes</Link>
        {world && <Link className="small-context-link" to={`/notes?article=${encodeURIComponent(world.path)}`}>Заметка о мире</Link>}
      </div>
    </section>
  );
}

function CharactersPortalWidget() {
  const { characters, publicCharacters } = usePlayerCharacters();
  const active = characters[0];
  return (
    <section className="codex-card player-portal-panel player-portal-characters-widget">
      <div className="player-portal-panel-head">
        <div>
          <span className="kicker">Character sheet</span>
          <h2>Персонаж</h2>
        </div>
        <UserRound size={20} />
      </div>
      {active ? (
        <div className="portal-character-card">
          <strong>{active.name}</strong>
          <span>{[active.ancestry, active.className].filter(Boolean).join(" · ") || "PF2e персонаж"} · уровень {active.level || 1}</span>
          <p>{active.isVisibleToParty ? (active.publicSummary || "Краткая карточка открыта партии.") : "Краткая карточка скрыта от партии."}</p>
        </div>
      ) : <p className="player-portal-empty">Создай лист персонажа и реши, что показать GM или партии.</p>}
      <div className="player-portal-note-actions">
        <Link className="small-context-link" to="/characters">Открыть Characters</Link>
        {publicCharacters.length > 0 && <span className="small-context-static">{publicCharacters.length} видно партии</span>}
      </div>
    </section>
  );
}

export function PlayerPortalView({ pages = [] }) {
  const { worldSlug } = useParams();
  const world = resolveWorldBySlug(pages, worldSlug);
  const [reveal, setReveal] = useState(null);

  useEffect(() => {
    if (!world) return;
    let alive = true;
    const load = () => api.revealGet(world.title).then((data) => alive && setReveal(data.reveal)).catch(() => {});
    load();
    const timer = window.setInterval(load, 3500);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [world?.title]);

  const visiblePages = useMemo(() => publicWorldPages(pages, world), [pages, world]);
  const handouts = useMemo(() => visiblePages.slice(0, 6), [visiblePages]);
  const maps = useMemo(() => visiblePages.filter((page) => page.mapImage).slice(0, 4), [visiblePages]);
  const quests = useMemo(() => visiblePages.filter(isActiveQuest).slice(0, 4), [visiblePages]);
  const timeline = useMemo(() => visiblePages.filter(isTimelineLike).sort(sortByDateDesc).slice(0, 4), [visiblePages]);

  if (!world) {
    return (
      <div className="page-stack">
        <section className="hero-panel world-missing-panel">
          <span className="kicker">Player Portal</span>
          <h1>Мир не найден</h1>
          <p>Игроки открывают портал из конкретного мира, чтобы видеть только разрешённые материалы этой кампании.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack player-portal-page">
      <section className="hero-panel reveal-hero reveal-player-hero player-portal-hero">
        <div>
          <span className="kicker">Player Portal</span>
          <h1>{world.title}: экран игрока</h1>
          <p>Здесь собраны только player-visible материалы этого мира: текущий reveal от GM, публичные статьи, карты, timeline, личные заметки и персонаж игрока.</p>
          <div className="player-portal-quicklinks">
            <Link to={`${worldRoute(world)}/maps`}><MapPinned size={16} /> Карты</Link>
            <Link to={`${worldRoute(world)}/timeline`}><CalendarDays size={16} /> Timeline</Link>
            <Link to={`/page/${encodeURIComponent(world.path)}`}><BookOpen size={16} /> Статья мира</Link>
            <Link to="/notes"><NotebookPen size={16} /> Notes</Link>
            <Link to="/characters"><UserRound size={16} /> Characters</Link>
          </div>
        </div>
        <div className="reveal-live-badge"><MonitorPlay size={20} /> {reveal?.active ? "GM показывает материал" : "Ожидаем reveal от GM"}</div>
      </section>

      <section className="player-portal-grid player-portal-grid-expanded">
        <div className="player-portal-main">
          <RevealPreview active={reveal?.active} pages={pages} emptyTitle="GM пока ничего не показал" />
          <PortalList title="Публичные материалы" kicker="Allowed lore" icon={Eye} items={handouts} empty="GM ещё не опубликовал handouts для этого мира." />
        </div>
        <div className="player-portal-side-stack">
          <CharactersPortalWidget />
          <NotesPortalWidget world={world} />
        </div>
      </section>

      <section className="player-portal-panels">
        <PortalList title="Известные квесты" kicker="Party goals" icon={Swords} items={quests} empty="Публичных активных квестов пока нет." />
        <PortalList title="Карты" kicker="Where to go" icon={MapPinned} items={maps} empty="Публичных карт пока нет." action={<Link className="small-context-link" to={`${worldRoute(world)}/maps`}>Все карты</Link>} />
        <PortalList title="Timeline" kicker="What happened" icon={ScrollText} items={timeline} empty="Публичных событий timeline пока нет." action={<Link className="small-context-link" to={`${worldRoute(world)}/timeline`}>Вся timeline</Link>} />
      </section>
    </div>
  );
}

export default function PlayerRevealPage({ pages = [] }) {
  const { worldSlug } = useParams();
  const world = resolveWorldBySlug(pages, worldSlug);
  const [reveal, setReveal] = useState(null);
  const [message, setMessage] = useState("");
  const [busyPath, setBusyPath] = useState("");
  const [copied, setCopied] = useState(false);

  const handouts = useMemo(() => {
    if (!world) return [];
    return publicWorldPages(pages, world).sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.title.localeCompare(b.title));
  }, [pages, world]);

  useEffect(() => {
    if (!world) return;
    let alive = true;
    const load = () => api.revealGet(world.title).then((data) => alive && setReveal(data.reveal)).catch(() => {});
    load();
    const timer = window.setInterval(load, 4000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [world?.title]);

  if (!world) {
    return (
      <div className="page-stack">
        <section className="hero-panel world-missing-panel">
          <span className="kicker">Player Reveal</span>
          <h1>Мир не найден</h1>
          <p>Reveal открывается из конкретного мира, чтобы не смешивать handouts разных кампаний.</p>
          <CodexButton as={Link} to="/category/worlds" variant="secondary"><ArrowLeft size={16} /> К списку миров</CodexButton>
        </section>
      </div>
    );
  }

  async function revealPage(page) {
    setBusyPath(page.path);
    setMessage("");
    try {
      const data = await api.revealSet({ world: world.title, path: page.path });
      setReveal(data.reveal);
      setMessage(`Показано игрокам: ${page.title}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyPath("");
    }
  }

  async function clearReveal() {
    setMessage("");
    try {
      const data = await api.revealClear(world.title);
      setReveal(data.reveal);
      setMessage("Экран игроков очищен.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function copyPlayerLink() {
    const link = playerUrl(world);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const activePath = reveal?.active?.path || "";
  const messageIsDanger = /нельзя|ошиб|access|forbidden/i.test(message);

  return (
    <div className="page-stack player-reveal-page">
      <section className="hero-panel reveal-hero">
        <div>
          <span className="kicker">Player Reveal / Handout Mode</span>
          <h1>{world.title}: показать игрокам</h1>
          <p>GM выбирает одну public/player-safe карточку, а игроки видят её на отдельном portal-экране. Секреты и GM-only материалы не отправляются в player API.</p>
          <div className="world-mode-actions">
            <CodexButton as={Link} to={worldRoute(world)} variant="secondary"><ArrowLeft size={16} /> Назад к миру</CodexButton>
            <CodexButton as={Link} to={`${worldRoute(world)}/player`} variant="ghost"><UsersRound size={16} /> Player portal</CodexButton>
            <CodexButton type="button" variant="ghost" onClick={copyPlayerLink}><ClipboardCopy size={16} /> {copied ? "Ссылка скопирована" : "Скопировать LAN link"}</CodexButton>
            <CodexButton type="button" variant="danger" onClick={clearReveal}><XCircle size={16} /> Очистить экран</CodexButton>
          </div>
        </div>
        <div className="reveal-status-card codex-card">
          <RadioTower size={25} />
          <strong>{reveal?.active ? "Сейчас показывается" : "Reveal пуст"}</strong>
          <span>{reveal?.active?.title || "Выбери handout ниже"}</span>
        </div>
      </section>

      {message && <div className={`status-message ${messageIsDanger ? "danger-message" : ""}`}>{message}</div>}

      <section className="reveal-layout-grid">
        <RevealPreview active={reveal?.active} pages={pages} />
        <section className="codex-card reveal-safety-card">
          <div className="session-panel-head">
            <div>
              <span className="kicker">Player-safe guard</span>
              <h2>Почему это безопаснее</h2>
            </div>
            <Sparkles size={20} />
          </div>
          <p>Reveal берёт статью через player-mode API. GM-only и secret материалы не попадают на экран игроков.</p>
          <ul className="session-tips-list">
            <li><Eye size={15} /> Показывай только public-материалы.</li>
            <li><MonitorPlay size={15} /> Игроки открывают Player portal и ждут reveal.</li>
            <li><UsersRound size={15} /> Позже сюда лягут player accounts и персонажи.</li>
          </ul>
        </section>
      </section>

      <section className="section-band reveal-handout-band">
        <div className="section-title-row">
          <div>
            <span className="kicker">Public handouts</span>
            <h2>Что можно показать сейчас</h2>
          </div>
          <span>{handouts.length} player-safe карточек</span>
        </div>
        {handouts.length ? (
          <div className="reveal-handout-grid">
            {handouts.map((page) => <HandoutCard key={page.path} page={page} activePath={activePath} onReveal={revealPage} disabled={busyPath === page.path} />)}
          </div>
        ) : <p className="empty-copy">Публичных handouts в этом мире пока нет.</p>}
      </section>
    </div>
  );
}
