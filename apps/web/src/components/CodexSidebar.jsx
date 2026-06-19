import { Link, NavLink } from "react-router-dom";
import { BookOpen, Castle, Crosshair, Globe2, Map, ScrollText, Swords, UsersRound, WandSparkles } from "lucide-react";
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

export default function CodexSidebar() {
  return (
    <aside className="sidebar">
      <Link to="/" className="brand">
        <Castle />
        <span>PF2 Party Codex</span>
      </Link>
      <nav className="nav-stack">
        {sections.map(([label, path, Icon]) => (
          <NavLink key={path} to={`/category/${path}`} className="nav-link">
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
        <LoreDropdown />
        <NavLink to="/foundry" className="nav-link">
          <WandSparkles size={18} />
          <span>Foundry импорт/экспорт</span>
        </NavLink>
        <NavLink to="/editor" className="nav-link primary-link">
          <Crosshair size={18} />
          <span>Быстро создать</span>
        </NavLink>
      </nav>
    </aside>
  );
}
