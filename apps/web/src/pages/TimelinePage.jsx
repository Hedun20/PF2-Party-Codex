import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CalendarDays, Clock3, Filter, GitBranch, Link2, MapPin, Search, Sparkles, UserRound } from "lucide-react";
import CodexButton from "../components/ui/CodexButton.jsx";
import { labelCategory } from "../utils/labels.js";

const TYPE_CONFIG = {
  timelineEvent: { label: "Event", icon: Sparkles, className: "event" },
  event: { label: "Event", icon: Sparkles, className: "event" },
  session: { label: "Session", icon: BookOpen, className: "session" },
  sessions: { label: "Session", icon: BookOpen, className: "session" },
  city: { label: "City", icon: MapPin, className: "city" },
  location: { label: "Location", icon: MapPin, className: "location" },
  npc: { label: "NPC", icon: UserRound, className: "npc" },
  character: { label: "Character", icon: UserRound, className: "character" },
  pc: { label: "PC", icon: UserRound, className: "character" },
  faction: { label: "Faction", icon: GitBranch, className: "faction" },
  world: { label: "World", icon: Sparkles, className: "world" }
};

function getYear(page) {
  return page.frontmatter?.year
    || page.frontmatter?.timelineYear
    || page.frontmatter?.date
    || page.frontmatter?.sessionDate
    || page.frontmatter?.era
    || "?";
}

function normalizeType(page) {
  if (page.type === "timelineEvent") return "timelineEvent";
  if (page.category === "sessions" || page.type === "session") return "session";
  if (page.category === "cities" || page.type === "city") return "city";
  if (page.category === "locations" || page.type === "location") return "location";
  if (page.category === "npcs" || page.type === "npc") return "npc";
  if (page.category === "characters" || page.type === "pc" || page.type === "character") return page.type === "pc" ? "pc" : "character";
  if (page.category === "lore/factions" || page.type === "faction") return "faction";
  if (page.category === "worlds" || page.type === "world") return "world";
  return page.type || page.category || "event";
}

function isTimelineCandidate(page) {
  if (page.category === "_guides") return false;
  if (page.category === "_examples" && !page.frontmatter?.year && !page.frontmatter?.timelineYear) return false;
  return page.type === "timelineEvent"
    || page.category === "timeline"
    || page.category === "lore/timeline"
    || page.category === "sessions"
    || page.frontmatter?.year
    || page.frontmatter?.timelineYear
    || page.frontmatter?.date
    || page.frontmatter?.sessionDate;
}

function compact(text = "", limit = 170) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit - 3)}...` : clean;
}

function arrayValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return [String(value)];
}

function slug(value = "") {
  return String(value).toLowerCase().replace(/\.md$/i, "").replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-+|-+$/g, "");
}

function resolveRelatedPages(page, pages) {
  const rawRelated = [
    ...arrayValue(page.frontmatter?.related),
    ...arrayValue(page.frontmatter?.linkedPages),
    ...arrayValue(page.frontmatter?.city),
    ...arrayValue(page.frontmatter?.country),
    ...arrayValue(page.frontmatter?.faction),
    ...arrayValue(page.frontmatter?.world),
    ...(page.links || []).map((link) => link.target || link.label).filter(Boolean)
  ];

  const seen = new Set();
  return rawRelated
    .map((target) => {
      const normalized = slug(target);
      return pages.find((candidate) => (
        slug(candidate.title) === normalized
        || slug(candidate.path) === normalized
        || slug(candidate.path.replace(/\.md$/i, "")) === normalized
      )) || { title: target, path: null, category: "missing", type: "missing" };
    })
    .filter((item) => {
      const key = item.path || item.title;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

function sortTimeline(a, b) {
  const yearCompare = String(a.year).localeCompare(String(b.year), undefined, { numeric: true });
  if (yearCompare !== 0) return yearCompare;
  return a.title.localeCompare(b.title);
}

function getEra(page) {
  return page.frontmatter?.era
    || page.frontmatter?.age
    || page.frontmatter?.chapter
    || page.frontmatter?.arc
    || (String(getYear(page)).match(/^-?\d+$/) ? "Chronicle" : "Undated");
}

function categoryMatchesType(typeKey, filter) {
  if (!filter) return true;
  if (filter === "event") return ["timelineEvent", "event", "session"].includes(typeKey);
  if (filter === "people") return ["npc", "character", "pc"].includes(typeKey);
  if (filter === "places") return ["city", "location", "world"].includes(typeKey);
  return typeKey === filter;
}

export default function TimelinePage({ pages = [], mode = "player", embedded = false, activeWorld = null }) {
  const worlds = useMemo(() => [...new Set(pages.map((page) => page.world || page.frontmatter?.world).filter(Boolean))].sort(), [pages]);
  const [world, setWorld] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [query, setQuery] = useState("");
  const [selectedPath, setSelectedPath] = useState("");
  const [hoveredPath, setHoveredPath] = useState("");

  const timelineItems = useMemo(() => pages
    .filter(isTimelineCandidate)
    .filter((page) => !world || page.world === world || page.frontmatter?.world === world)
    .map((page) => {
      const typeKey = normalizeType(page);
      const relatedPages = resolveRelatedPages(page, pages);
      return {
        ...page,
        typeKey,
        typeConfig: TYPE_CONFIG[typeKey] || TYPE_CONFIG.event,
        year: getYear(page),
        era: getEra(page),
        importance: page.frontmatter?.importance || (page.category === "sessions" ? "session" : "event"),
        relatedPages
      };
    })
    .filter((page) => categoryMatchesType(page.typeKey, typeFilter))
    .filter((page) => {
      if (!query.trim()) return true;
      const needle = query.trim().toLowerCase();
      return [
        page.title,
        page.summary,
        page.world,
        page.category,
        page.importance,
        ...(page.tags || []),
        ...page.relatedPages.map((item) => item.title)
      ].filter(Boolean).join(" ").toLowerCase().includes(needle);
    })
    .sort(sortTimeline)
    .slice(0, 60), [pages, world, typeFilter, query]);

  const activePath = hoveredPath || selectedPath || timelineItems[0]?.path || "";
  const active = timelineItems.find((event) => event.path === activePath) || timelineItems[0];
  const activeRelatedKeys = useMemo(() => new Set((active?.relatedPages || []).flatMap((item) => [slug(item.title), slug(item.path || "")]).filter(Boolean)), [active]);

  const groupedEvents = useMemo(() => {
    const groups = [];
    for (const item of timelineItems) {
      const last = groups[groups.length - 1];
      if (!last || last.era !== item.era) groups.push({ era: item.era, items: [item] });
      else last.items.push(item);
    }
    return groups;
  }, [timelineItems]);

  const stats = useMemo(() => ({
    events: timelineItems.filter((item) => ["timelineEvent", "event", "session"].includes(item.typeKey)).length,
    places: timelineItems.filter((item) => ["city", "location", "world"].includes(item.typeKey)).length,
    people: timelineItems.filter((item) => ["npc", "character", "pc"].includes(item.typeKey)).length,
    linked: timelineItems.reduce((sum, item) => sum + item.relatedPages.filter((link) => link.path).length, 0)
  }), [timelineItems]);

  return (
    <div className={embedded ? "page-stack timeline-embedded" : "page-stack timeline-branch-page"}>
      <header className="list-header timeline-branch-hero article-page-header">
        <div>
          <span className="kicker">{activeWorld ? `Мир: ${activeWorld.title}` : "Living Timeline"}</span>
          <h1>{activeWorld ? `Timeline: ${activeWorld.title}` : (embedded ? "Timeline мира и кампании" : "Древо событий")}</h1>
          <p>{activeWorld ? "События и сессии текущего мира без смешивания со всем Архивом." : "Вертикальный ствол истории: события, сессии, города и персонажи цепляются к одной линии, а hover подсвечивает связи между статьями."}</p>
        </div>
        <div className="timeline-stat-grid" aria-label="Timeline stats">
          <span><strong>{stats.events}</strong> событий</span>
          <span><strong>{stats.people}</strong> персонажей</span>
          <span><strong>{stats.places}</strong> мест</span>
          <span><strong>{stats.linked}</strong> связей</span>
        </div>
      </header>

      <section className="timeline-command-panel" aria-label="Timeline filters">
        <label className="timeline-control timeline-control--search">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по событиям, NPC, городам..." />
        </label>
        {!activeWorld && (
          <label className="timeline-control">
            <Filter size={16} />
            <select value={world} onChange={(event) => setWorld(event.target.value)}>
              <option value="">Все миры</option>
              {worlds.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        )}
        <label className="timeline-control">
          <GitBranch size={16} />
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">Все ветви</option>
            <option value="event">События / сессии</option>
            <option value="people">NPC / персонажи</option>
            <option value="places">Места / миры</option>
            <option value="faction">Фракции</option>
          </select>
        </label>
      </section>

      <section className="timeline-branch-layout">
        <div className="timeline-branch-explorer" style={{ "--timeline-items": Math.max(timelineItems.length, 1) }}>
          {timelineItems.length === 0 && (
            <div className="timeline-empty-state timeline-branch-empty">
              <Clock3 size={30} />
              <strong>Timeline пока пустой</strong>
              <p>Создай статью типа “Событие timeline” или добавь `year`, `timelineYear`, `related`, `world` в frontmatter существующей статьи.</p>
              {mode === "gm" && <CodexButton as={Link} to="/editor"><span>Создать событие</span></CodexButton>}
            </div>
          )}

          {groupedEvents.map((group) => (
            <div key={group.era} className="timeline-era-group">
              <div className="timeline-era-marker">
                <CalendarDays size={16} />
                <span>{group.era}</span>
              </div>
              {group.items.map((event, index) => {
                const Icon = event.typeConfig.icon;
                const side = index % 2 === 0 ? "left" : "right";
                const isActive = active?.path === event.path;
                const isConnected = activeRelatedKeys.has(slug(event.title)) || activeRelatedKeys.has(slug(event.path));
                return (
                  <article
                    key={event.path}
                    className={`timeline-branch-row ${side} ${isActive ? "active" : ""} ${isConnected ? "connected" : ""} timeline-kind-${event.typeConfig.className}`}
                    onMouseEnter={() => setHoveredPath(event.path)}
                    onMouseLeave={() => setHoveredPath("")}
                  >
                    <div className="timeline-branch-card codex-card">
                      <div className="timeline-branch-card-head">
                        <span className="timeline-branch-year">{event.year}</span>
                        <span className="timeline-kind-pill"><Icon size={14} /> {event.typeConfig.label}</span>
                      </div>
                      <h2>{event.title}</h2>
                      <p>{compact(event.summary || event.content || "")}</p>
                      <div className="timeline-branch-meta">
                        <span>{labelCategory(event.category)}</span>
                        <span>{event.importance}</span>
                        {event.world && <span>{event.world}</span>}
                      </div>
                      <div className="timeline-branch-actions">
                        <button type="button" onClick={() => setSelectedPath(event.path)} className="timeline-focus-button">
                          Focus
                        </button>
                        <CodexButton as={Link} to={`/page/${encodeURIComponent(event.path)}`} variant="ghost">
                          <Link2 size={15} /> <span>Open entry</span>
                        </CodexButton>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="timeline-branch-node"
                      onClick={() => setSelectedPath(event.path)}
                      aria-label={`Focus ${event.title}`}
                    >
                      <Icon size={17} />
                    </button>
                    <div className="timeline-branch-line" />
                  </article>
                );
              })}
            </div>
          ))}
        </div>

        <aside className="timeline-focus-dossier codex-card">
          {active ? (
            <>
              <span className="kicker">Фокус ветви</span>
              <h2>{active.title}</h2>
              <p>{compact(active.summary || active.content || "", 260)}</p>
              <div className="timeline-dossier-facts">
                <span><strong>Дата</strong>{active.year}</span>
                <span><strong>Тип</strong>{active.typeConfig.label}</span>
                <span><strong>Раздел</strong>{labelCategory(active.category)}</span>
                <span><strong>Мир</strong>{active.world || active.frontmatter?.world || "—"}</span>
              </div>
              <div className="timeline-constellation">
                <div className="timeline-constellation-head">
                  <GitBranch size={15} />
                  <strong>Связанные статьи</strong>
                </div>
                {(active.relatedPages || []).length > 0 ? active.relatedPages.map((item) => (
                  item.path ? (
                    <Link key={`${active.path}-${item.path}`} to={`/page/${encodeURIComponent(item.path)}`} className="timeline-relation-chip">
                      <span>{labelCategory(item.category)}</span>
                      <strong>{item.title}</strong>
                    </Link>
                  ) : (
                    <span key={`${active.path}-${item.title}`} className="timeline-relation-chip missing">
                      <span>Missing link</span>
                      <strong>{item.title}</strong>
                    </span>
                  )
                )) : <p className="timeline-muted-note">Нет связей. Добавь `related: [...]` или wiki-ссылки в markdown.</p>}
              </div>
              <CodexButton as={Link} to={`/page/${encodeURIComponent(active.path)}`}>
                <BookOpen size={16} /> <span>Открыть статью</span>
              </CodexButton>
            </>
          ) : (
            <div className="timeline-muted-note">Выбери событие, чтобы увидеть dossier.</div>
          )}
        </aside>
      </section>
    </div>
  );
}
