import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  Copy,
  EyeOff,
  Gem,
  Link2,
  Map,
  MapPinned,
  MousePointer2,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal
} from "lucide-react";
import PageMap from "../components/PageMap.jsx";
import { labelCategory } from "../utils/labels.js";
import { api } from "../api/client.js";
import CodexButton from "../components/ui/CodexButton.jsx";

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

function editorPathForWorld(activeWorld, type = "map") {
  const params = new URLSearchParams();
  if (activeWorld?.title) params.set("world", activeWorld.title);
  if (type) params.set("type", type);
  const query = params.toString();
  return query ? `/editor?${query}` : "/editor";
}

function pagePath(page) {
  return `/page/${encodeURIComponent(page.path)}`;
}

function countLinkedObjects(objects = []) {
  return objects.filter((object) => object.path).length;
}

export default function MapsPage({ pages = [], mode = "player", activeWorld = null }) {
  const [query, setQuery] = useState("");
  const [layer, setLayer] = useState("all");
  const [selectedPath, setSelectedPath] = useState("");
  const [previewMode, setPreviewMode] = useState(mode === "gm" ? "gm" : "player");
  const [unusedAssets, setUnusedAssets] = useState([]);
  const [revealStatus, setRevealStatus] = useState(null);
  const [revealBusy, setRevealBusy] = useState(false);
  const [objectOverrides, setObjectOverrides] = useState({});

  useEffect(() => {
    if (mode !== "gm") return;
    api.assetList(mode).then((data) => setUnusedAssets(data.unused || [])).catch(() => setUnusedAssets([]));
  }, [mode]);

  useEffect(() => {
    if (mode !== "gm") setPreviewMode("player");
  }, [mode]);

  const allMaps = useMemo(() => pages
    .filter((page) => page.mapImage)
    .map((page) => {
      const pageForObjects = objectOverrides[page.path] ? { ...page, mapObjects: objectOverrides[page.path], pins: [] } : page;
      const objects = normalizeObjects(pageForObjects);
      const gm = objects.filter((item) => item.visibility === "gm" || item.type === "secret").length;
      const player = objects.length - gm;
      const linked = countLinkedObjects(objects);
      return { ...page, objects, gm, player, linked, unlinked: objects.length - linked };
    }), [pages, objectOverrides]);

  const maps = useMemo(() => allMaps
    .filter((page) => {
      const objectHaystack = page.objects.map((item) => `${item.label} ${item.summary || ""} ${item.path || ""}`).join(" ");
      const haystack = `${page.title} ${page.summary} ${page.world || ""} ${page.country || ""} ${page.city || ""} ${objectHaystack}`.toLowerCase();
      const queryOk = !query.trim() || haystack.includes(query.trim().toLowerCase());
      const layerOk = layer === "all" || (layer === "gm" ? page.gm > 0 : page.player > 0);
      return queryOk && layerOk;
    }), [allMaps, query, layer]);

  useEffect(() => {
    if (!maps.length) {
      setSelectedPath("");
      return;
    }
    if (!selectedPath || !maps.some((page) => page.path === selectedPath)) setSelectedPath(maps[0].path);
  }, [maps, selectedPath]);

  const selectedMap = useMemo(() => maps.find((page) => page.path === selectedPath) || maps[0] || null, [maps, selectedPath]);
  const selectedWorldName = activeWorld?.title || selectedMap?.world || "";
  const playerViewUrl = selectedWorldName ? `/world/${encodeURIComponent(selectedWorldName)}/player` : "/player";
  const selectedMapHasSecrets = selectedMap ? selectedMap.objects.some((item) => item.visibility === "gm" || item.type === "secret") : false;
  const selectedMapPlayerReady = selectedMap ? selectedMap.player > 0 : false;
  const totalObjects = allMaps.reduce((sum, page) => sum + page.objects.length, 0);
  const playerObjects = allMaps.reduce((sum, page) => sum + page.player, 0);
  const gmObjects = allMaps.reduce((sum, page) => sum + page.gm, 0);
  const linkedObjects = allMaps.reduce((sum, page) => sum + page.linked, 0);

  async function revealSelectedMap() {
    if (!selectedMap) return;
    setRevealBusy(true);
    setRevealStatus(null);
    try {
      await api.revealSet({
        world: selectedWorldName || selectedMap.world || selectedMap.title,
        path: selectedMap.path,
        note: selectedMapHasSecrets
          ? "GM preview checked: this map contains hidden GM objects. Player view receives only the public map article."
          : "Player-safe map handout from the GM map workbench."
      });
      setRevealStatus({ type: "success", text: `Карта «${selectedMap.title}» отправлена игрокам.` });
    } catch (error) {
      setRevealStatus({ type: "error", text: error.message || "Не удалось показать карту игрокам." });
    } finally {
      setRevealBusy(false);
    }
  }

  async function copyPlayerLink() {
    const url = `${window.location.origin}${playerViewUrl}`;
    try {
      await navigator.clipboard.writeText(url);
      setRevealStatus({ type: "success", text: "Player link скопирован." });
    } catch {
      setRevealStatus({ type: "error", text: url });
    }
  }

  return (
    <div className="page-stack maps-hub-page maps2-workbench-page">
      <header className="list-header maps-hub-hero article-page-header maps2-workbench-hero">
        <div>
          <span className="kicker">Maps 2.0 · GM Workbench</span>
          <h1>{activeWorld ? `Карты: ${activeWorld.title}` : "Карты кампании"}</h1>
          <p>
            {activeWorld
              ? "Интерактивный стол карт текущего мира: выбери важную карту, проверь пины, GM-слой, player-safe слой и связанные статьи."
              : "Все карты архива в одном cockpit: пины, области, GM/player видимость, быстрый переход к статьям и подготовка к reveal."}
          </p>
        </div>
        <div className="maps-hub-tools">
          <label className="maps-hub-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти карту, город, NPC, квест..." /></label>
          <div className="maps-hub-layer-tabs">
            {[['all', 'Все'], ['player', 'Player'], ['gm', 'GM']].map(([value, label]) => (
              <button key={value} type="button" className={layer === value ? "active" : ""} onClick={() => setLayer(value)}>{label}</button>
            ))}
          </div>
          <div className="maps2-hero-actions">
            <CodexButton as={Link} to={editorPathForWorld(activeWorld, "map")} variant="secondary"><Plus size={16} /> Новая карта</CodexButton>
            {selectedMap && <CodexButton as={Link} to={pagePath(selectedMap)} variant="ghost"><Map size={16} /> Открыть статью</CodexButton>}
          </div>
        </div>
      </header>

      <section className="maps2-stats-grid" aria-label="Сводка карт">
        <article><MapPinned size={18} /><span>Карт</span><strong>{allMaps.length}</strong></article>
        <article><Eye size={18} /><span>Player objects</span><strong>{playerObjects}</strong></article>
        <article><Gem size={18} /><span>GM-only</span><strong>{gmObjects}</strong></article>
        <article><Link2 size={18} /><span>Связано</span><strong>{linkedObjects}/{totalObjects}</strong></article>
      </section>

      {selectedMap && (
        <section className="maps2-active-card builder-section">
          <div className="maps2-active-header">
            <div>
              <span className="kicker">Активная карта</span>
              <h2>{selectedMap.title}</h2>
              <p>{selectedMap.summary || "Карта без краткого описания. Добавь public text, чтобы игрокам было понятно, что они видят."}</p>
            </div>
            <div className="maps2-active-actions">
              {mode === "gm" && (
                <button
                  type="button"
                  className={previewMode === "player" ? "maps2-preview-toggle active" : "maps2-preview-toggle"}
                  onClick={() => setPreviewMode((current) => current === "gm" ? "player" : "gm")}
                >
                  {previewMode === "player" ? <Eye size={16} /> : <EyeOff size={16} />}
                  {previewMode === "player" ? "Preview as Player" : "GM view"}
                </button>
              )}
              {mode === "gm" && (
                <button type="button" className="maps2-preview-toggle maps2-reveal-action" onClick={revealSelectedMap} disabled={!selectedMapPlayerReady || revealBusy}>
                  <Send size={16} /> {revealBusy ? "Показываю..." : "Reveal map"}
                </button>
              )}
              {mode === "gm" && (
                <button type="button" className="maps2-preview-toggle" onClick={copyPlayerLink}>
                  <Copy size={16} /> Player link
                </button>
              )}
              <CodexButton as={Link} to={`/edit/${encodeURIComponent(selectedMap.path)}`} variant="secondary"><SlidersHorizontal size={16} /> Редактировать</CodexButton>
            </div>
          </div>
          <div className="maps2-active-meta">
            <span><Eye size={14} /> {selectedMap.player} player-visible</span>
            {mode === "gm" && <span><Gem size={14} /> {selectedMap.gm} GM-only</span>}
            <span><Link2 size={14} /> {selectedMap.linked} linked</span>
            {selectedMap.unlinked > 0 && <span className="warning"><ShieldCheck size={14} /> {selectedMap.unlinked} без статьи</span>}
            {selectedMapHasSecrets && <span className="gm-warning"><EyeOff size={14} /> есть скрытый слой</span>}
            {!selectedMapPlayerReady && <span className="warning"><ShieldCheck size={14} /> нет player objects</span>}
          </div>
          {mode === "gm" && (
            <div className={`maps2-reveal-strip ${revealStatus?.type || "idle"}`}>
              <div>
                <span className="kicker">Map reveal readiness</span>
                <strong>{selectedMapPlayerReady ? "Можно показать игрокам" : "Сначала добавь player-visible объект или public map text"}</strong>
              </div>
              <p>
                {revealStatus?.text || (selectedMapHasSecrets
                  ? "Карта содержит GM-only слой. Используй Preview as Player перед Reveal."
                  : "Карта выглядит безопасной для handout/reveal.")}
              </p>
              <Link to={playerViewUrl} target="_blank" rel="noreferrer">Открыть player view</Link>
            </div>
          )}
          <PageMap
            page={selectedMap}
            mode={previewMode}
            editable={mode === "gm"}
            availablePages={pages}
            onObjectsSaved={(path, objects) => setObjectOverrides((current) => ({ ...current, [path]: objects }))}
          />
        </section>
      )}

      <section className="maps2-map-picker builder-section">
        <div className="maps2-section-heading">
          <div>
            <span className="kicker">Библиотека карт</span>
            <h2>Выбери карту для рабочего стола</h2>
          </div>
          <p>{maps.length} из {allMaps.length} карт после фильтров.</p>
        </div>
        <div className="maps-hub-grid maps2-picker-grid">
          {maps.map((page) => (
            <article key={page.path} className={selectedMap?.path === page.path ? "codex-card maps-hub-card maps2-picker-card active" : "codex-card maps-hub-card maps2-picker-card"}>
              <button type="button" className="maps2-card-select" onClick={() => setSelectedPath(page.path)}>
                <div className="maps-hub-thumb">
                  <img src={mediaUrl(page.mapImage)} alt={`Карта: ${page.title}`} />
                  <span><MousePointer2 size={15} /> Выбрать</span>
                </div>
                <div className="maps-hub-copy codex-card__body">
                  <span className="codex-card__eyebrow">{labelCategory(page.category)}</span>
                  <h3 className="codex-card__title">{page.title}</h3>
                  <p className="codex-card__summary">{page.summary || "Карта без краткого описания."}</p>
                  <div className="maps-hub-stats codex-card__meta">
                    <em><Eye size={14} /> {page.player} player</em>
                    {mode === "gm" && <em><Gem size={14} /> {page.gm} GM</em>}
                    <em><Link2 size={14} /> {page.linked}/{page.objects.length}</em>
                  </div>
                </div>
              </button>
              <Link className="maps2-card-link" to={pagePath(page)}>Открыть статью</Link>
            </article>
          ))}
        </div>
      </section>

      {maps.length === 0 && (
        <section className="builder-section maps-empty-state">
          <MapPinned size={28} />
          <h2>Карт пока не найдено</h2>
          <p>Добавь `mapImage` в статье или загрузи карту в расширенном блоке создания статьи.</p>
          <CodexButton as={Link} to={editorPathForWorld(activeWorld, "map")}>{activeWorld ? "Создать карту в мире" : "Создать статью с картой"}</CodexButton>
        </section>
      )}

      {mode === "gm" && unusedAssets.length > 0 && (
        <section className="builder-section maps-orphan-assets">
          <span className="kicker">Диагностика карт</span>
          <h2>Файлы есть, но к статьям не привязаны</h2>
          <p>Эти изображения лежат в `vault/images`, но не используются как `mapImage`, avatar, token или handout. Если карта “пропала”, скопируй имя файла и вставь его в поле карты нужной статьи.</p>
          <div className="maps-orphan-grid">
            {unusedAssets.slice(0, 24).map((asset) => (
              <article key={asset.path} className="maps-orphan-card">
                <img src={asset.url} alt={asset.fileName} />
                <strong>{asset.fileName}</strong>
                <code>{asset.path}</code>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
