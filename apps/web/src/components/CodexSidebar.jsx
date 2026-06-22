import { Link, NavLink } from "react-router-dom";
import { BookOpen, Castle, Clock3, Crosshair, FileQuestion, Globe2, Home, Map, MapPinned, ScrollText, ShieldAlert, ShieldCheck, Swords, UsersRound, X } from "lucide-react";
import LoreDropdown from "./LoreDropdown.jsx";
import { worldRoute } from "../utils/worldContext.js";

const sections = [
  ["Страны", "countries", Map],
  ["Города", "cities", Castle],
  ["NPC", "npcs", UsersRound],
  ["Враги", "enemies", Swords],
  ["Квесты", "quests", ScrollText],
  ["Сессии", "sessions", BookOpen],
  ["Локации", "locations", Map]
];

function scopedPath(activeWorld, path) {
  return activeWorld ? `${worldRoute(activeWorld)}/${path.replace(/^\//, "")}` : path;
}

export default function CodexSidebar({ onClose, canEdit = false, activeWorld = null }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <Link to={activeWorld ? worldRoute(activeWorld) : "/"} className="brand" onClick={onClose}>
          <Castle />
          <span>{activeWorld ? activeWorld.title : "PF2 Party Codex"}</span>
        </Link>
        <button className="sidebar-close" onClick={onClose} title="Закрыть навигацию">
          <X size={18} />
        </button>
      </div>
      {activeWorld && (
        <div className="sidebar-world-card">
          <span className="kicker">Активный мир</span>
          <strong>{activeWorld.title}</strong>
          <p>{activeWorld.summary || "Фильтр мира включён. Навигация ниже показывает материалы этого мира."}</p>
          <Link to="/" onClick={onClose}><Home size={15} /> В общий Архив</Link>
        </div>
      )}
      <nav className="nav-stack">
        <NavLink to="/category/worlds" className="nav-link" onClick={onClose}>
          <Globe2 size={18} />
          <span>Миры</span>
        </NavLink>
        <NavLink to={scopedPath(activeWorld, "/timeline")} className="nav-link" onClick={onClose}>
          <Clock3 size={18} />
          <span>{activeWorld ? "Timeline мира" : "Timeline"}</span>
        </NavLink>
        <NavLink to={scopedPath(activeWorld, "/maps")} className="nav-link" onClick={onClose}>
          <MapPinned size={18} />
          <span>{activeWorld ? "Карты мира" : "Карты"}</span>
        </NavLink>
        {sections.map(([label, path, Icon]) => (
          <NavLink key={path} to={scopedPath(activeWorld, `/category/${path}`)} className="nav-link" onClick={onClose}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
        {!activeWorld && <LoreDropdown />}
        {canEdit && (
          <NavLink to={activeWorld ? `/editor?world=${encodeURIComponent(activeWorld.title)}` : "/editor"} className="nav-link primary-link" onClick={onClose}>
            <Crosshair size={18} />
            <span>{activeWorld ? "Создать в мире" : "Создать статью"}</span>
          </NavLink>
        )}
        <NavLink to="/missing" className="nav-link" onClick={onClose}>
          <FileQuestion size={18} />
          <span>Ненаписанные статьи</span>
        </NavLink>
        {canEdit && (
          <NavLink to="/player-safety" className="nav-link" onClick={onClose}>
            <ShieldAlert size={18} />
            <span>Player Safety</span>
          </NavLink>
        )}
        <NavLink to="/health" className="nav-link" onClick={onClose}>
          <ShieldCheck size={18} />
          <span>Контроль vault</span>
        </NavLink>
        <NavLink to="/guide" className="nav-link" onClick={onClose}>
          <BookOpen size={18} />
          <span>Как пользоваться</span>
        </NavLink>
      </nav>
    </aside>
  );
}
