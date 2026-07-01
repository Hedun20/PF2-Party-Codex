import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Castle,
  Check,
  Crown,
  Edit3,
  EyeOff,
  Gem,
  Layers3,
  Link2,
  MapPin,
  Maximize2,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Save,
  ScrollText,
  ShoppingBag,
  Target,
  Trash2,
  Skull,
  Sparkles,
  UserRound,
  X
} from "lucide-react";
import { api } from "../api/client.js";
import { colorMapObjectType, labelMapObjectType, mapObjectTypes, pageToMapObjectType } from "../utils/mapTypes.js";
import { labelCategory } from "../utils/labels.js";

const iconByType = {
  city: Castle,
  country: Crown,
  location: MapPin,
  npc: UserRound,
  enemy: Skull,
  quest: ScrollText,
  danger: AlertTriangle,
  secret: Gem,
  portal: Sparkles,
  trade: ShoppingBag
};

function toPage(path) {
  return `/page/${encodeURIComponent(path)}`;
}

function mediaUrl(path = "") {
  if (!path) return "";
  return path.startsWith("/api/assets/") ? path : `/api/assets/${path.replace(/^images\//, "")}`;
}

function areaCenter(points = []) {
  if (!points.length) return { x: 50, y: 50 };
  return {
    x: points.reduce((sum, point) => sum + Number(point.x || 0), 0) / points.length,
    y: points.reduce((sum, point) => sum + Number(point.y || 0), 0) / points.length
  };
}

function normalizeMapObjects(page) {
  const currentObjects = Array.isArray(page?.mapObjects) ? page.mapObjects : [];
  const legacyPins = Array.isArray(page?.pins) ? page.pins : [];
  const convertedPins = legacyPins.map((pin, index) => ({
    id: `legacy-pin-${index}-${pin.path || pin.label}`,
    shape: "pin",
    type: pin.type || "location",
    label: pin.label,
    path: pin.path,
    x: pin.x,
    y: pin.y,
    visibility: pin.visibility || "public",
    summary: pin.summary || ""
  }));

  return [...currentObjects, ...convertedPins]
    .filter((item) => item?.label && (item.shape === "area" ? Array.isArray(item.points) && item.points.length >= 3 : item.x !== undefined && item.y !== undefined))
    .map((item, index) => ({
      id: item.id || `map-object-${index}-${item.label}`,
      shape: item.shape || "pin",
      type: item.type || "location",
      label: item.label,
      path: item.path || "",
      summary: item.summary || "",
      visibility: item.visibility || "public",
      x: Number(item.x ?? areaCenter(item.points).x),
      y: Number(item.y ?? areaCenter(item.points).y),
      points: Array.isArray(item.points) ? item.points : [],
      color: item.color || colorMapObjectType(item.type || "location")
    }));
}

function serializeMapObjects(objects = []) {
  return objects.map((object) => {
    const base = {
      id: object.id || `${object.shape || "pin"}-${Date.now()}`,
      shape: object.shape || "pin",
      type: object.type || "location",
      label: object.label || "Новый объект",
      path: object.path || "",
      summary: object.summary || "",
      visibility: object.type === "secret" ? "gm" : (object.visibility || "public"),
      color: object.color || colorMapObjectType(object.type || "location")
    };
    if (base.shape === "area") {
      return { ...base, points: Array.isArray(object.points) ? object.points : [] };
    }
    return {
      ...base,
      x: Number(object.x ?? 50),
      y: Number(object.y ?? 50)
    };
  });
}

function createPinDraft() {
  return {
    id: "",
    shape: "pin",
    type: "location",
    visibility: "public",
    label: "",
    path: "",
    summary: "",
    x: null,
    y: null
  };
}

function compactSummary(text = "") {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > 150 ? `${clean.slice(0, 147)}...` : clean;
}

function optionLabel(page) {
  return `${page.title} · ${labelCategory(page.category)}`;
}

export default function PageMap({ page, mode = "player", editable = false, availablePages = [], onObjectsSaved }) {
  const navigate = useNavigate();
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(null);
  const panFrame = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const [enabledTypes, setEnabledTypes] = useState(() => Object.fromEntries(mapObjectTypes.map((item) => [item.value, true])));
  const [showPlayerLayer, setShowPlayerLayer] = useState(true);
  const [showGmLayer, setShowGmLayer] = useState(mode === "gm");
  const [localObjects, setLocalObjects] = useState(null);
  const [pinEditorOpen, setPinEditorOpen] = useState(false);
  const [placingPin, setPlacingPin] = useState(false);
  const [pinDraft, setPinDraft] = useState(createPinDraft);
  const [saveStatus, setSaveStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalObjects(null);
    setSelectedObjectId("");
    setPinEditorOpen(false);
    setPlacingPin(false);
    setPinDraft(createPinDraft());
    setSaveStatus("");
  }, [page?.path]);

  useEffect(() => {
    setShowGmLayer(mode === "gm");
  }, [mode]);

  const imagePath = page?.mapImage;
  const pageForObjects = localObjects ? { ...page, mapObjects: localObjects, pins: [] } : page;
  const objects = useMemo(() => normalizeMapObjects(pageForObjects), [pageForObjects]);
  const activeObjects = useMemo(() => objects.filter((object) => {
    if (!enabledTypes[object.type]) return false;
    if (object.visibility === "gm") return mode === "gm" && showGmLayer;
    return showPlayerLayer;
  }), [objects, enabledTypes, mode, showGmLayer, showPlayerLayer]);
  const playerObjects = useMemo(() => objects.filter((object) => object.visibility !== "gm"), [objects]);
  const gmObjects = useMemo(() => objects.filter((object) => object.visibility === "gm"), [objects]);
  const linkedObjects = useMemo(() => objects.filter((object) => object.path), [objects]);
  const unlinkedObjects = useMemo(() => objects.filter((object) => !object.path), [objects]);
  const visibleTypeCount = Object.values(enabledTypes).filter(Boolean).length;
  const selectedObject = activeObjects.find((object) => object.id === selectedObjectId) || hovered || activeObjects[0] || null;
  const playerSafeReady = playerObjects.length > 0 && gmObjects.length === 0 ? "clean" : playerObjects.length > 0 ? "mixed" : "empty";

  if (!imagePath) return null;

  function updatePinDraft(patch) {
    setPinDraft((current) => ({ ...current, ...patch }));
  }

  function zoomBy(delta) {
    setScale((current) => Math.min(3.2, Math.max(0.65, Number((current + delta).toFixed(2)))));
  }

  function resetView() {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }

  function openObject(object) {
    if (object.path) navigate(toPage(object.path));
  }

  function setAllTypes(value) {
    setEnabledTypes(Object.fromEntries(mapObjectTypes.map((item) => [item.value, value])));
  }

  function focusObject(object) {
    setSelectedObjectId(object.id);
    setPan({ x: 0, y: 0 });
    if (object.shape !== "area") setScale((current) => Math.max(current, 1.15));
  }


  function startPan(event) {
    if (placingPin) return;
    if (event.button !== 0) return;
    if (event.target.closest(".map2-object, .map2-object-list a, .map2-filter-chip, .map2-zoom-button, .map2-pin-builder")) return;
    setDrag({ startX: event.clientX, startY: event.clientY, panX: pan.x, panY: pan.y });
  }

  function movePan(event) {
    if (!drag) return;
    const nextPan = { x: drag.panX + event.clientX - drag.startX, y: drag.panY + event.clientY - drag.startY };
    if (panFrame.current) cancelAnimationFrame(panFrame.current);
    panFrame.current = requestAnimationFrame(() => {
      setPan(nextPan);
      panFrame.current = null;
    });
  }

  function endPan() {
    if (panFrame.current) {
      cancelAnimationFrame(panFrame.current);
      panFrame.current = null;
    }
    setDrag(null);
  }

  function mapClickPosition(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Number((((event.clientX - rect.left) / rect.width) * 100).toFixed(2)),
      y: Number((((event.clientY - rect.top) / rect.height) * 100).toFixed(2))
    };
  }

  function syncDraftWithPage(path) {
    const linked = availablePages.find((candidate) => candidate.path === path);
    if (!linked) {
      updatePinDraft({ path });
      return;
    }
    const inferredType = pageToMapObjectType(linked);
    updatePinDraft({
      path,
      type: pinDraft.type === "location" ? inferredType : pinDraft.type,
      label: pinDraft.label || linked.title,
      summary: pinDraft.summary || compactSummary(linked.summary || ""),
      visibility: linked.visibility === "gm" || pinDraft.type === "secret" ? "gm" : pinDraft.visibility
    });
  }

  function startCreatePin() {
    setPinDraft(createPinDraft());
    setPinEditorOpen(true);
    setPlacingPin(true);
    setSaveStatus("Выбери статью/название и кликни по карте, где должен стоять пин.");
  }

  function editObject(object) {
    setPinDraft({
      id: object.id,
      shape: object.shape || "pin",
      type: object.type || "location",
      visibility: object.visibility || "public",
      label: object.label || "",
      path: object.path || "",
      summary: object.summary || "",
      x: object.x ?? null,
      y: object.y ?? null
    });
    setPinEditorOpen(true);
    setPlacingPin(false);
    setSaveStatus("Редактируешь выбранный пин. Можно изменить текст, слой или нажать “Переместить”.");
  }

  function moveObject(object) {
    editObject(object);
    setPlacingPin(true);
    setSaveStatus("Кликни по карте, чтобы выбрать новое место для пина.");
  }

  function handleTransformClick(event) {
    if (!editable || !pinEditorOpen || !placingPin) return;
    if (event.target.closest(".map2-object, .map2-tooltip")) return;
    const position = mapClickPosition(event);
    updatePinDraft(position);
    setSaveStatus("Позиция выбрана. Нажми “Сохранить пин”.");
  }

  async function persistObjects(nextObjects, successText) {
    if (!page?.path) return;
    setSaving(true);
    setSaveStatus("Сохраняю карту...");
    try {
      const raw = await api.rawPage(page.path, "gm");
      const canonical = serializeMapObjects(nextObjects);
      await api.savePage({
        requestedPath: page.path,
        frontmatter: {
          ...(raw.frontmatter || {}),
          mapObjects: canonical,
          pins: []
        },
        content: raw.content || ""
      });
      setLocalObjects(canonical);
      onObjectsSaved?.(page.path, canonical);
      setSaveStatus(successText || "Карта сохранена.");
      setPlacingPin(false);
    } catch (error) {
      setSaveStatus(error.message || "Не удалось сохранить карту.");
    } finally {
      setSaving(false);
    }
  }

  async function savePinDraft() {
    if (!editable) return;
    if (!pinDraft.label.trim()) {
      setSaveStatus("Сначала укажи название пина или выбери связанную статью.");
      return;
    }
    if (pinDraft.x === null || pinDraft.y === null) {
      setSaveStatus("Сначала кликни по карте, чтобы выбрать место пина.");
      setPlacingPin(true);
      return;
    }
    const nextObject = {
      id: pinDraft.id || `pin-${Date.now()}`,
      shape: "pin",
      type: pinDraft.type || "location",
      label: pinDraft.label.trim(),
      path: pinDraft.path || "",
      summary: pinDraft.summary || "",
      visibility: pinDraft.type === "secret" ? "gm" : (pinDraft.visibility || "public"),
      x: Number(pinDraft.x),
      y: Number(pinDraft.y),
      color: colorMapObjectType(pinDraft.type || "location")
    };
    const nextObjects = [...objects.filter((object) => object.id !== nextObject.id), nextObject];
    await persistObjects(nextObjects, `Пин сохранён: ${nextObject.label}`);
    setSelectedObjectId(nextObject.id);
    setPinDraft(createPinDraft());
  }

  async function deleteObject(object) {
    if (!editable || !object) return;
    const nextObjects = objects.filter((item) => item.id !== object.id);
    await persistObjects(nextObjects, `Объект удалён: ${object.label}`);
    setSelectedObjectId("");
  }

  return (
    <section className="page-map-panel map2-panel">
      <div className="map2-heading">
        <div className="panel-heading">
          <span className="kicker">Карта 2.0</span>
          <h2>Области, пины и слои</h2>
        </div>
        <div className="map2-zoom-controls">
          {editable && <button type="button" className={pinEditorOpen ? "map2-zoom-button active" : "map2-zoom-button"} onClick={startCreatePin} title="Добавить пин"><MapPin size={16} /> Пин</button>}
          <button type="button" className="map2-zoom-button" onClick={() => zoomBy(-0.15)} title="Отдалить"><Minus size={16} /></button>
          <button type="button" className="map2-zoom-button" onClick={resetView} title="Сбросить вид"><RotateCcw size={16} /></button>
          <button type="button" className="map2-zoom-button" onClick={() => zoomBy(0.15)} title="Приблизить"><Plus size={16} /></button>
          <span><Maximize2 size={15} /> {Math.round(scale * 100)}%</span>
        </div>
      </div>

      {editable && (
        <div className={pinEditorOpen ? "map2-pin-builder open" : "map2-pin-builder"}>
          <div className="map2-pin-builder-head">
            <div>
              <span className="kicker">Pin Editor</span>
              <strong>{pinDraft.id ? "Редактирование пина" : "Новый пин на карте"}</strong>
            </div>
            <div>
              {!pinEditorOpen && <button type="button" className="map2-mini-action" onClick={startCreatePin}><Plus size={14} /> Добавить пин</button>}
              {pinEditorOpen && <button type="button" className="map2-mini-action" onClick={() => { setPinEditorOpen(false); setPlacingPin(false); setPinDraft(createPinDraft()); }}><X size={14} /> Закрыть</button>}
            </div>
          </div>
          {pinEditorOpen && (
            <div className="map2-pin-builder-body">
              <label>
                Связанная статья
                <select value={pinDraft.path} onChange={(event) => syncDraftWithPage(event.target.value)}>
                  <option value="">Без связанной статьи</option>
                  {availablePages.map((candidate) => <option key={candidate.path} value={candidate.path}>{optionLabel(candidate)}</option>)}
                </select>
              </label>
              <label>
                Название пина
                <input value={pinDraft.label} onChange={(event) => updatePinDraft({ label: event.target.value })} placeholder="Например: Северные ворота" />
              </label>
              <label>
                Тип
                <select value={pinDraft.type} onChange={(event) => updatePinDraft({ type: event.target.value, visibility: event.target.value === "secret" ? "gm" : pinDraft.visibility })}>
                  {mapObjectTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label>
                Слой
                <select value={pinDraft.type === "secret" ? "gm" : pinDraft.visibility} onChange={(event) => updatePinDraft({ visibility: event.target.value })} disabled={pinDraft.type === "secret"}>
                  <option value="public">player-visible</option>
                  <option value="gm">GM-only</option>
                </select>
              </label>
              <label className="map2-pin-summary-field">
                Hover-описание
                <textarea value={pinDraft.summary} onChange={(event) => updatePinDraft({ summary: event.target.value })} placeholder="Короткая подсказка на hover." />
              </label>
              <div className="map2-pin-builder-actions">
                <button type="button" className={placingPin ? "map2-mini-action active" : "map2-mini-action"} onClick={() => setPlacingPin(true)}><Move size={14} /> {pinDraft.id ? "Переместить" : "Выбрать место"}</button>
                <button type="button" className="map2-mini-action primary" onClick={savePinDraft} disabled={saving}><Save size={14} /> {saving ? "Сохраняю..." : "Сохранить пин"}</button>
                {pinDraft.x !== null && pinDraft.y !== null && <span className="map2-pin-coords">x {pinDraft.x}% · y {pinDraft.y}%</span>}
              </div>
              {saveStatus && <p className="map2-pin-status">{saveStatus}</p>}
            </div>
          )}
        </div>
      )}

      <div className={`map2-safety-strip ${playerSafeReady}`}>
        <div>
          <span className="kicker">Player-safe check</span>
          <strong>{mode === "gm" ? `${playerObjects.length} видно игрокам · ${gmObjects.length} скрыто для GM` : `${activeObjects.length} объектов доступно игрокам`}</strong>
        </div>
        <p>
          {playerSafeReady === "clean" && "Карта чистая: все объекты подходят для игрока."}
          {playerSafeReady === "mixed" && "Карта смешанная: GM-only слой есть, проверь Preview as Player перед reveal."}
          {playerSafeReady === "empty" && "На карте пока нет player-visible объектов."}
        </p>
      </div>

      <div className="map2-filter-bar">
        <div className="map2-filters">
          <button type="button" className={showPlayerLayer ? "map2-filter-chip active" : "map2-filter-chip"} onClick={() => setShowPlayerLayer((value) => !value)}>
            Player-visible
          </button>
          {mode === "gm" && (
            <button type="button" className={showGmLayer ? "map2-filter-chip gm active" : "map2-filter-chip gm"} onClick={() => setShowGmLayer((value) => !value)}>
              GM-only слой
            </button>
          )}
          {mapObjectTypes.map((item) => (
            <button
              key={item.value}
              type="button"
              className={enabledTypes[item.value] ? "map2-filter-chip active" : "map2-filter-chip"}
              onClick={() => setEnabledTypes((current) => ({ ...current, [item.value]: !current[item.value] }))}
              style={{ "--object-color": item.color }}
            >
              <span className="map2-chip-dot" /> {item.label}
            </button>
          ))}
        </div>
        <div className="map2-filter-actions">
          <button type="button" className="map2-mini-action" onClick={() => setAllTypes(true)}><Layers3 size={14} /> Все типы</button>
          <button type="button" className="map2-mini-action" onClick={() => setAllTypes(false)}><EyeOff size={14} /> Скрыть типы</button>
          <span>{visibleTypeCount}/{mapObjectTypes.length}</span>
        </div>
      </div>

      <div className="map2-layout">
        <div
          className={drag ? "map2-stage panning" : placingPin ? "map2-stage placing" : "map2-stage"}
          onMouseDown={startPan}
          onMouseMove={movePan}
          onMouseUp={endPan}
          onMouseLeave={() => { endPan(); setHovered(null); }}
        >
          <div className="map2-transform" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }} onClick={handleTransformClick}>
            <img src={mediaUrl(imagePath)} alt={`Карта: ${page.title}`} draggable="false" />
            <svg className="map2-area-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
              {activeObjects.filter((object) => object.shape === "area").map((object) => {
                const center = areaCenter(object.points);
                return (
                  <polygon
                    key={object.id}
                    className={`map2-object map2-area map2-type-${object.type}`}
                    points={object.points.map((point) => `${point.x},${point.y}`).join(" ")}
                    style={{ "--object-color": object.color }}
                    onMouseEnter={() => setHovered({ ...object, x: center.x, y: center.y })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={(event) => { event.stopPropagation(); setSelectedObjectId(object.id); if (mode !== "gm") openObject(object); }}
                  />
                );
              })}
            </svg>
            {activeObjects.filter((object) => object.shape !== "area").map((object) => {
              const Icon = iconByType[object.type] || MapPin;
              return (
                <button
                  key={object.id}
                  type="button"
                  className={`map2-object map2-pin map2-type-${object.type} ${object.visibility === "gm" ? "gm" : ""} ${selectedObjectId === object.id ? "selected" : ""}`}
                  style={{ left: `${object.x}%`, top: `${object.y}%`, "--object-color": object.color }}
                  onMouseEnter={() => setHovered(object)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={(event) => { event.stopPropagation(); setSelectedObjectId(object.id); if (mode !== "gm") openObject(object); }}
                  title={object.label}
                >
                  <Icon size={15} />
                  <span>{object.label}</span>
                </button>
              );
            })}
            {placingPin && pinDraft.x !== null && pinDraft.y !== null && (
              <button type="button" className="map2-object map2-pin map2-draft-pin" style={{ left: `${pinDraft.x}%`, top: `${pinDraft.y}%`, "--object-color": colorMapObjectType(pinDraft.type) }}>
                <MapPin size={15} /><span>{pinDraft.label || "Новый пин"}</span>
              </button>
            )}
            {hovered && (
              <div className="map2-tooltip" style={{ left: `${hovered.x}%`, top: `${hovered.y}%`, "--object-color": hovered.color }}>
                <span>{labelMapObjectType(hovered.type)}{hovered.visibility === "gm" ? " · GM" : ""}</span>
                <strong>{hovered.label}</strong>
                {hovered.summary && <p>{hovered.summary}</p>}
                {hovered.path && <small>{mode === "gm" ? "Выбрано. Открытие — в панели справа" : "Клик откроет статью"}</small>}
              </div>
            )}
          </div>
        </div>

        <aside className="map2-object-list">
          <div className="map2-list-header">
            <div>
              <span className="kicker">Объекты карты</span>
              <h3>{activeObjects.length} / {objects.length}</h3>
            </div>
            <small><Link2 size={13} /> {linkedObjects.length} linked · {unlinkedObjects.length} draft</small>
          </div>
          {selectedObject && (
            <div className="map2-focus-card" style={{ "--object-color": selectedObject.color }}>
              <span>{labelMapObjectType(selectedObject.type)}{selectedObject.visibility === "gm" ? " · GM-only" : " · Player-visible"}</span>
              <strong>{selectedObject.label}</strong>
              {selectedObject.summary && <p>{selectedObject.summary}</p>}
              <div>
                {selectedObject.path ? <Link to={toPage(selectedObject.path)}>Открыть статью</Link> : <em>Нет связанной статьи</em>}
                <button type="button" onClick={() => focusObject(selectedObject)}><Target size={13} /> Фокус</button>
              </div>
              {editable && (
                <div className="map2-focus-actions">
                  {selectedObject.shape !== "area" && <button type="button" onClick={() => editObject(selectedObject)}><Edit3 size={13} /> Редактировать</button>}
                  {selectedObject.shape !== "area" && <button type="button" onClick={() => moveObject(selectedObject)}><Move size={13} /> Переместить</button>}
                  <button type="button" className="danger" onClick={() => deleteObject(selectedObject)}><Trash2 size={13} /> Удалить</button>
                </div>
              )}
            </div>
          )}
          {activeObjects.length ? activeObjects.map((object) => {
            const Icon = iconByType[object.type] || MapPin;
            const content = (
              <>
                <Icon size={16} />
                <span>
                  <strong>{object.label}</strong>
                  <em>{labelMapObjectType(object.type)}{object.visibility === "gm" ? " · GM" : ""}</em>
                </span>
              </>
            );
            return object.path && mode !== "gm" ? (
              <Link
                key={object.id}
                to={toPage(object.path)}
                className={selectedObject?.id === object.id ? "active" : ""}
                style={{ "--object-color": object.color }}
                onMouseEnter={() => setHovered(object)}
                onFocus={() => setHovered(object)}
              >{content}</Link>
            ) : (
              <button
                key={object.id}
                type="button"
                className={selectedObject?.id === object.id ? "map2-list-static active" : "map2-list-static"}
                style={{ "--object-color": object.color }}
                onClick={() => focusObject(object)}
                onMouseEnter={() => setHovered(object)}
              >{content}</button>
            );
          }) : (
            <p className="builder-hint">Ничего не видно: проверь фильтры типов или слой GM/player.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
