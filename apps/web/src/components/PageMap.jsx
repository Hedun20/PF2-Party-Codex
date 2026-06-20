import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Castle,
  Crown,
  Gem,
  MapPin,
  Maximize2,
  Minus,
  RotateCcw,
  ScrollText,
  ShoppingBag,
  Skull,
  Sparkles,
  UserRound,
  Plus
} from "lucide-react";
import { colorMapObjectType, labelMapObjectType, mapObjectTypes } from "../utils/mapTypes.js";

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

export default function PageMap({ page, mode = "player" }) {
  const navigate = useNavigate();
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [enabledTypes, setEnabledTypes] = useState(() => Object.fromEntries(mapObjectTypes.map((item) => [item.value, true])));
  const [showPlayerLayer, setShowPlayerLayer] = useState(true);
  const [showGmLayer, setShowGmLayer] = useState(mode === "gm");

  const imagePath = page?.mapImage;
  const objects = useMemo(() => normalizeMapObjects(page), [page]);
  const activeObjects = useMemo(() => objects.filter((object) => {
    if (!enabledTypes[object.type]) return false;
    if (object.visibility === "gm") return mode === "gm" && showGmLayer;
    return showPlayerLayer;
  }), [objects, enabledTypes, mode, showGmLayer, showPlayerLayer]);

  if (!imagePath) return null;

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

  function handleWheel(event) {
    event.preventDefault();
    zoomBy(event.deltaY > 0 ? -0.08 : 0.08);
  }

  function startPan(event) {
    if (event.button !== 0) return;
    if (event.target.closest(".map2-object, .map2-object-list a, .map2-filter-chip, .map2-zoom-button")) return;
    setDrag({ startX: event.clientX, startY: event.clientY, panX: pan.x, panY: pan.y });
  }

  function movePan(event) {
    if (!drag) return;
    setPan({ x: drag.panX + event.clientX - drag.startX, y: drag.panY + event.clientY - drag.startY });
  }

  function endPan() {
    setDrag(null);
  }

  return (
    <section className="page-map-panel map2-panel">
      <div className="map2-heading">
        <div className="panel-heading">
          <span className="kicker">Карта 2.0</span>
          <h2>Области, пины и слои</h2>
        </div>
        <div className="map2-zoom-controls">
          <button type="button" className="map2-zoom-button" onClick={() => zoomBy(-0.15)} title="Отдалить"><Minus size={16} /></button>
          <button type="button" className="map2-zoom-button" onClick={resetView} title="Сбросить вид"><RotateCcw size={16} /></button>
          <button type="button" className="map2-zoom-button" onClick={() => zoomBy(0.15)} title="Приблизить"><Plus size={16} /></button>
          <span><Maximize2 size={15} /> {Math.round(scale * 100)}%</span>
        </div>
      </div>

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
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="map2-layout">
        <div
          className={drag ? "map2-stage panning" : "map2-stage"}
          onWheel={handleWheel}
          onMouseDown={startPan}
          onMouseMove={movePan}
          onMouseUp={endPan}
          onMouseLeave={() => { endPan(); setHovered(null); }}
        >
          <div className="map2-transform" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>
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
                    onClick={() => openObject(object)}
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
                  className={`map2-object map2-pin map2-type-${object.type} ${object.visibility === "gm" ? "gm" : ""}`}
                  style={{ left: `${object.x}%`, top: `${object.y}%`, "--object-color": object.color }}
                  onMouseEnter={() => setHovered(object)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => openObject(object)}
                  title={object.label}
                >
                  <Icon size={15} />
                  <span>{object.label}</span>
                </button>
              );
            })}
            {hovered && (
              <div className="map2-tooltip" style={{ left: `${hovered.x}%`, top: `${hovered.y}%`, "--object-color": hovered.color }}>
                <span>{labelMapObjectType(hovered.type)}{hovered.visibility === "gm" ? " · GM" : ""}</span>
                <strong>{hovered.label}</strong>
                {hovered.summary && <p>{hovered.summary}</p>}
                {hovered.path && <small>Клик откроет статью</small>}
              </div>
            )}
          </div>
        </div>

        <aside className="map2-object-list">
          <div>
            <span className="kicker">Объекты карты</span>
            <h3>{activeObjects.length} / {objects.length}</h3>
          </div>
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
            return object.path ? (
              <Link key={object.id} to={toPage(object.path)} style={{ "--object-color": object.color }}>{content}</Link>
            ) : (
              <div key={object.id} className="map2-list-static" style={{ "--object-color": object.color }}>{content}</div>
            );
          }) : (
            <p className="builder-hint">Ничего не видно: проверь фильтры типов или слой GM/player.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
