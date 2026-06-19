import { Link, NavLink } from "react-router-dom";
import { BookOpen, Castle, Crosshair, Globe2, Map, ScrollText, Swords, UsersRound, X } from "lucide-react";
import LoreDropdown from "./LoreDropdown.jsx";

const sections = [
  ["Миры", "worlds", Globe2],
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
        {sections.map(([label, path, Icon]) => (
          <NavLink key={path} to={`/category/${path}`} className="nav-link" onClick={onClose}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
        <LoreDropdown />
        <NavLink to="/editor" className="nav-link primary-link" onClick={onClose}>
          <Crosshair size={18} />
          <span>Быстро создать</span>
        </NavLink>
      </nav>
    </aside>
  );
}
