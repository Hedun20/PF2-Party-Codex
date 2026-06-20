import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Eye, Gem, MapPinned, Search } from "lucide-react";
import { api } from "../api/client.js";
import { labelCategory } from "../utils/labels.js";

function mediaUrl(path = "") {
  if (!path) return "";
  return path.startsWith("/api/assets/") ? path : `/api/assets/${path.replace(/^images\//, "")}`;
}

function normalizeMediaName(path = "") {
  return String(path || "").replace(/^\/api\/assets\//, "").replace(/^images\//, "").trim();
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
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    if (mode !== "gm") return;
    api.assetsList("gm").then((data) => setAssets(data.assets || [])).catch(() => setAssets([]));
  }, [mode]);

  const linkedMapNames = useMemo(() => new Set(pages.map((page) => normalizeMediaName(page.mapImage)).filter(Boolean)), [pages]);
  const unlinkedAssets = useMemo(() => assets.filter((asset) => !linkedMapNames.has(asset.fileName)), [assets, linkedMapNames]);

  const maps = useMemo(() => pages
    .filter((page) => page.mapImage)
    .map((page) => {
      const objects = normalizeObjects(page);
      const gm = objects.filter((item) => item.visibility === "gm" || item.type === "secret").length;
      const player = objects.length - gm;
      const mediaName = normalizeMediaName(page.mapImage);
      const assetExists = !assets.length || assets.some((asset) => asset.fileName === mediaName);
      return { ...page, objects, gm, player, mediaName, assetExists };
    })
    .filter((page) => {
      const haystack = `${page.title} ${page.summary} ${page.world || ""} ${page.country || ""} ${page.city || ""}`.toLowerCase();
      const queryOk = !query.trim() || haystack.includes(query.trim().toLowerCase());
      const layerOk = layer === "all" || (layer === "gm" ? page.gm > 0 : page.player > 0);
      return queryOk && layerOk;
    }), [pages, query, layer, assets]);

  return (
    <div className="page-stack maps-hub-page">
      <header className="list-header maps-hub-hero article-page-header">
        <div>
          <span className="kicker">Maps 2.0</span>
          <h1>Карты кампании</h1>
          <p>Все статьи с картами в одном месте. Если файл карты лежит в images, но не привязан к статье, GM увидит его ниже как “неиспользуемый файл”.</p>
        </div>
        <div className="maps-hub-tools">
          <label className="maps-hub-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти карту, город, мир..." /></label>
          <div className="maps-hub-layer-tabs">
            {[["all", "Все"], ["player", "Player"], ["gm", "GM"]].map(([value, label]) => (
              <button key={value} type="button" className={layer === value ? "active" : ""} onClick={() => setLayer(value)}>{label}</button>
            ))}
          </div>
        </div>
      </header>

      {mode === "gm" && unlinkedAssets.length > 0 && (
        <section className="builder-section maps-diagnostic-panel">
          <AlertTriangle size={24} />
          <div>
            <h2>Файлы карт/картинок есть, но не привязаны к статьям</h2>
            <p>Эти изображения лежат в <code>vault/images</code>, но ни одна статья не использует их как <code>mapImage</code>. Это объясняет ситуацию “карту загружал, а в Maps Hub её нет”.</p>
            <div className="unlinked-assets-row">
              {unlinkedAssets.slice(0, 12).map((asset) => (
                <a key={asset.fileName} href={asset.url} target="_blank" rel="noreferrer">{asset.fileName}</a>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="maps-hub-grid">
        {maps.map((page) => (
          <Link key={page.path} to={`/page/${encodeURIComponent(page.path)}`} className={page.assetExists ? "maps-hub-card" : "maps-hub-card missing-map-file"}>
            <div className="maps-hub-thumb">
              <img src={mediaUrl(page.mapImage)} alt={`Карта: ${page.title}`} />
              <span><MapPinned size={15} /> {page.objects.length}</span>
              {!page.assetExists && <em className="map-file-warning">файл не найден</em>}
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
          <p>Добавь <code>mapImage</code> в статье или загрузи карту в расширенном блоке создания статьи.</p>
          {mode === "gm" && <Link className="upload-button" to="/editor">Создать статью с картой</Link>}
        </section>
      )}
    </div>
  );
}
