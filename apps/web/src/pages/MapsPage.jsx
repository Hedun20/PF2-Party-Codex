import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
  Gem,
  Link2,
  Map,
  MapPinned,
  MousePointer2,
  Search,
  Send,
  ShieldCheck
} from "lucide-react";
import PageMap from "../components/PageMap.jsx";
import { labelCategory } from "../utils/labels.js";
import { api } from "../api/client.js";
import CodexButton from "../components/ui/CodexButton.jsx";

function mediaUrl(path = "") {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("/api/")) return path;
  return `/api/assets/${String(path).replace(/^images\//, "")}`;
}

function compact(text = "", limit = 170) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function normalizeEntryObjects(page) {
  const mapObjects = Array.isArray(page.mapObjects) ? page.mapObjects : [];
  const pins = Array.isArray(page.pins) ? page.pins : [];
  return [
    ...mapObjects,
    ...pins.map((pin, index) => ({ ...pin, id: `entry-${index}`, shape: "pin", visibility: pin.visibility || "public" }))
  ].filter((item) => item?.label);
}

function normalizeVisibility(value = "public") {
  const visibility = String(value || "public");
  if (["gmOnly", "hidden", "needsReview", "gm"].includes(visibility)) return "gm";
  return "public";
}

function normalizeObjectCategory(category = "location") {
  if (category === "merchant") return "trade";
  if (category === "secret") return "secret";
  return category || "location";
}

function normalizeMongoObject(object = {}) {
  const geometry = object.geometry || {};
  const shape = object.type === "area" ? "area" : "pin";
  const points = Array.isArray(geometry.points) ? geometry.points : [];
  const x = Number(geometry.x ?? object.x);
  const y = Number(geometry.y ?? object.y);

  if (shape === "area" && points.length < 3) return null;
  if (shape !== "area" && (!Number.isFinite(x) || !Number.isFinite(y))) return null;

  return {
    id: object.id || object._id || object.label,
    sourceKind: "mongo",
    shape,
    type: normalizeObjectCategory(object.category),
    label: object.label || "Map object",
    path: "",
    summary: object.description || "",
    visibility: normalizeVisibility(object.visibility),
    x,
    y,
    points,
    rawVisibility: object.visibility || "public"
  };
}

function countLinkedObjects(objects = []) {
  return objects.filter((object) => object.path).length;
}

function countGmObjects(objects = []) {
  return objects.filter((object) => object.visibility === "gm" || object.type === "secret").length;
}

function mapImage(map = {}) {
  return map.imageUrl || map.imageAssetUrl || map.mapImage || map.image || "";
}

function normalizeMongoMap(map = {}, objects = []) {
  const normalizedObjects = objects.map(normalizeMongoObject).filter((object) => object?.label);
  const gm = countGmObjects(normalizedObjects);
  const linked = countLinkedObjects(normalizedObjects);
  return {
    id: map.id || map._id,
    path: `mongo-map:${map.id || map._id || map.title}`,
    sourceKind: "mongo",
    title: map.title || "Untitled map",
    summary: map.description || "",
    category: "maps",
    world: "",
    mapImage: mapImage(map),
    imageAssetId: map.imageAssetId || "",
    visibility: map.visibility || "public",
    viewport: map.viewport || null,
    layers: Array.isArray(map.layers) ? map.layers : [],
    objects: normalizedObjects,
    mapObjects: normalizedObjects,
    pins: [],
    gm,
    player: normalizedObjects.length - gm,
    linked,
    unlinked: normalizedObjects.length - linked,
    createdAt: map.createdAt,
    updatedAt: map.updatedAt
  };
}

function normalizeEntryMap(page, overrides = {}) {
  const pageForObjects = overrides[page.path] ? { ...page, mapObjects: overrides[page.path], pins: [] } : page;
  const objects = normalizeEntryObjects(pageForObjects);
  const gm = countGmObjects(objects);
  const linked = countLinkedObjects(objects);
  return {
    ...page,
    sourceKind: "entry",
    objects,
    gm,
    player: objects.length - gm,
    linked,
    unlinked: objects.length - linked
  };
}

function editorPathForWorld(activeWorld, type = "map") {
  const params = new URLSearchParams();
  if (activeWorld?.title) params.set("world", activeWorld.title);
  if (type) params.set("type", type);
  const query = params.toString();
  return query ? `/editor?${query}` : "/editor";
}

function pagePath(page) {
  return page?.sourceKind === "entry" && page.path ? `/page/${encodeURIComponent(page.path)}` : "";
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
  const [mapsState, setMapsState] = useState({ loading: true, error: "", maps: null, role: "" });
  const [objectsByMap, setObjectsByMap] = useState({});
  const [objectState, setObjectState] = useState({ loading: false, error: "", mapId: "" });
  const canEdit = mode === "gm";

  useEffect(() => {
    let active = true;
    setMapsState({ loading: true, error: "", maps: null, role: "" });
    api.maps()
      .then((data) => {
        if (!active) return;
        setMapsState({ loading: false, error: "", maps: Array.isArray(data.maps) ? data.maps : [], role: data.role || "" });
      })
      .catch((error) => {
        if (!active) return;
        setMapsState({ loading: false, error: error.message || "Maps API failed.", maps: null, role: "" });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!canEdit) return;
    api.assetList(mode).then((data) => setUnusedAssets(data.unused || [])).catch(() => setUnusedAssets([]));
  }, [mode, canEdit]);

  useEffect(() => {
    if (!canEdit) {
      setPreviewMode("player");
      if (layer === "gm") setLayer("all");
    }
  }, [canEdit, layer]);

  const usingMongoMaps = Array.isArray(mapsState.maps) && !mapsState.error;
  const entryMaps = useMemo(() => pages.filter((page) => page.mapImage).map((page) => normalizeEntryMap(page, objectOverrides)), [pages, objectOverrides]);
  const usingEntryFallback = Boolean(mapsState.error && entryMaps.length);

  const mongoMaps = useMemo(() => (mapsState.maps || []).map((map) => normalizeMongoMap(map, objectsByMap[map.id || map._id] || [])), [mapsState.maps, objectsByMap]);
  const allMaps = usingMongoMaps ? mongoMaps : usingEntryFallback ? entryMaps : [];

  const maps = useMemo(() => allMaps
    .filter((page) => {
      const objectHaystack = page.objects.map((item) => `${item.label} ${item.summary || ""} ${item.path || ""}`).join(" ");
      const haystack = `${page.title} ${page.summary} ${page.world || ""} ${page.visibility || ""} ${objectHaystack}`.toLowerCase();
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

  useEffect(() => {
    if (!selectedMap || selectedMap.sourceKind !== "mongo" || !selectedMap.id) return;
    if (objectsByMap[selectedMap.id]) return;
    let active = true;
    setObjectState({ loading: true, error: "", mapId: selectedMap.id });
    api.mapObjects(selectedMap.id)
      .then((data) => {
        if (!active) return;
        setObjectsByMap((current) => ({ ...current, [selectedMap.id]: Array.isArray(data.objects) ? data.objects : [] }));
        setObjectState({ loading: false, error: "", mapId: selectedMap.id });
      })
      .catch((error) => {
        if (!active) return;
        setObjectState({ loading: false, error: error.message || "Map objects API failed.", mapId: selectedMap.id });
      });
    return () => {
      active = false;
    };
  }, [selectedMap, objectsByMap]);

  const selectedWorldName = activeWorld?.title || selectedMap?.world || "";
  const playerViewUrl = selectedWorldName ? `/world/${encodeURIComponent(selectedWorldName)}/player` : "/player";
  const selectedMapHasSecrets = selectedMap ? selectedMap.objects.some((item) => item.visibility === "gm" || item.type === "secret") : false;
  const selectedMapPlayerReady = selectedMap ? selectedMap.player > 0 || Boolean(selectedMap.summary) : false;
  const totalObjects = allMaps.reduce((sum, page) => sum + page.objects.length, 0);
  const playerObjects = allMaps.reduce((sum, page) => sum + page.player, 0);
  const gmObjects = allMaps.reduce((sum, page) => sum + page.gm, 0);
  const linkedObjects = allMaps.reduce((sum, page) => sum + page.linked, 0);
  const selectedPagePath = pagePath(selectedMap);

  async function revealSelectedMap() {
    if (!selectedMap || selectedMap.sourceKind !== "entry") return;
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
      setRevealStatus({ type: "success", text: `Map sent to players: ${selectedMap.title}` });
    } catch (error) {
      setRevealStatus({ type: "error", text: error.message || "Could not reveal this map." });
    } finally {
      setRevealBusy(false);
    }
  }

  async function copyPlayerLink() {
    const url = `${window.location.origin}${playerViewUrl}`;
    try {
      await navigator.clipboard.writeText(url);
      setRevealStatus({ type: "success", text: "Player link copied." });
    } catch {
      setRevealStatus({ type: "error", text: url });
    }
  }

  return (
    <div className="page-stack maps-hub-page maps2-workbench-page">
      <header className="list-header maps-hub-hero article-page-header maps2-workbench-hero">
        <div>
          <span className="kicker">{canEdit ? "Maps · GM Workbench" : "Maps · Player View"}</span>
          <h1>{activeWorld ? `Maps: ${activeWorld.title}` : "Campaign maps"}</h1>
          <p>Maps and map objects are loaded from the campaign workspace. Entry-backed map articles remain available if the dedicated map projection cannot be loaded.</p>
          {mapsState.role && <div className="workspace-identity-strip"><span>Role: {mapsState.role}</span></div>}
        </div>
        <div className="maps-hub-tools">
          <label className="maps-hub-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find map, pin, place, NPC, quest..." /></label>
          <div className="maps-hub-layer-tabs">
            {(canEdit ? [["all", "All"], ["player", "Player"], ["gm", "GM"]] : [["all", "All"], ["player", "Player"]]).map(([value, label]) => (
              <button key={value} type="button" className={layer === value ? "active" : ""} onClick={() => setLayer(value)}>{label}</button>
            ))}
          </div>
          <div className="maps2-hero-actions">
            {canEdit && usingEntryFallback && <CodexButton as={Link} to={editorPathForWorld(activeWorld, "map")} variant="secondary">New map article</CodexButton>}
            {selectedPagePath && <CodexButton as={Link} to={selectedPagePath} variant="ghost"><Map size={16} /> Open article</CodexButton>}
          </div>
        </div>
      </header>

      {mapsState.loading && (
        <section className="builder-section maps-empty-state">
          <MapPinned size={28} />
          <h2>Loading maps</h2>
          <p>Fetching campaign maps from Mongo.</p>
        </section>
      )}

      {mapsState.error && usingEntryFallback && (
        <section className="codex-card workspace-status-card">
          <AlertTriangle size={22} />
          <span className="kicker">Entry-backed view</span>
          <p>The dedicated map projection could not be loaded. Showing map articles from the same campaign database.</p>
        </section>
      )}

      {mapsState.error && !usingEntryFallback && (
        <section className="codex-card workspace-status-card">
          <AlertTriangle size={22} />
          <span className="kicker">Maps unavailable</span>
          <p>{mapsState.error}</p>
        </section>
      )}

      <section className="maps2-stats-grid" aria-label="Map summary">
        <article><MapPinned size={18} /><span>Maps</span><strong>{allMaps.length}</strong></article>
        <article><Eye size={18} /><span>Player objects</span><strong>{playerObjects}</strong></article>
        {canEdit && <article><Gem size={18} /><span>GM-only</span><strong>{gmObjects}</strong></article>}
        <article><Link2 size={18} /><span>Linked</span><strong>{linkedObjects}/{totalObjects}</strong></article>
      </section>

      {selectedMap && (
        <section className="maps2-active-card builder-section">
          <div className="maps2-active-header">
            <div>
              <span className="kicker">Active map</span>
              <h2>{selectedMap.title}</h2>
              <p>{selectedMap.summary || (selectedMap.mapImage ? "No public map summary yet." : "No map image URL is available for this Mongo map yet.")}</p>
            </div>
            <div className="maps2-active-actions">
              {canEdit && (
                <button type="button" className={previewMode === "player" ? "maps2-preview-toggle active" : "maps2-preview-toggle"} onClick={() => setPreviewMode((current) => current === "gm" ? "player" : "gm")}>                  
                  {previewMode === "player" ? <Eye size={16} /> : <EyeOff size={16} />}
                  {previewMode === "player" ? "Preview as Player" : "GM view"}
                </button>
              )}
              {canEdit && selectedMap.sourceKind === "entry" && (
                <button type="button" className="maps2-preview-toggle maps2-reveal-action" onClick={revealSelectedMap} disabled={!selectedMapPlayerReady || revealBusy}>
                  <Send size={16} /> {revealBusy ? "Revealing..." : "Reveal map"}
                </button>
              )}
              {canEdit && <button type="button" className="maps2-preview-toggle" onClick={copyPlayerLink}><Copy size={16} /> Player link</button>}
              {canEdit && selectedMap.sourceKind === "entry" && <CodexButton as={Link} to={`/edit/${encodeURIComponent(selectedMap.path)}`} variant="secondary">Edit article</CodexButton>}
            </div>
          </div>
          <div className="maps2-active-meta">
            <span><Eye size={14} /> {selectedMap.player} player-visible</span>
            {canEdit && <span><Gem size={14} /> {selectedMap.gm} GM-only</span>}
            <span><Link2 size={14} /> {selectedMap.linked} linked</span>
            {selectedMap.unlinked > 0 && <span className="warning"><ShieldCheck size={14} /> {selectedMap.unlinked} unlinked</span>}
            {selectedMapHasSecrets && <span className="gm-warning"><EyeOff size={14} /> hidden layer present</span>}
            {objectState.loading && selectedMap.sourceKind === "mongo" && <span>Loading objects...</span>}
            {objectState.error && selectedMap.sourceKind === "mongo" && <span className="warning">{objectState.error}</span>}
          </div>
          {canEdit && selectedMap.sourceKind === "entry" && (
            <div className={`maps2-reveal-strip ${revealStatus?.type || "idle"}`}>
              <div>
                <span className="kicker">Map reveal readiness</span>
                <strong>{selectedMapPlayerReady ? "Ready for player view" : "Add player-visible content first"}</strong>
              </div>
              <p>{revealStatus?.text || (selectedMapHasSecrets ? "This map article contains a GM-only layer. Use Preview as Player before reveal." : "This map article looks safe for handout/reveal.")}</p>
              <Link to={playerViewUrl} target="_blank" rel="noreferrer">Open player view</Link>
            </div>
          )}
          {selectedMap.mapImage ? (
            <PageMap page={selectedMap} mode={previewMode} editable={canEdit && selectedMap.sourceKind === "entry"} availablePages={pages} onObjectsSaved={(path, objects) => setObjectOverrides((current) => ({ ...current, [path]: objects }))} />
          ) : (
            <section className="codex-card workspace-status-card">
              <MapPinned size={24} />
              <h2>No map image available</h2>
              <p>This Mongo map does not include a usable image URL yet. Image asset resolution is intentionally deferred.</p>
            </section>
          )}
        </section>
      )}

      <section className="maps2-map-picker builder-section">
        <div className="maps2-section-heading">
          <div>
            <span className="kicker">Map library</span>
            <h2>Select a map for the workbench</h2>
          </div>
          <p>{maps.length} of {allMaps.length} maps after filters.</p>
        </div>
        <div className="maps-hub-grid maps2-picker-grid">
          {maps.map((page) => (
            <article key={page.path} className={selectedMap?.path === page.path ? "codex-card maps-hub-card maps2-picker-card active" : "codex-card maps-hub-card maps2-picker-card"}>
              <button type="button" className="maps2-card-select" onClick={() => setSelectedPath(page.path)}>
                <div className="maps-hub-thumb">
                  {page.mapImage ? <img src={mediaUrl(page.mapImage)} alt={`Map: ${page.title}`} /> : <div className="handout-card-placeholder"><MapPinned size={26} /></div>}
                  <span><MousePointer2 size={15} /> Select</span>
                </div>
                <div className="maps-hub-copy codex-card__body">
                  <span className="codex-card__eyebrow">{page.sourceKind === "mongo" ? page.visibility : labelCategory(page.category)}</span>
                  <h3 className="codex-card__title">{page.title}</h3>
                  <p className="codex-card__summary">{compact(page.summary) || "Map without a summary."}</p>
                  <div className="maps-hub-stats codex-card__meta">
                    <em><Eye size={14} /> {page.player} player</em>
                    {canEdit && <em><Gem size={14} /> {page.gm} GM</em>}
                    <em><Link2 size={14} /> {page.linked}/{page.objects.length}</em>
                  </div>
                </div>
              </button>
              {pagePath(page) && <Link className="maps2-card-link" to={pagePath(page)}>Open article</Link>}
            </article>
          ))}
        </div>
      </section>

      {!mapsState.loading && maps.length === 0 && !mapsState.error && (
        <section className="builder-section maps-empty-state">
          <MapPinned size={28} />
          <h2>No Mongo maps yet</h2>
          <p>No maps are available for this campaign from the Mongo API.</p>
        </section>
      )}

      {canEdit && usingEntryFallback && unusedAssets.length > 0 && (
        <section className="builder-section maps-orphan-assets">
          <span className="kicker">Map asset diagnostics</span>
          <h2>Files exist, but are not linked to map entries</h2>
          <p>These campaign assets are available to the GM but are not referenced by a map article yet.</p>
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
