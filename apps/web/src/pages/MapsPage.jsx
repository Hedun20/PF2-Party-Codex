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
  const canEdit = mode === "gm";

  useEffect(() => {
    if (!canEdit) return;
    api.assetList(mode).then((data) => setUnusedAssets(data.unused || [])).catch(() => setUnusedAssets([]));
  }, [mode]);

  useEffect(() => {
    if (!canEdit) {
      setPreviewMode("player");
      if (layer === "gm") setLayer("all");
    }
  }, [canEdit, layer]);

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
      setRevealStatus({ type: "success", text: `ÃÅ¡ÃÂ°Ã‘â‚¬Ã‘â€šÃÂ° Ã‚Â«${selectedMap.title}Ã‚Â» ÃÂ¾Ã‘â€šÃÂ¿Ã‘â‚¬ÃÂ°ÃÂ²ÃÂ»ÃÂµÃÂ½ÃÂ° ÃÂ¸ÃÂ³Ã‘â‚¬ÃÂ¾ÃÂºÃÂ°ÃÂ¼.` });
    } catch (error) {
      setRevealStatus({ type: "error", text: error.message || "ÃÂÃÂµ Ã‘Æ’ÃÂ´ÃÂ°ÃÂ»ÃÂ¾Ã‘ÂÃ‘Å’ ÃÂ¿ÃÂ¾ÃÂºÃÂ°ÃÂ·ÃÂ°Ã‘â€šÃ‘Å’ ÃÂºÃÂ°Ã‘â‚¬Ã‘â€šÃ‘Æ’ ÃÂ¸ÃÂ³Ã‘â‚¬ÃÂ¾ÃÂºÃÂ°ÃÂ¼." });
    } finally {
      setRevealBusy(false);
    }
  }

  async function copyPlayerLink() {
    const url = `${window.location.origin}${playerViewUrl}`;
    try {
      await navigator.clipboard.writeText(url);
      setRevealStatus({ type: "success", text: "Player link Ã‘ÂÃÂºÃÂ¾ÃÂ¿ÃÂ¸Ã‘â‚¬ÃÂ¾ÃÂ²ÃÂ°ÃÂ½." });
    } catch {
      setRevealStatus({ type: "error", text: url });
    }
  }

  return (
    <div className="page-stack maps-hub-page maps2-workbench-page">
      <header className="list-header maps-hub-hero article-page-header maps2-workbench-hero">
        <div>
          <span className="kicker">{canEdit ? "Maps 2.0 Â· GM Workbench" : "Maps 2.0 Â· Player View"}</span>
          <h1>{activeWorld ? `ÃÅ¡ÃÂ°Ã‘â‚¬Ã‘â€šÃ‘â€¹: ${activeWorld.title}` : "ÃÅ¡ÃÂ°Ã‘â‚¬Ã‘â€šÃ‘â€¹ ÃÂºÃÂ°ÃÂ¼ÃÂ¿ÃÂ°ÃÂ½ÃÂ¸ÃÂ¸"}</h1>
          <p>
            {activeWorld
              ? "ÃËœÃÂ½Ã‘â€šÃÂµÃ‘â‚¬ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½Ã‘â€¹ÃÂ¹ Ã‘ÂÃ‘â€šÃÂ¾ÃÂ» ÃÂºÃÂ°Ã‘â‚¬Ã‘â€š Ã‘â€šÃÂµÃÂºÃ‘Æ’Ã‘â€°ÃÂµÃÂ³ÃÂ¾ ÃÂ¼ÃÂ¸Ã‘â‚¬ÃÂ°: ÃÂ²Ã‘â€¹ÃÂ±ÃÂµÃ‘â‚¬ÃÂ¸ ÃÂ²ÃÂ°ÃÂ¶ÃÂ½Ã‘Æ’Ã‘Å½ ÃÂºÃÂ°Ã‘â‚¬Ã‘â€šÃ‘Æ’, ÃÂ¿Ã‘â‚¬ÃÂ¾ÃÂ²ÃÂµÃ‘â‚¬Ã‘Å’ ÃÂ¿ÃÂ¸ÃÂ½Ã‘â€¹, GM-Ã‘ÂÃÂ»ÃÂ¾ÃÂ¹, player-safe Ã‘ÂÃÂ»ÃÂ¾ÃÂ¹ ÃÂ¸ Ã‘ÂÃÂ²Ã‘ÂÃÂ·ÃÂ°ÃÂ½ÃÂ½Ã‘â€¹ÃÂµ Ã‘ÂÃ‘â€šÃÂ°Ã‘â€šÃ‘Å’ÃÂ¸."
              : "Ãâ€™Ã‘ÂÃÂµ ÃÂºÃÂ°Ã‘â‚¬Ã‘â€šÃ‘â€¹ ÃÂ°Ã‘â‚¬Ã‘â€¦ÃÂ¸ÃÂ²ÃÂ° ÃÂ² ÃÂ¾ÃÂ´ÃÂ½ÃÂ¾ÃÂ¼ cockpit: ÃÂ¿ÃÂ¸ÃÂ½Ã‘â€¹, ÃÂ¾ÃÂ±ÃÂ»ÃÂ°Ã‘ÂÃ‘â€šÃÂ¸, GM/player ÃÂ²ÃÂ¸ÃÂ´ÃÂ¸ÃÂ¼ÃÂ¾Ã‘ÂÃ‘â€šÃ‘Å’, ÃÂ±Ã‘â€¹Ã‘ÂÃ‘â€šÃ‘â‚¬Ã‘â€¹ÃÂ¹ ÃÂ¿ÃÂµÃ‘â‚¬ÃÂµÃ‘â€¦ÃÂ¾ÃÂ´ ÃÂº Ã‘ÂÃ‘â€šÃÂ°Ã‘â€šÃ‘Å’Ã‘ÂÃÂ¼ ÃÂ¸ ÃÂ¿ÃÂ¾ÃÂ´ÃÂ³ÃÂ¾Ã‘â€šÃÂ¾ÃÂ²ÃÂºÃÂ° ÃÂº reveal."}
          </p>
        </div>
        <div className="maps-hub-tools">
          <label className="maps-hub-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ÃÂÃÂ°ÃÂ¹Ã‘â€šÃÂ¸ ÃÂºÃÂ°Ã‘â‚¬Ã‘â€šÃ‘Æ’, ÃÂ³ÃÂ¾Ã‘â‚¬ÃÂ¾ÃÂ´, NPC, ÃÂºÃÂ²ÃÂµÃ‘ÂÃ‘â€š..." /></label>
          <div className="maps-hub-layer-tabs">
            {(canEdit ? [["all", "Ð’ÑÐµ"], ["player", "Player"], ["gm", "GM"]] : [["all", "Ð’ÑÐµ"], ["player", "Player"]]).map(([value, label]) => (
              <button key={value} type="button" className={layer === value ? "active" : ""} onClick={() => setLayer(value)}>{label}</button>
            ))}
          </div>
          <div className="maps2-hero-actions">
            {canEdit && <CodexButton as={Link} to={editorPathForWorld(activeWorld, "map")} variant="secondary"><Plus size={16} /> ÐÐ¾Ð²Ð°Ñ ÐºÐ°Ñ€Ñ‚Ð°</CodexButton>}
            {selectedMap && <CodexButton as={Link} to={pagePath(selectedMap)} variant="ghost"><Map size={16} /> ÃÅ¾Ã‘â€šÃÂºÃ‘â‚¬Ã‘â€¹Ã‘â€šÃ‘Å’ Ã‘ÂÃ‘â€šÃÂ°Ã‘â€šÃ‘Å’Ã‘Å½</CodexButton>}
          </div>
        </div>
      </header>

      <section className="maps2-stats-grid" aria-label="ÃÂ¡ÃÂ²ÃÂ¾ÃÂ´ÃÂºÃÂ° ÃÂºÃÂ°Ã‘â‚¬Ã‘â€š">
        <article><MapPinned size={18} /><span>ÃÅ¡ÃÂ°Ã‘â‚¬Ã‘â€š</span><strong>{allMaps.length}</strong></article>
        <article><Eye size={18} /><span>Player objects</span><strong>{playerObjects}</strong></article>
        {canEdit && <article><Gem size={18} /><span>GM-only</span><strong>{gmObjects}</strong></article>}
        <article><Link2 size={18} /><span>ÃÂ¡ÃÂ²Ã‘ÂÃÂ·ÃÂ°ÃÂ½ÃÂ¾</span><strong>{linkedObjects}/{totalObjects}</strong></article>
      </section>

      {selectedMap && (
        <section className="maps2-active-card builder-section">
          <div className="maps2-active-header">
            <div>
              <span className="kicker">ÃÂÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ°Ã‘Â ÃÂºÃÂ°Ã‘â‚¬Ã‘â€šÃÂ°</span>
              <h2>{selectedMap.title}</h2>
              <p>{selectedMap.summary || "ÃÅ¡ÃÂ°Ã‘â‚¬Ã‘â€šÃÂ° ÃÂ±ÃÂµÃÂ· ÃÂºÃ‘â‚¬ÃÂ°Ã‘â€šÃÂºÃÂ¾ÃÂ³ÃÂ¾ ÃÂ¾ÃÂ¿ÃÂ¸Ã‘ÂÃÂ°ÃÂ½ÃÂ¸Ã‘Â. Ãâ€ÃÂ¾ÃÂ±ÃÂ°ÃÂ²Ã‘Å’ public text, Ã‘â€¡Ã‘â€šÃÂ¾ÃÂ±Ã‘â€¹ ÃÂ¸ÃÂ³Ã‘â‚¬ÃÂ¾ÃÂºÃÂ°ÃÂ¼ ÃÂ±Ã‘â€¹ÃÂ»ÃÂ¾ ÃÂ¿ÃÂ¾ÃÂ½Ã‘ÂÃ‘â€šÃÂ½ÃÂ¾, Ã‘â€¡Ã‘â€šÃÂ¾ ÃÂ¾ÃÂ½ÃÂ¸ ÃÂ²ÃÂ¸ÃÂ´Ã‘ÂÃ‘â€š."}</p>
            </div>
            <div className="maps2-active-actions">
              {canEdit && (
                <button
                  type="button"
                  className={previewMode === "player" ? "maps2-preview-toggle active" : "maps2-preview-toggle"}
                  onClick={() => setPreviewMode((current) => current === "gm" ? "player" : "gm")}
                >
                  {previewMode === "player" ? <Eye size={16} /> : <EyeOff size={16} />}
                  {previewMode === "player" ? "Preview as Player" : "GM view"}
                </button>
              )}
              {canEdit && (
                <button type="button" className="maps2-preview-toggle maps2-reveal-action" onClick={revealSelectedMap} disabled={!selectedMapPlayerReady || revealBusy}>
                  <Send size={16} /> {revealBusy ? "ÃÅ¸ÃÂ¾ÃÂºÃÂ°ÃÂ·Ã‘â€¹ÃÂ²ÃÂ°Ã‘Å½..." : "Reveal map"}
                </button>
              )}
              {canEdit && (
                <button type="button" className="maps2-preview-toggle" onClick={copyPlayerLink}>
                  <Copy size={16} /> Player link
                </button>
              )}
              {canEdit && <CodexButton as={Link} to={`/edit/${encodeURIComponent(selectedMap.path)}`} variant="secondary"><SlidersHorizontal size={16} /> Ð ÐµÐ´Ð°ÐºÑ‚Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ</CodexButton>}
            </div>
          </div>
          <div className="maps2-active-meta">
            <span><Eye size={14} /> {selectedMap.player} player-visible</span>
            {canEdit && <span><Gem size={14} /> {selectedMap.gm} GM-only</span>}
            <span><Link2 size={14} /> {selectedMap.linked} linked</span>
            {selectedMap.unlinked > 0 && <span className="warning"><ShieldCheck size={14} /> {selectedMap.unlinked} ÃÂ±ÃÂµÃÂ· Ã‘ÂÃ‘â€šÃÂ°Ã‘â€šÃ‘Å’ÃÂ¸</span>}
            {selectedMapHasSecrets && <span className="gm-warning"><EyeOff size={14} /> ÃÂµÃ‘ÂÃ‘â€šÃ‘Å’ Ã‘ÂÃÂºÃ‘â‚¬Ã‘â€¹Ã‘â€šÃ‘â€¹ÃÂ¹ Ã‘ÂÃÂ»ÃÂ¾ÃÂ¹</span>}
            {!selectedMapPlayerReady && <span className="warning"><ShieldCheck size={14} /> ÃÂ½ÃÂµÃ‘â€š player objects</span>}
          </div>
          {canEdit && (
            <div className={`maps2-reveal-strip ${revealStatus?.type || "idle"}`}>
              <div>
                <span className="kicker">Map reveal readiness</span>
                <strong>{selectedMapPlayerReady ? "ÃÅ“ÃÂ¾ÃÂ¶ÃÂ½ÃÂ¾ ÃÂ¿ÃÂ¾ÃÂºÃÂ°ÃÂ·ÃÂ°Ã‘â€šÃ‘Å’ ÃÂ¸ÃÂ³Ã‘â‚¬ÃÂ¾ÃÂºÃÂ°ÃÂ¼" : "ÃÂ¡ÃÂ½ÃÂ°Ã‘â€¡ÃÂ°ÃÂ»ÃÂ° ÃÂ´ÃÂ¾ÃÂ±ÃÂ°ÃÂ²Ã‘Å’ player-visible ÃÂ¾ÃÂ±Ã‘Å ÃÂµÃÂºÃ‘â€š ÃÂ¸ÃÂ»ÃÂ¸ public map text"}</strong>
              </div>
              <p>
                {revealStatus?.text || (selectedMapHasSecrets
                  ? "ÃÅ¡ÃÂ°Ã‘â‚¬Ã‘â€šÃÂ° Ã‘ÂÃÂ¾ÃÂ´ÃÂµÃ‘â‚¬ÃÂ¶ÃÂ¸Ã‘â€š GM-only Ã‘ÂÃÂ»ÃÂ¾ÃÂ¹. ÃËœÃ‘ÂÃÂ¿ÃÂ¾ÃÂ»Ã‘Å’ÃÂ·Ã‘Æ’ÃÂ¹ Preview as Player ÃÂ¿ÃÂµÃ‘â‚¬ÃÂµÃÂ´ Reveal."
                  : "ÃÅ¡ÃÂ°Ã‘â‚¬Ã‘â€šÃÂ° ÃÂ²Ã‘â€¹ÃÂ³ÃÂ»Ã‘ÂÃÂ´ÃÂ¸Ã‘â€š ÃÂ±ÃÂµÃÂ·ÃÂ¾ÃÂ¿ÃÂ°Ã‘ÂÃÂ½ÃÂ¾ÃÂ¹ ÃÂ´ÃÂ»Ã‘Â handout/reveal.")}
              </p>
              <Link to={playerViewUrl} target="_blank" rel="noreferrer">ÃÅ¾Ã‘â€šÃÂºÃ‘â‚¬Ã‘â€¹Ã‘â€šÃ‘Å’ player view</Link>
            </div>
          )}
          <PageMap
            page={selectedMap}
            mode={previewMode}
            editable={canEdit}
            availablePages={pages}
            onObjectsSaved={(path, objects) => setObjectOverrides((current) => ({ ...current, [path]: objects }))}
          />
        </section>
      )}

      <section className="maps2-map-picker builder-section">
        <div className="maps2-section-heading">
          <div>
            <span className="kicker">Ãâ€˜ÃÂ¸ÃÂ±ÃÂ»ÃÂ¸ÃÂ¾Ã‘â€šÃÂµÃÂºÃÂ° ÃÂºÃÂ°Ã‘â‚¬Ã‘â€š</span>
            <h2>Ãâ€™Ã‘â€¹ÃÂ±ÃÂµÃ‘â‚¬ÃÂ¸ ÃÂºÃÂ°Ã‘â‚¬Ã‘â€šÃ‘Æ’ ÃÂ´ÃÂ»Ã‘Â Ã‘â‚¬ÃÂ°ÃÂ±ÃÂ¾Ã‘â€¡ÃÂµÃÂ³ÃÂ¾ Ã‘ÂÃ‘â€šÃÂ¾ÃÂ»ÃÂ°</h2>
          </div>
          <p>{maps.length} ÃÂ¸ÃÂ· {allMaps.length} ÃÂºÃÂ°Ã‘â‚¬Ã‘â€š ÃÂ¿ÃÂ¾Ã‘ÂÃÂ»ÃÂµ Ã‘â€žÃÂ¸ÃÂ»Ã‘Å’Ã‘â€šÃ‘â‚¬ÃÂ¾ÃÂ².</p>
        </div>
        <div className="maps-hub-grid maps2-picker-grid">
          {maps.map((page) => (
            <article key={page.path} className={selectedMap?.path === page.path ? "codex-card maps-hub-card maps2-picker-card active" : "codex-card maps-hub-card maps2-picker-card"}>
              <button type="button" className="maps2-card-select" onClick={() => setSelectedPath(page.path)}>
                <div className="maps-hub-thumb">
                  <img src={mediaUrl(page.mapImage)} alt={`ÃÅ¡ÃÂ°Ã‘â‚¬Ã‘â€šÃÂ°: ${page.title}`} />
                  <span><MousePointer2 size={15} /> Ãâ€™Ã‘â€¹ÃÂ±Ã‘â‚¬ÃÂ°Ã‘â€šÃ‘Å’</span>
                </div>
                <div className="maps-hub-copy codex-card__body">
                  <span className="codex-card__eyebrow">{labelCategory(page.category)}</span>
                  <h3 className="codex-card__title">{page.title}</h3>
                  <p className="codex-card__summary">{page.summary || "ÃÅ¡ÃÂ°Ã‘â‚¬Ã‘â€šÃÂ° ÃÂ±ÃÂµÃÂ· ÃÂºÃ‘â‚¬ÃÂ°Ã‘â€šÃÂºÃÂ¾ÃÂ³ÃÂ¾ ÃÂ¾ÃÂ¿ÃÂ¸Ã‘ÂÃÂ°ÃÂ½ÃÂ¸Ã‘Â."}</p>
                  <div className="maps-hub-stats codex-card__meta">
                    <em><Eye size={14} /> {page.player} player</em>
                    {canEdit && <em><Gem size={14} /> {page.gm} GM</em>}
                    <em><Link2 size={14} /> {page.linked}/{page.objects.length}</em>
                  </div>
                </div>
              </button>
              <Link className="maps2-card-link" to={pagePath(page)}>ÃÅ¾Ã‘â€šÃÂºÃ‘â‚¬Ã‘â€¹Ã‘â€šÃ‘Å’ Ã‘ÂÃ‘â€šÃÂ°Ã‘â€šÃ‘Å’Ã‘Å½</Link>
            </article>
          ))}
        </div>
      </section>

      {maps.length === 0 && (
        <section className="builder-section maps-empty-state">
          <MapPinned size={28} />
          <h2>ÃÅ¡ÃÂ°Ã‘â‚¬Ã‘â€š ÃÂ¿ÃÂ¾ÃÂºÃÂ° ÃÂ½ÃÂµ ÃÂ½ÃÂ°ÃÂ¹ÃÂ´ÃÂµÃÂ½ÃÂ¾</h2>
          <p>Ãâ€ÃÂ¾ÃÂ±ÃÂ°ÃÂ²Ã‘Å’ `mapImage` ÃÂ² Ã‘ÂÃ‘â€šÃÂ°Ã‘â€šÃ‘Å’ÃÂµ ÃÂ¸ÃÂ»ÃÂ¸ ÃÂ·ÃÂ°ÃÂ³Ã‘â‚¬Ã‘Æ’ÃÂ·ÃÂ¸ ÃÂºÃÂ°Ã‘â‚¬Ã‘â€šÃ‘Æ’ ÃÂ² Ã‘â‚¬ÃÂ°Ã‘ÂÃ‘Ë†ÃÂ¸Ã‘â‚¬ÃÂµÃÂ½ÃÂ½ÃÂ¾ÃÂ¼ ÃÂ±ÃÂ»ÃÂ¾ÃÂºÃÂµ Ã‘ÂÃÂ¾ÃÂ·ÃÂ´ÃÂ°ÃÂ½ÃÂ¸Ã‘Â Ã‘ÂÃ‘â€šÃÂ°Ã‘â€šÃ‘Å’ÃÂ¸.</p>
          {canEdit && <CodexButton as={Link} to={editorPathForWorld(activeWorld, "map")}>{activeWorld ? "Ð¡Ð¾Ð·Ð´Ð°Ñ‚ÑŒ ÐºÐ°Ñ€Ñ‚Ñƒ Ð² Ð¼Ð¸Ñ€Ðµ" : "Ð¡Ð¾Ð·Ð´Ð°Ñ‚ÑŒ ÑÑ‚Ð°Ñ‚ÑŒÑŽ Ñ ÐºÐ°Ñ€Ñ‚Ð¾Ð¹"}</CodexButton>}
        </section>
      )}

      {canEdit && unusedAssets.length > 0 && (
        <section className="builder-section maps-orphan-assets">
          <span className="kicker">Ãâ€ÃÂ¸ÃÂ°ÃÂ³ÃÂ½ÃÂ¾Ã‘ÂÃ‘â€šÃÂ¸ÃÂºÃÂ° ÃÂºÃÂ°Ã‘â‚¬Ã‘â€š</span>
          <h2>ÃÂ¤ÃÂ°ÃÂ¹ÃÂ»Ã‘â€¹ ÃÂµÃ‘ÂÃ‘â€šÃ‘Å’, ÃÂ½ÃÂ¾ ÃÂº Ã‘ÂÃ‘â€šÃÂ°Ã‘â€šÃ‘Å’Ã‘ÂÃÂ¼ ÃÂ½ÃÂµ ÃÂ¿Ã‘â‚¬ÃÂ¸ÃÂ²Ã‘ÂÃÂ·ÃÂ°ÃÂ½Ã‘â€¹</h2>
          <p>ÃÂ­Ã‘â€šÃÂ¸ ÃÂ¸ÃÂ·ÃÂ¾ÃÂ±Ã‘â‚¬ÃÂ°ÃÂ¶ÃÂµÃÂ½ÃÂ¸Ã‘Â ÃÂ»ÃÂµÃÂ¶ÃÂ°Ã‘â€š ÃÂ² `vault/images`, ÃÂ½ÃÂ¾ ÃÂ½ÃÂµ ÃÂ¸Ã‘ÂÃÂ¿ÃÂ¾ÃÂ»Ã‘Å’ÃÂ·Ã‘Æ’Ã‘Å½Ã‘â€šÃ‘ÂÃ‘Â ÃÂºÃÂ°ÃÂº `mapImage`, avatar, token ÃÂ¸ÃÂ»ÃÂ¸ handout. Ãâ€¢Ã‘ÂÃÂ»ÃÂ¸ ÃÂºÃÂ°Ã‘â‚¬Ã‘â€šÃÂ° Ã¢â‚¬Å“ÃÂ¿Ã‘â‚¬ÃÂ¾ÃÂ¿ÃÂ°ÃÂ»ÃÂ°Ã¢â‚¬Â, Ã‘ÂÃÂºÃÂ¾ÃÂ¿ÃÂ¸Ã‘â‚¬Ã‘Æ’ÃÂ¹ ÃÂ¸ÃÂ¼Ã‘Â Ã‘â€žÃÂ°ÃÂ¹ÃÂ»ÃÂ° ÃÂ¸ ÃÂ²Ã‘ÂÃ‘â€šÃÂ°ÃÂ²Ã‘Å’ ÃÂµÃÂ³ÃÂ¾ ÃÂ² ÃÂ¿ÃÂ¾ÃÂ»ÃÂµ ÃÂºÃÂ°Ã‘â‚¬Ã‘â€šÃ‘â€¹ ÃÂ½Ã‘Æ’ÃÂ¶ÃÂ½ÃÂ¾ÃÂ¹ Ã‘ÂÃ‘â€šÃÂ°Ã‘â€šÃ‘Å’ÃÂ¸.</p>
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
