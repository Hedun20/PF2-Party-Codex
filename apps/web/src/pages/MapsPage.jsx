import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Gem, MapPinned, Search } from "lucide-react";
import { labelCategory } from "../utils/labels.js";

function mediaUrl(path = "") {
  if (!path) return "";
  return path.startsWith("/api/assets/") ? path : `/api/assets/${path.replace(/^images\//, "")}`;
}

function normalizeObjects(page) {
  const mapObjects = Array.isArray(page.mapObjects) ? page.mapObjects : [];
  const pins = Array.isArray(page.pins) ? page.pins : [];
  return [
    ...mapObjects,
    ...pins.map((pin, index) => ({ ...pin, id: `legacy-${index}`, shape: "pin", visibility: pin.visibility || "public" }))
  ].filter((item) => item?.label);
}

export default function MapsPage({ pages = [], mode = "player" }) {
  const [query, setQuery] = useState("");
  const [layer, setLayer] = useState("all");

  const maps = useMemo(() => pages
    .filter((page) => page.mapImage)
    .map((page) => {
      const objects = normalizeObjects(page);
      const gm = objects.filter((item) => item.visibility === "gm" || item.type === "secret").length;
      const player = objects.length - gm;
      return { ...page, objects, gm, player };
    })
    .filter((page) => {
      const haystack = `${page.title} ${page.summary} ${page.world || ""} ${page.country || ""} ${page.city || ""}`.toLowerCase();
      const queryOk = !query.trim() || haystack.includes(query.trim().toLowerCase());
      const layerOk = layer === "all" || (layer === "gm" ? page.gm > 0 : page.player > 0);
      return queryOk && layerOk;
    }), [pages, query, layer]);

  return (
    <div className="page-stack maps-hub-page">
      <header className="list-header maps-hub-hero article-page-header">
        <div>
          <span className="kicker">Maps 2.0</span>
          <h1>Карты кампании</h1>
          <p>Все статьи с картами в одном месте: быстро открой карту, проверь GM/player слой и количество объектов. Сами пины и области редактируются внутри статьи.</p>
        </div>
        <div className="maps-hub-tools">
          <label className="maps-hub-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти карту, город, мир..." /></label>
          <div className="maps-hub-layer-tabs">
            {[['all', 'Все'], ['player', 'Player'], ['gm', 'GM']].map(([value, label]) => (
              <button key={value} type="button" className={layer === value ? "active" : ""} onClick={() => setLayer(value)}>{label}</button>
            ))}
          </div>
        </div>
      </header>

      <section className="maps-hub-grid">
        {maps.map((page) => (
          <Link key={page.path} to={`/page/${encodeURIComponent(page.path)}`} className="maps-hub-card">
            <div className="maps-hub-thumb">
              <img src={mediaUrl(page.mapImage)} alt={`Карта: ${page.title}`} />
              <span><MapPinned size={15} /> {page.objects.length}</span>
            </div>
            <div className="maps-hub-copy">
              <span>{labelCategory(page.category)}</span>
              <h2>{page.title}</h2>
              <p>{page.summary || "Карта без краткого описания."}</p>
              <div className="maps-hub-stats">
                <em><Eye size={14} /> {page.player} player</em>
                {mode === "gm" && <em><Gem size={14} /> {page.gm} GM</em>}
              </div>
            </div>
          </Link>
        ))}
      </section>

      {maps.length === 0 && (
        <section className="builder-section maps-empty-state">
          <MapPinned size={28} />
          <h2>Карт пока не найдено</h2>
          <p>Добавь `mapImage` в статье или загрузи карту в расширенном блоке создания статьи.</p>
          <Link className="gold-button" to="/editor">Создать статью с картой</Link>
        </section>
      )}
    </div>
  );
}
