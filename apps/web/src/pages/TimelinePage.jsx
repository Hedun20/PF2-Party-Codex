import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  Eye,
  EyeOff,
  Filter,
  GitBranch,
  History,
  Link2,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles
} from "lucide-react";
import { api } from "../api/client.js";
import EntityDetailPanel from "../components/EntityDetailPanel.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";
import { labelCategory } from "../utils/labels.js";
import { getWorlds } from "../utils/worldContext.js";

function slug(value = "") {
  return String(value).toLowerCase().replace(/\.md$/i, "").replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-+|-+$/g, "");
}

function compact(value = "", limit = 210) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [String(value)];
}

function timelineYear(page = {}) {
  const fm = page.frontmatter || {};
  return fm.year || fm.timelineYear || fm.date || fm.sessionDate || fm.era || "Без даты";
}

function timelineEra(page = {}) {
  const fm = page.frontmatter || {};
  return fm.era || fm.age || fm.chapter || fm.arc || (String(timelineYear(page)).match(/^-?\d+$/) ? "Хроника" : "Без эпохи");
}

function visibilityOf(page = {}) {
  return String(page.visibility || page.frontmatter?.visibility || "public").toLowerCase();
}

function isPlayerVisible(value = "public") {
  return ["public", "revealed", "partyvisible"].includes(String(value).toLowerCase());
}

function isTimelineEntry(page = {}) {
  const fm = page.frontmatter || {};
  return page.type === "timelineEvent"
    || page.category === "timeline"
    || page.category === "lore/timeline"
    || page.category === "sessions"
    || Boolean(fm.year || fm.timelineYear || fm.date || fm.sessionDate);
}

function relationLabels(page = {}) {
  const fm = page.frontmatter || {};
  const links = Array.isArray(page.links) ? page.links.map((item) => item?.label || item?.target).filter(Boolean) : [];
  return [...new Set([
    ...asArray(fm.related), ...asArray(fm.relatedPages), ...asArray(fm.linkedPages), ...links
  ])].slice(0, 8);
}

function normalizeEntry(page = {}) {
  const visibility = visibilityOf(page);
  return {
    id: page.path,
    path: page.path,
    sourceKind: "entry",
    title: page.title || "Без названия",
    summary: page.summary || page.content || "",
    content: page.content || "",
    category: page.category || "timeline",
    type: page.type || "timelineEvent",
    world: page.world || page.frontmatter?.world || "",
    country: page.country || page.frontmatter?.country || "",
    city: page.city || page.frontmatter?.city || "",
    year: timelineYear(page),
    era: timelineEra(page),
    branch: page.frontmatter?.branch || page.frontmatter?.arc || "main",
    importance: page.frontmatter?.importance || (page.category === "sessions" ? "session" : "event"),
    visibility,
    playerVisible: isPlayerVisible(visibility),
    related: relationLabels(page),
    relatedCount: [page.links, page.relatedPages, page.backlinks].reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0),
    updatedAt: page.modifiedAt || page.updatedAt || ""
  };
}

function normalizeMongo(event = {}) {
  const visibility = String(event.visibility || "public").toLowerCase();
  return {
    id: event.id || `${event.title}-${event.dateLabel}`,
    path: "",
    sourceKind: "mongo",
    title: event.title || "Без названия",
    summary: event.description || "",
    content: event.description || "",
    category: "timeline",
    type: "timelineEvent",
    world: event.worldName || event.world || "",
    country: "",
    city: "",
    year: event.dateLabel || event.year || "Без даты",
    era: event.era || event.branch || "Хроника кампании",
    branch: event.branch || "main",
    importance: event.importance || "event",
    visibility,
    playerVisible: isPlayerVisible(visibility),
    related: asArray(event.relatedEntryIds).slice(0, 8),
    relatedCount: Array.isArray(event.relatedEntryIds) ? event.relatedEntryIds.length : 0,
    updatedAt: event.updatedAt || event.createdAt || ""
  };
}

function sortTimeline(left, right) {
  const era = String(left.era).localeCompare(String(right.era), "ru", { numeric: true });
  if (era !== 0) return era;
  const year = String(left.year).localeCompare(String(right.year), "ru", { numeric: true });
  if (year !== 0) return year;
  return left.title.localeCompare(right.title, "ru");
}

function mergeTimelineItems(entryItems, mongoItems) {
  const result = [];
  const positions = new Map();
  for (const item of [...mongoItems, ...entryItems]) {
    const key = `${slug(item.title)}::${slug(item.year)}`;
    const existingIndex = positions.get(key);
    if (existingIndex === undefined) {
      positions.set(key, result.length);
      result.push(item);
    } else if (item.sourceKind === "entry") {
      result[existingIndex] = item;
    }
  }
  return result.sort(sortTimeline);
}

function editorPath(activeWorld) {
  const params = new URLSearchParams({ type: "timelineEvent" });
  if (activeWorld?.title) params.set("world", activeWorld.title);
  return `/editor?${params.toString()}`;
}

function eventKind(item = {}) {
  if (item.category === "sessions" || item.type === "session") return "Сессия";
  if (["city", "location", "world"].includes(item.type)) return "Место";
  if (["npc", "pc", "character"].includes(item.type)) return "Персонаж";
  return "Событие";
}

export default function TimelinePage({ pages = [], mode = "player", embedded = false, activeWorld = null }) {
  const [state, setState] = useState({ loading: true, error: "", events: [] });
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [worldFilter, setWorldFilter] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [playerPreview, setPlayerPreview] = useState(false);
  const [revealMessage, setRevealMessage] = useState("");
  const [revealBusy, setRevealBusy] = useState(false);
  const canManage = mode === "gm";
  const effectivePlayerView = !canManage || playerPreview;

  useEffect(() => {
    let active = true;
    api.timelineEvents()
      .then((data) => {
        if (!active) return;
        const events = Array.isArray(data.timelineEvents) ? data.timelineEvents : Array.isArray(data.events) ? data.events : [];
        setState({ loading: false, error: "", events });
      })
      .catch((error) => {
        if (!active) return;
        setState({ loading: false, error: error.message || "Timeline API недоступен.", events: [] });
      });
    return () => { active = false; };
  }, []);

  const worlds = useMemo(() => [...new Set([
    ...getWorlds(pages).map((world) => world.title).filter(Boolean),
    ...pages.map((page) => page.world || page.frontmatter?.world).filter(Boolean)
  ])].sort((a, b) => a.localeCompare(b, "ru")), [pages]);
  const entryItems = useMemo(() => pages.filter(isTimelineEntry).map(normalizeEntry), [pages]);
  const mongoItems = useMemo(() => state.events.map(normalizeMongo), [state.events]);
  const mergedItems = useMemo(() => mergeTimelineItems(entryItems, mongoItems), [entryItems, mongoItems]);

  const filteredItems = useMemo(() => mergedItems
    .filter((item) => !activeWorld || !item.world || slug(item.world) === slug(activeWorld.title))
    .filter((item) => activeWorld || !worldFilter || slug(item.world) === slug(worldFilter))
    .filter((item) => !effectivePlayerView || item.playerVisible)
    .filter((item) => {
      if (!typeFilter) return true;
      if (typeFilter === "session") return item.category === "sessions" || item.type === "session";
      if (typeFilter === "place") return ["city", "location", "world"].includes(item.type);
      return item.category !== "sessions" && !["city", "location", "world"].includes(item.type);
    })
    .filter((item) => {
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return [item.title, item.summary, item.year, item.era, item.world, item.country, item.city, item.branch].filter(Boolean).join(" ").toLowerCase().includes(needle);
    }), [mergedItems, activeWorld, worldFilter, effectivePlayerView, typeFilter, query]);

  useEffect(() => {
    if (!selectedId && filteredItems[0]?.id) setSelectedId(filteredItems[0].id);
    if (selectedId && !filteredItems.some((item) => item.id === selectedId)) setSelectedId(filteredItems[0]?.id || "");
  }, [filteredItems, selectedId]);

  const selected = filteredItems.find((item) => item.id === selectedId) || filteredItems[0] || null;
  const selectedIndex = selected ? filteredItems.findIndex((item) => item.id === selected.id) : -1;
  const previous = selectedIndex > 0 ? filteredItems[selectedIndex - 1] : null;
  const next = selectedIndex >= 0 && selectedIndex < filteredItems.length - 1 ? filteredItems[selectedIndex + 1] : null;
  const grouped = useMemo(() => {
    const groups = [];
    for (const item of filteredItems) {
      const last = groups[groups.length - 1];
      if (!last || last.era !== item.era) groups.push({ era: item.era, items: [item] });
      else last.items.push(item);
    }
    return groups;
  }, [filteredItems]);

  const stats = useMemo(() => ({
    total: mergedItems.length,
    articles: entryItems.length,
    projected: mongoItems.length,
    player: mergedItems.filter((item) => item.playerVisible).length
  }), [mergedItems, entryItems.length, mongoItems.length]);

  async function revealSelected() {
    if (!selected?.path || !selected.playerVisible) {
      setRevealMessage("Для reveal нужно выбрать публичное событие-статью.");
      return;
    }
    const world = activeWorld?.title || selected.world;
    if (!world) {
      setRevealMessage("Не удалось определить мир события.");
      return;
    }
    setRevealBusy(true);
    setRevealMessage("");
    try {
      await api.revealSet({ world, path: selected.path, note: `Timeline reveal: ${selected.title}` });
      setRevealMessage(`Игрокам показано событие: ${selected.title}`);
    } catch (error) {
      setRevealMessage(error.message || "Reveal не выполнен.");
    } finally {
      setRevealBusy(false);
    }
  }

  const inspectorActions = selected ? <>
    <div className="entity-detail-panel__stepper">
      <button type="button" disabled={!previous} onClick={() => previous && setSelectedId(previous.id)}>← Предыдущее</button>
      <button type="button" disabled={!next} onClick={() => next && setSelectedId(next.id)}>Следующее →</button>
    </div>
    {selected.path ? <CodexButton as={Link} to={`/page/${encodeURIComponent(selected.path)}`} variant="secondary"><Link2 size={15} /><span>Открыть статью</span></CodexButton> : null}
    {canManage && selected.path ? <CodexButton as={Link} to={`/edit/${encodeURIComponent(selected.path)}`} variant="ghost"><Pencil size={15} /><span>Редактировать</span></CodexButton> : null}
  </> : null;

  return (
    <div className={embedded ? "page-stack timeline-embedded" : "page-stack timeline-branch-page timeline2-page"}>
      <header className="list-header timeline-branch-hero article-page-header timeline2-hero"><div><span className="kicker">{activeWorld ? `Мир: ${activeWorld.title}` : "Хроника кампании"}</span><h1>{activeWorld ? `Timeline: ${activeWorld.title}` : "Timeline"}</h1><p>События архива и отдельная Mongo-хронология объединены в одну линию. Выбранная точка подробно раскрывается справа.</p></div><div className="timeline-stat-grid"><span><strong>{stats.total}</strong> всего</span><span><strong>{stats.articles}</strong> статей</span><span><strong>{stats.projected}</strong> API</span><span><strong>{stats.player}</strong> игрокам</span></div></header>

      {canManage ? <section className="timeline2-gm-toolbar codex-card"><div><span className="kicker">GM timeline tools</span><strong>Рабочая хронология мастера</strong><p>Создавай события, проверяй player-safe представление и показывай выбранный момент партии.</p></div><div className="timeline2-toolbar-actions"><CodexButton as={Link} to={editorPath(activeWorld)}><Plus size={16} /><span>Новое событие</span></CodexButton><button type="button" className={`timeline2-toggle ${playerPreview ? "active" : ""}`} onClick={() => setPlayerPreview((value) => !value)}>{playerPreview ? <Eye size={16} /> : <EyeOff size={16} />}{playerPreview ? "Вернуть GM view" : "Preview as Player"}</button><button type="button" className="timeline2-toggle" onClick={revealSelected} disabled={!selected?.path || !selected.playerVisible || revealBusy}><Send size={16} />{revealBusy ? "Показываю..." : "Reveal event"}</button></div></section> : null}

      {state.error ? <div className="status-message danger-message"><AlertTriangle size={16} /><span>{state.error} Статьи timeline всё равно отображаются из архива.</span></div> : null}
      {revealMessage ? <div className="status-message"><span>{revealMessage}</span></div> : null}

      <section className="timeline-command-panel timeline2-command-panel" aria-label="Фильтры timeline">
        <label className="timeline-control timeline-control--search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по событиям, эпохам и мирам..." /></label>
        {!activeWorld ? (
          <label className="timeline-control timeline-control--native-select">
            <Filter size={16} aria-hidden="true" />
            <select aria-label="Фильтр мира timeline" value={worldFilter} onChange={(event) => setWorldFilter(event.target.value)}>
              <option value="">Все миры</option>
              {worlds.map((world) => <option key={world} value={world}>{world}</option>)}
            </select>
          </label>
        ) : null}
        <label className="timeline-control timeline-control--native-select">
          <GitBranch size={16} aria-hidden="true" />
          <select aria-label="Фильтр типа timeline" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">Все типы</option>
            <option value="event">События</option>
            <option value="session">Сессии</option>
            <option value="place">Места</option>
          </select>
        </label>
      </section>

      <section className="timeline-branch-layout timeline2-layout">
        <div className="timeline-branch-explorer timeline2-explorer">
          {state.loading ? <div className="timeline-empty-state"><Clock3 size={30} /><strong>Загрузка timeline...</strong></div> : null}
          {!state.loading && !filteredItems.length ? <div className="timeline-empty-state timeline-branch-empty"><History size={32} /><strong>{effectivePlayerView ? "Для игроков пока нет событий" : "Timeline пока пустой"}</strong><p>{canManage ? "Создай статью типа «Событие timeline» кнопкой выше." : "Мастер ещё не опубликовал события."}</p></div> : null}

          {grouped.map((group) => <section key={group.era} className="timeline-era-group timeline2-era-group"><div className="timeline-era-marker timeline2-era-marker"><CalendarDays size={16} /><span>{group.era}</span></div>{group.items.map((item, index) => <article key={`${item.sourceKind}-${item.id}`} className={`timeline-branch-row ${index % 2 ? "right" : "left"} ${selected?.id === item.id ? "active" : ""} ${item.playerVisible ? "player-visible" : "gm-only"}`}><button type="button" className="timeline-branch-card codex-card timeline2-card" onClick={() => setSelectedId(item.id)}><div className="timeline-branch-card-head"><span className="timeline-branch-year">{item.year}</span><span className="timeline-kind-pill"><Sparkles size={14} /> {eventKind(item)}</span><span className={`timeline2-visibility-pill ${item.playerVisible ? "public" : "gm"}`}>{item.playerVisible ? <Eye size={13} /> : <EyeOff size={13} />}{item.playerVisible ? "Player" : "GM"}</span></div><h2>{item.title}</h2><p>{compact(item.summary)}</p><div className="timeline-branch-meta"><span>{labelCategory(item.category)}</span><span>{item.sourceKind === "entry" ? "Статья" : "Timeline API"}</span>{item.world ? <span>{item.world}</span> : null}{item.relatedCount ? <span>{item.relatedCount} связей</span> : null}</div></button><button type="button" className="timeline-branch-node" onClick={() => setSelectedId(item.id)} aria-label={`Выбрать ${item.title}`}><Sparkles size={17} /></button><div className="timeline-branch-line" /></article>)}</section>)}
        </div>

        <EntityDetailPanel
          className="timeline-inspector timeline2-inspector"
          kicker="Выбранное событие"
          title={selected?.title || ""}
          description={selected?.summary || ""}
          badge={selected ? (selected.playerVisible ? "Игрокам" : "Только GM") : ""}
          facts={selected ? [["Дата", selected.year], ["Эпоха", selected.era], ["Тип", eventKind(selected)], ["Источник", selected.sourceKind === "entry" ? "Статья архива" : "Timeline API"], ["Ветка", selected.branch], ["Связи", selected.relatedCount]] : []}
          location={selected ? [selected.world, selected.country, selected.city].filter(Boolean).join(" · ") : ""}
          related={selected?.related || []}
          actions={inspectorActions}
          emptyIcon={Clock3}
          emptyTitle="Выбери событие"
          emptyText="Справа появятся детали выбранной точки timeline."
        />
      </section>
    </div>
  );
}
