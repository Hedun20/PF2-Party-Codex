import { Link, NavLink } from "react-router-dom";
import { BookOpen, Castle, Clock3, Crosshair, FileQuestion, Globe2, Map, MapPinned, ScrollText, ShieldCheck, Swords, UsersRound, X } from "lucide-react";
import LoreDropdown from "./LoreDropdown.jsx";

const sections = [
  ["Страны", "countries", Map],
  ["Города", "cities", Castle],
  ["NPC", "npcs", UsersRound],
  ["Враги", "enemies", Swords],
  ["Квесты", "quests", ScrollText],
  ["Сессии", "sessions", BookOpen],
  ["Локации", "locations", Map]
];

export default function CodexSidebar({ onClose }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <Link to="/" className="brand" onClick={onClose}>
          <Castle />
          <span>PF2 Party Codex</span>
        </Link>
        <button className="sidebar-close" onClick={onClose} title="Закрыть навигацию">
          <X size={18} />
        </button>
      </div>
      <nav className="nav-stack">
        <NavLink to="/category/worlds" className="nav-link" onClick={onClose}>
          <Globe2 size={18} />
          <span>Миры</span>
        </NavLink>
        <NavLink to="/timeline" className="nav-link" onClick={onClose}>
          <Clock3 size={18} />
          <span>Timeline</span>
        </NavLink>
        <NavLink to="/maps" className="nav-link" onClick={onClose}>
          <MapPinned size={18} />
          <span>Карты</span>
        </NavLink>
        {sections.map(([label, path, Icon]) => (
          <NavLink key={path} to={`/category/${path}`} className="nav-link" onClick={onClose}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
        <LoreDropdown />
        <NavLink to="/editor" className="nav-link primary-link" onClick={onClose}>
          <Crosshair size={18} />
          <span>Создать статью</span>
        </NavLink>
        <NavLink to="/missing" className="nav-link" onClick={onClose}>
          <FileQuestion size={18} />
          <span>Ненаписанные статьи</span>
        </NavLink>
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
