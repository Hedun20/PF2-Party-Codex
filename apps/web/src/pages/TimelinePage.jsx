import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, Filter, Link2 } from "lucide-react";
import CodexButton from "../components/ui/CodexButton.jsx";
import { labelCategory } from "../utils/labels.js";

function getYear(page) {
  return page.frontmatter?.year || page.frontmatter?.timelineYear || page.frontmatter?.date || page.frontmatter?.sessionDate || "?";
}

function isTimelineCandidate(page) {
  return page.type === "timelineEvent"
    || page.category === "lore/timeline"
    || page.frontmatter?.year
    || page.frontmatter?.timelineYear
    || page.category === "sessions";
}

function compact(text = "") {
  return text.length > 150 ? `${text.slice(0, 147)}...` : text;
}

export default function TimelinePage({ pages = [], mode = "player", embedded = false }) {
  const worlds = useMemo(() => [...new Set(pages.map((page) => page.world).filter(Boolean))].sort(), [pages]);
  const [world, setWorld] = useState("");
  const [selectedPath, setSelectedPath] = useState("");

  const events = useMemo(() => pages
    .filter(isTimelineCandidate)
    .filter((page) => !world || page.world === world)
    .map((page) => ({
      ...page,
      year: getYear(page),
      importance: page.frontmatter?.importance || (page.category === "sessions" ? "session" : "event"),
      linkedPages: page.frontmatter?.linkedPages || page.frontmatter?.related || []
    }))
    .sort((a, b) => String(a.year).localeCompare(String(b.year), undefined, { numeric: true }))
    .slice(0, 18), [pages, world]);

  const selected = events.find((event) => event.path === selectedPath) || events[0];

  return (
    <div className={embedded ? "page-stack timeline-embedded" : "page-stack"}>
      <header className="list-header timeline-hero article-page-header">
        <div>
          <span className="kicker">Timeline</span>
          <h1>{embedded ? "Timeline мира и кампании" : "Линия событий"}</h1>
          <p>Большой экран таймлайна: точки-ссылки на статьи, hover-preview, click-focus и фильтр по миру. Полный граф вниз по событию — следующий слой.</p>
        </div>
        <div className="timeline-filter-box">
          <Filter size={16} />
          <select value={world} onChange={(event) => setWorld(event.target.value)}>
            <option value="">Все миры</option>
            {worlds.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </header>

      <section className="timeline-screen-panel">
        <div className="timeline-screen-track" style={{ "--event-count": Math.max(events.length, 1) }}>
          {events.length === 0 && (
            <div className="timeline-empty-state">
              <Clock3 size={28} />
              <strong>Событий пока нет</strong>
              <p>Создай статью типа “Событие timeline” или добавь `year` / `timelineYear` в frontmatter существующей статьи.</p>
              {mode === "gm" && <CodexButton as={Link} to="/editor"><span>Создать событие</span></CodexButton>}
            </div>
          )}

          {events.map((event, index) => (
            <button
              type="button"
              key={event.path}
              className={`timeline-event-node ${index % 2 ? "below" : "above"} ${selected?.path === event.path ? "active" : ""}`}
              style={{ left: `${events.length === 1 ? 50 : (index / (events.length - 1)) * 96 + 2}%` }}
              onClick={() => setSelectedPath(event.path)}
            >
              <span className="timeline-event-dot" />
              <article className="codex-card timeline-hover-card">
                <span>{event.year}</span>
                <strong>{event.title}</strong>
                <p>{compact(event.summary || event.content || "")}</p>
              </article>
            </button>
          ))}
        </div>
      </section>

      {selected && (
        <section className="codex-card timeline-focus-panel">
          <div>
            <span className="kicker">Фокус события</span>
            <h2>{selected.title}</h2>
            <p>{selected.summary}</p>
            <div className="tag-row">
              <span>{selected.year}</span>
              <span>{labelCategory(selected.category)}</span>
              <span>{selected.importance}</span>
            </div>
          </div>
          <div className="timeline-focus-links">
            <CodexButton as={Link} to={`/page/${encodeURIComponent(selected.path)}`}><Link2 size={16} /> <span>Открыть статью</span></CodexButton>
            {(selected.linkedPages || []).slice(0, 8).map((item) => <span key={item}>{item}</span>)}
          </div>
        </section>
      )}
    </div>
  );
}
