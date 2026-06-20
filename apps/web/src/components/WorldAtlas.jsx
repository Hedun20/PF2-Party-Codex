import { Link } from "react-router-dom";
import { Globe2, MapPin, Network, Sparkles } from "lucide-react";
import { minorWorldsCard, worldCards } from "../data/worlds.js";

function toPage(path) {
  return `/page/${encodeURIComponent(path)}`;
}

function getAffinity(tags = []) {
  if (tags.includes("некромантия") || tags.includes("нежить")) return "necrotic";
  if (tags.includes("море") || tags.includes("пираты")) return "tide";
  if (tags.includes("пустыня") || tags.includes("торговля")) return "solar";
  if (tags.includes("лес") || tags.includes("феи")) return "wild";
  if (tags.includes("портал") || tags.includes("планарная-магия")) return "astral";
  if (tags.includes("север") || tags.includes("драконы")) return "frost";
  return "arcane";
}

function WorldCard({ world, pages }) {
  const children = pages.filter((page) => page.world === world.title || page.parent === world.title);
  const countries = children.filter((page) => page.category === "countries").length;
  const cities = children.filter((page) => page.category === "cities").length;
  const hooks = children.filter((page) => ["quests", "npcs", "enemies", "locations"].includes(page.category)).length;
  const affinity = getAffinity(world.tags);

  return (
    <Link className={`world-shell-card ${affinity}`} to={toPage(world.path)}>
      <span className="world-constellation" aria-hidden="true" />
      <span className="world-orbit orbit-main" aria-hidden="true" />
      <span className="world-orbit orbit-cross" aria-hidden="true" />
      <span className="world-liquid" aria-hidden="true" />

      <div className="world-shell-top">
        <span className="world-kind">{world.kind}</span>
        <Globe2 size={22} />
      </div>

      <div className="world-plane" aria-hidden="true">
        <span className="plane-core" />
        <span className="plane-ring ring-one" />
        <span className="plane-ring ring-two" />
        <span className="plane-sigil">✦</span>
      </div>

      <div className="world-copy">
        <h3>{world.title}</h3>
        <p>{world.summary}</p>
      </div>

      <div className="world-dot-row" aria-label="Слои мира">
        <span title="Страны">{countries}</span>
        <span title="Города">{cities}</span>
        <span title="NPC, враги, квесты и локации">{hooks}</span>
      </div>

      <div className="world-card-preview">
        <strong>Открыть слой мира</strong>
        <span>Страны: {countries}</span>
        <span>Города: {cities}</span>
        <span>NPC, враги, квесты, локации: {hooks}</span>
        <em>{world.tags.join(" / ")}</em>
      </div>
    </Link>
  );
}

export default function WorldAtlas({ pages = [] }) {
  return (
    <section className="atlas-layout" aria-label="Атлас миров">
      <div className="worlds-panel">
        <span className="cosmic-line line-one" aria-hidden="true" />
        <span className="cosmic-line line-two" aria-hidden="true" />
        <span className="cosmic-star star-one" aria-hidden="true">✦</span>
        <span className="cosmic-star star-two" aria-hidden="true">✧</span>

        <div className="atlas-title-row">
          <div>
            <span className="kicker">Верхний слой</span>
            <h2>Миры кампании</h2>
          </div>
          <div className="atlas-badge">
            <Network size={18} />
            <span>мир → страна → город → сущности</span>
          </div>
        </div>

        <div className="world-shell-grid">
          {worldCards.map((world) => <WorldCard key={world.path} world={world} pages={pages} />)}
        </div>
      </div>

      <aside className="minor-worlds-panel">
        <span className="minor-orbit" aria-hidden="true" />
        <span className="kicker">Общий слой</span>
        <h2>{minorWorldsCard.title}</h2>
        <p>{minorWorldsCard.summary}</p>
        <Link className="gold-button" to={toPage(minorWorldsCard.path)}>Открыть малые миры</Link>
        <div className="world-notes">
          <strong>Следующие инструменты</strong>
          <span>MD-импорт с проверкой раскладки</span>
          <span>Фантомные ссылки на будущие статьи</span>
          <span>Пины, области и типы слоев на PNG/JPG-картах</span>
        </div>
      </aside>

      <div className="map-panel">
        <div className="map-copy">
          <span className="kicker">Общая карта</span>
          <h2>8 миров как входные точки</h2>
          <p>Каждый мир ведет в свой слой стран, городов, NPC, врагов, квестов и карт. Дальше карты станут редактором пинов, областей и ссылок на Markdown-статьи.</p>
          <div className="map-feature-row">
            <span><Sparkles size={14} /> пины</span>
            <span>области</span>
            <span>типы слоев</span>
          </div>
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
