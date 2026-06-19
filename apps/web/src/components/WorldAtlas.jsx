import { Link } from "react-router-dom";
import { Globe2, MapPin, Network } from "lucide-react";
import { minorWorldsCard, worldCards } from "../data/worlds.js";

function toPage(path) {
  return `/page/${encodeURIComponent(path)}`;
}

function WorldCard({ world, pages }) {
  const children = pages.filter((page) => page.world === world.title || page.parent === world.title);
  const countries = children.filter((page) => page.category === "countries").length;
  const cities = children.filter((page) => page.category === "cities").length;
  const hooks = children.filter((page) => ["quests", "npcs", "enemies", "locations"].includes(page.category)).length;

  return (
    <Link className="world-shell-card" to={toPage(world.path)}>
      <div className="world-shell-top">
        <span className="world-kind">{world.kind}</span>
        <Globe2 size={22} />
      </div>
      <h3>{world.title}</h3>
      <p>{world.summary}</p>
      <div className="world-dot-row" aria-label="Слои мира">
        <span title="Страны">{countries}</span>
        <span title="Города">{cities}</span>
        <span title="Сюжетные сущности">{hooks}</span>
      </div>
      <div className="world-card-preview">
        <strong>Открыть слой мира</strong>
        <span>Страны: {countries}</span>
        <span>Города: {cities}</span>
        <span>NPC, враги, квесты, локации: {hooks}</span>
      </div>
    </Link>
  );
}

export default function WorldAtlas({ pages = [] }) {
  return (
    <section className="atlas-layout" aria-label="Атлас миров">
      <div className="worlds-panel">
        <div className="atlas-title-row">
          <div>
            <span className="kicker">Верхний слой</span>
            <h2>Миры кампании</h2>
          </div>
          <div className="atlas-badge">
            <Network size={18} />
            <span>мир {"->"} страна {"->"} город {"->"} сущности</span>
          </div>
        </div>
        <div className="world-shell-grid">
          {worldCards.map((world) => <WorldCard key={world.path} world={world} pages={pages} />)}
        </div>
      </div>

      <aside className="minor-worlds-panel">
        <span className="kicker">Общий слой</span>
        <h2>{minorWorldsCard.title}</h2>
        <p>{minorWorldsCard.summary}</p>
        <Link className="gold-button" to={toPage(minorWorldsCard.path)}>Открыть малые миры</Link>
        <div className="world-notes">
          <strong>Логика хранения</strong>
          <span>PNG лежат в `vault/images`</span>
          <span>Пины описаны в Markdown</span>
          <span>Связи строятся из `world`, `country`, `city`, `related`</span>
        </div>
      </aside>

      <div className="map-panel">
        <div className="map-copy">
          <span className="kicker">Общая карта</span>
          <h2>8 миров как входные точки</h2>
          <p>Внутри каждого мира можно хранить свои страны, города и PNG-карты с пинами. Мастер просто кладёт файлы в локальный vault.</p>
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
              <MapPin size={15} />
              <span>{world.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
