import { Link } from "react-router-dom";
import { Clock3, MapPin, Sparkles } from "lucide-react";
import { minorWorldsCard, worldCards } from "../data/worlds.js";

function toPage(path) {
  return `/page/${encodeURIComponent(path)}`;
}

function WorldCard({ world }) {
  return (
    <Link className="timeline-card" to={toPage(world.path)}>
      <span className="timeline-year">{world.year}</span>
      <div>
        <span className="world-kind">{world.kind}</span>
        <h3>{world.title}</h3>
        <p>{world.summary}</p>
      </div>
      <div className="world-meta">
        <span>{world.era}</span>
        <MapPin size={15} />
      </div>
    </Link>
  );
}

export default function WorldAtlas() {
  return (
    <section className="atlas-layout" aria-label="Атлас миров">
      <div className="timeline-panel">
        <div className="atlas-title-row">
          <div>
            <span className="kicker">Таймлайн кампании</span>
            <h2>8 больших миров на линии времени</h2>
          </div>
          <div className="atlas-badge">
            <Clock3 size={18} />
            <span>карточки ведут в Markdown</span>
          </div>
        </div>
        <div className="timeline-track">
          {worldCards.map((world, index) => (
            <div className={index % 2 === 0 ? "timeline-node above" : "timeline-node below"} key={world.path}>
              <WorldCard world={world} />
            </div>
          ))}
        </div>
      </div>

      <aside className="minor-worlds-panel">
        <span className="kicker">Общая карточка</span>
        <h2>{minorWorldsCard.title}</h2>
        <span className="timeline-year">{minorWorldsCard.year}</span>
        <p>{minorWorldsCard.summary}</p>
        <Link className="gold-button" to={toPage(minorWorldsCard.path)}>Открыть малые миры</Link>
        <div className="world-notes">
          <strong>Топ-инфо</strong>
          <span>9 карточек мира</span>
          <span>9 кликабельных пинов</span>
          <span>Источник данных: Markdown vault</span>
        </div>
      </aside>

      <div className="map-panel">
        <div className="map-copy">
          <span className="kicker">PNG карта</span>
          <h2>Карта миров с пинами</h2>
          <p>Каждый пин открывает связанную Markdown-страницу с описанием мира, секретами GM и связями.</p>
        </div>
        <div className="map-stage">
          <img src="/api/assets/world-map.png" alt="Карта миров кампании" />
          {[...worldCards, minorWorldsCard].map((world) => (
            <Link
              key={world.path}
              className="map-pin"
              style={{ left: `${world.pin.x}%`, top: `${world.pin.y}%` }}
              to={toPage(world.path)}
              title={world.title}
            >
              <Sparkles size={15} />
              <span>{world.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
