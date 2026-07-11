import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Clock3,
  Eye,
  EyeOff,
  Filter,
  GitBranch,
  Link2,
  MapPin,
  MonitorPlay,
  Plus,
  RadioTower,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  UserRound
} from "lucide-react";
import { api } from "../api/client.js";
import CodexButton from "../components/ui/CodexButton.jsx";
import { labelCategory } from "../utils/labels.js";
import { worldRoute } from "../utils/worldContext.js";

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

function getVisibility(page) {
  return String(page.visibility || page.frontmatter?.visibility || "public").toLowerCase();
}

function isPlayerVisible(page) {
  return getVisibility(page) === "public" && page.type !== "secret";
}

function hasSecretText(page) {
  const content = `${page.content || ""}\n${page.frontmatter?.gmSecrets || ""}`;
  return /\[secret\]/i.test(content) || /##\s*GM\s*Secrets/i.test(content) || getVisibility(page) === "gm";
}

function resolveRelatedPages(page, pages) {
  const rawRelated = [
    ...arrayValue(page.frontmatter?.related),
    ...arrayValue(page.frontmatter?.relatedPages),
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

function editorPathForWorld(activeWorld, type = "timelineEvent") {
  const params = new URLSearchParams();
  if (activeWorld?.title) params.set("world", activeWorld.title);
  if (type) params.set("type", type);
  const query = params.toString();
  return query ? `/editor?${query}` : "/editor";
}

function getTimelineWorld(activeWorld, active) {
  return activeWorld?.title || active?.world || active?.frontmatter?.world || "";
}

function playerUrlForWorld(activeWorld, active) {
  if (activeWorld) return `${worldRoute(activeWorld)}/player`;
  const worldName = active?.world || active?.frontmatter?.world;
  return worldName ? `/world/${encodeURIComponent(slug(worldName) || worldName)}/player` : "/";
}

function mongoTimelineItem(event = {}) {
  const visibility = String(event.visibility || "public").toLowerCase();
  const typeConfig = TYPE_CONFIG.timelineEvent;
  return {
    id: event.id,
    path: `mongo-timeline:${event.id || event.title || "event"}`,
    sourceKind: "mongo",
    typeKey: "timelineEvent",
    typeConfig,
    title: event.title || "Untitled event",
    summary: event.description || "",
    content: event.description || "",
    gmNotes: event.gmNotes || "",
    year: event.dateLabel || "?",
    dateLabel: event.dateLabel || "",
    era: event.era || event.branch || "Campaign",
    branch: event.branch || "main",
    importance: event.branch || "event",
    category: "timeline",
    world: "",
    frontmatter: {},
    tags: [],
    relatedPages: [],
    visibility,
    playerVisible: ["public", "revealed"].includes(visibility),
    hasSecrets: Boolean(event.gmNotes),
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
}

export default function TimelinePage({ pages = [], mode = "player", embedded = false, activeWorld = null }) {
  const worlds = useMemo(() => [...new Set(pages.map((page) => page.world || page.frontmatter?.world).filter(Boolean))].sort(), [pages]);
  const [world, setWorld] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [query, setQuery] = useState("");
  const [selectedPath, setSelectedPath] = useState("");
  const [hoveredPath, setHoveredPath] = useState("");
  const [playerPreview, setPlayerPreview] = useState(false);
  const [revealBusy, setRevealBusy] = useState(false);
  const [revealMessage, setRevealMessage] = useState("");
  const [timelineState, setTimelineState] = useState({ loading: true, error: "", events: null, role: "" });

  useEffect(() => {
    let active = true;
    setTimelineState({ loading: true, error: "", events: null, role: "" });
    api.timelineEvents()
      .then((data) => {
        if (!active) return;
        const events = Array.isArray(data.timelineEvents) ? data.timelineEvents : Array.isArray(data.events) ? data.events : [];
        setTimelineState({ loading: false, error: "", events, role: data.role || "" });
      })
      .catch((error) => {
        if (!active) return;
        setTimelineState({ loading: false, error: error.message || "Timeline API failed.", events: null, role: "" });
      });
    return () => {
      active = false;
    };
  }, []);

  const canUseGmTools = mode === "gm";
  const effectivePlayerView = mode !== "gm" || playerPreview;

  const mongoTimelineItems = useMemo(() => (timelineState.events || [])
    .map(mongoTimelineItem)
    .filter((event) => categoryMatchesType(event.typeKey, typeFilter))
    .filter((event) => {
      if (!query.trim()) return true;
      const needle = query.trim().toLowerCase();
      return [
        event.title,
        event.summary,
        event.dateLabel,
        event.era,
        event.branch,
        event.visibility
      ].filter(Boolean).join(" ").toLowerCase().includes(needle);
    })
    .sort(sortTimeline), [timelineState.events, typeFilter, query]);

  const entryTimelineItems = useMemo(() => pages
    .filter(isTimelineCandidate)
    .filter((page) => !world || page.world === world || page.frontmatter?.world === world)
    .map((page) => {
      const typeKey = normalizeType(page);
      const relatedPages = resolveRelatedPages(page, pages);
      const visibility = getVisibility(page);
      return {
        ...page,
        sourceKind: "entry",
        typeKey,
        typeConfig: TYPE_CONFIG[typeKey] || TYPE_CONFIG.event,
        year: getYear(page),
        era: getEra(page),
        branch: page.frontmatter?.branch || page.frontmatter?.arc || "entry",
        importance: page.frontmatter?.importance || (page.category === "sessions" ? "session" : "event"),
        relatedPages,
        visibility,
        playerVisible: isPlayerVisible(page),
        hasSecrets: hasSecretText(page)
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
        page.visibility,
        ...(page.tags || []),
        ...page.relatedPages.map((item) => item.title)
      ].filter(Boolean).join(" ").toLowerCase().includes(needle);
    })
    .sort(sortTimeline), [pages, world, typeFilter, query]);

  const usingMongoTimeline = Array.isArray(timelineState.events) && !timelineState.error;
  const usingEntryFallback = Boolean(timelineState.error && entryTimelineItems.length);
  const allTimelineItems = usingMongoTimeline ? mongoTimelineItems : usingEntryFallback ? entryTimelineItems : [];

  const timelineItems = useMemo(() => allTimelineItems
    .filter((page) => !effectivePlayerView || page.playerVisible)
    .slice(0, 80), [allTimelineItems, effectivePlayerView]);

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
    linked: timelineItems.reduce((sum, item) => sum + item.relatedPages.filter((link) => link.path).length, 0),
    player: allTimelineItems.filter((item) => item.playerVisible).length,
    gm: allTimelineItems.filter((item) => !item.playerVisible).length,
    secrets: allTimelineItems.filter((item) => item.hasSecrets).length
  }), [timelineItems, allTimelineItems]);

  const readiness = useMemo(() => {
    if (timelineItems.length === 0) return { tone: "empty", title: "Timeline пустой", text: "Создай первое событие или session recap в текущем мире." };
    if (effectivePlayerView && timelineItems.length === 0) return { tone: "warning", title: "Игрокам нечего показать", text: "Нет player-visible событий." };
    if (stats.gm > 0 && !effectivePlayerView) return { tone: "mixed", title: "Смешанная ветка", text: `${stats.gm} GM-only событий скрываются от игроков. Проверь Preview as Player перед reveal.` };
    return { tone: "safe", title: "Player-safe timeline готов", text: "В player-preview остаются только публичные события и сессии." };
  }, [timelineItems.length, effectivePlayerView, stats.gm]);

  async function revealActiveEvent() {
    if (!active || active.sourceKind === "mongo" || !active.playerVisible) {
      setRevealMessage("Это событие нельзя показать игрокам: оно GM-only или secret.");
      return;
    }
    const worldName = getTimelineWorld(activeWorld, active);
    if (!worldName) {
      setRevealMessage("Не могу определить мир для reveal. Открой timeline из конкретного мира.");
      return;
    }
    setRevealBusy(true);
    setRevealMessage("");
    try {
      await api.revealSet({ world: worldName, path: active.path, note: `Timeline reveal: ${active.title}` });
      setRevealMessage(`Показываю игрокам: ${active.title}`);
    } catch (error) {
      setRevealMessage(error.message || "Reveal не сработал. Перезапусти локальный сервер и попробуй снова.");
    } finally {
      setRevealBusy(false);
    }
  }

  return (
    <div className={embedded ? "page-stack timeline-embedded" : "page-stack timeline-branch-page timeline2-page"}>
      <header className="list-header timeline-branch-hero article-page-header timeline2-hero">
        <div>
          <span className="kicker">{activeWorld ? `Мир: ${activeWorld.title}` : "Living Timeline"}</span>
          <h1>{activeWorld ? `Timeline: ${activeWorld.title}` : (embedded ? "Timeline мира и кампании" : "Древо событий")}</h1>
          <p>{activeWorld ? "События, сессии, NPC и локации текущего мира без смешивания со всем Архивом." : "Вертикальный ствол истории: события, сессии, города и персонажи цепляются к одной линии, а hover подсвечивает связи между статьями."}</p>
        </div>
        <div className="timeline-stat-grid" aria-label="Timeline stats">
          <span><strong>{stats.events}</strong> событий</span>
          <span><strong>{stats.people}</strong> персонажей</span>
          <span><strong>{stats.places}</strong> мест</span>
          <span><strong>{stats.linked}</strong> связей</span>
        </div>
      </header>

      {canUseGmTools && (
        <section className="timeline2-gm-toolbar codex-card">
          <div>
            <span className="kicker">GM timeline tools</span>
            <strong>История мира как рабочий слой мастера</strong>
            <p>Создавай события, проверяй player-safe ветку и показывай выбранный момент игрокам без риска утечки секретов.</p>
          </div>
          <div className="timeline2-toolbar-actions">
            <CodexButton as={Link} to={editorPathForWorld(activeWorld, "timelineEvent")}>
              <Plus size={16} /> <span>Новое событие</span>
            </CodexButton>
            <button type="button" className={`timeline2-toggle ${playerPreview ? "active" : ""}`} onClick={() => setPlayerPreview((value) => !value)}>
              {playerPreview ? <Eye size={16} /> : <EyeOff size={16} />}
              {playerPreview ? "GM view" : "Preview as Player"}
            </button>
            <button type="button" className="timeline2-toggle" onClick={revealActiveEvent} disabled={!active || active.sourceKind === "mongo" || revealBusy || !active.playerVisible}>
              <Send size={16} /> {revealBusy ? "Показываю..." : "Reveal event"}
            </button>
            {(activeWorld || active) && (
              <Link className="timeline2-toggle timeline2-link-button" to={playerUrlForWorld(activeWorld, active)}>
                <MonitorPlay size={16} /> Player view
              </Link>
            )}
          </div>
        </section>
      )}

      <section className={`timeline2-readiness ${readiness.tone}`}>
        <div>
          {readiness.tone === "safe" ? <Eye size={18} /> : <ShieldAlert size={18} />}
          <strong>{readiness.title}</strong>
          <p>{readiness.text}</p>
        </div>
        <div className="timeline2-readiness-stats">
          <span><Eye size={14} /> {stats.player} player-visible</span>
          <span><EyeOff size={14} /> {stats.gm} GM-only</span>
          <span><AlertTriangle size={14} /> {stats.secrets} с secret-блоками</span>
        </div>
      </section>

      {revealMessage && <div className={`status-message ${revealMessage.includes("нельзя") || revealMessage.includes("Не могу") ? "danger-message" : ""}`}>{revealMessage}</div>}

      {timelineState.loading && (
        <section className="codex-card workspace-status-card">
          <Clock3 size={22} />
          <span className="kicker">Loading timeline</span>
          <p>Fetching timeline events from Mongo.</p>
        </section>
      )}

      {timelineState.error && usingEntryFallback && (
        <section className="codex-card workspace-status-card">
          <AlertTriangle size={22} />
          <span className="kicker">Entry-backed view</span>
          <p>The dedicated timeline projection could not be loaded. Showing timeline articles from the same campaign database.</p>
        </section>
      )}

      {timelineState.error && !usingEntryFallback && (
        <section className="codex-card workspace-status-card">
          <AlertTriangle size={22} />
          <span className="kicker">Timeline unavailable</span>
          <p>{timelineState.error}</p>
        </section>
      )}

      <section className="timeline-command-panel timeline2-command-panel" aria-label="Timeline filters">
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

      <section className="timeline2-branch-tabs" aria-label="Timeline branch shortcuts">
        {[
          ["", "Все ветви"],
          ["event", "События"],
          ["people", "Люди"],
          ["places", "Места"],
          ["faction", "Фракции"]
        ].map(([value, label]) => (
          <button key={value || "all"} type="button" className={typeFilter === value ? "active" : ""} onClick={() => setTypeFilter(value)}>
            {label}
          </button>
        ))}
      </section>

      <section className="timeline-branch-layout timeline2-layout">
        <div className={`timeline-branch-explorer timeline2-explorer ${effectivePlayerView ? "player-preview" : "gm-preview"}`} style={{ "--timeline-items": Math.max(timelineItems.length, 1) }}>
          {!timelineState.loading && timelineItems.length === 0 && (
            <div className="timeline-empty-state timeline-branch-empty">
              <Clock3 size={30} />
              <strong>{effectivePlayerView ? "Player timeline пустой" : "Timeline пока пустой"}</strong>
              <p>{usingMongoTimeline ? "No timeline events are available for this campaign yet." : effectivePlayerView ? "No player-visible timeline articles are available." : "No entry-backed timeline articles are available."}</p>
            </div>
          )}

          {groupedEvents.map((group) => (
            <div key={group.era} className="timeline-era-group timeline2-era-group">
              <div className="timeline-era-marker timeline2-era-marker">
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
                    className={`timeline-branch-row ${side} ${isActive ? "active" : ""} ${isConnected ? "connected" : ""} ${event.playerVisible ? "player-visible" : "gm-only"} timeline-kind-${event.typeConfig.className}`}
                    onMouseEnter={() => setHoveredPath(event.path)}
                    onMouseLeave={() => setHoveredPath("")}
                  >
                    <div className="timeline-branch-card codex-card timeline2-card">
                      <div className="timeline-branch-card-head">
                        <span className="timeline-branch-year">{event.year}</span>
                        <span className="timeline-kind-pill"><Icon size={14} /> {event.typeConfig.label}</span>
                        <span className={`timeline2-visibility-pill ${event.playerVisible ? "public" : "gm"}`}>
                          {event.playerVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                          {event.playerVisible ? "Player" : "GM"}
                        </span>
                      </div>
                      <h2>{event.title}</h2>
                      <p>{compact(event.summary || event.content || "")}</p>
                      <div className="timeline-branch-meta">
                        <span>{labelCategory(event.category)}</span>
                        <span>{event.importance}</span>
                        {event.world && <span>{event.world}</span>}
                        {event.relatedPages?.length > 0 && <span>{event.relatedPages.length} связей</span>}
                      </div>
                      <div className="timeline-branch-actions">
                        <button type="button" onClick={() => setSelectedPath(event.path)} className="timeline-focus-button">
                          Focus
                        </button>
                        {event.sourceKind !== "mongo" && (
                          <CodexButton as={Link} to={`/page/${encodeURIComponent(event.path)}`} variant="ghost">
                            <Link2 size={15} /> <span>Open entry</span>
                          </CodexButton>
                        )}
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

        <aside className="timeline-focus-dossier codex-card timeline2-dossier">
          {active ? (
            <>
              <span className="kicker">Фокус ветви</span>
              <h2>{active.title}</h2>
              <p>{compact(active.summary || active.content || "", 260)}</p>
              {active.gmNotes && <p>{compact(active.gmNotes, 220)}</p>}
              <div className="timeline2-dossier-status">
                <span className={active.playerVisible ? "public" : "gm"}>{active.playerVisible ? <Eye size={14} /> : <EyeOff size={14} />}{active.playerVisible ? "Можно игрокам" : "GM-only"}</span>
                {active.hasSecrets && <span className="secret"><ShieldAlert size={14} /> есть секреты</span>}
              </div>
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
                )) : <p className="timeline-muted-note">Нет связей. Добавь связанные статьи через Structured Article Editor.</p>}
              </div>
              <div className="timeline2-dossier-actions">
                {active.sourceKind !== "mongo" && (
                  <CodexButton as={Link} to={`/page/${encodeURIComponent(active.path)}`}>
                    <BookOpen size={16} /> <span>Открыть статью</span>
                  </CodexButton>
                )}
                {canUseGmTools && active.sourceKind !== "mongo" && <CodexButton as={Link} to={`/edit/${encodeURIComponent(active.path)}`} variant="ghost"><span>Редактировать</span></CodexButton>}
                {canUseGmTools && <button type="button" className="timeline2-toggle" onClick={revealActiveEvent} disabled={active.sourceKind === "mongo" || !active.playerVisible || revealBusy}><RadioTower size={15} /> Reveal</button>}
              </div>
            </>
          ) : (
            <div className="timeline-muted-note">Выбери событие, чтобы увидеть dossier.</div>
          )}
        </aside>
      </section>
    </div>
  );
}
