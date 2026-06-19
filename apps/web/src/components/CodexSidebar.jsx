import { Link, NavLink } from "react-router-dom";
import { BookOpen, Castle, Crosshair, Map, ScrollText, Swords, UsersRound, WandSparkles } from "lucide-react";
import LoreDropdown from "./LoreDropdown.jsx";

const sections = [
  ["NPCs", "npcs", UsersRound],
  ["Enemies", "enemies", Swords],
  ["Quests", "quests", ScrollText],
  ["Sessions", "sessions", BookOpen],
  ["Locations", "locations", Map]
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
          <span>Foundry Import/Export</span>
        </NavLink>
        <NavLink to="/editor" className="nav-link primary-link">
          <Crosshair size={18} />
          <span>Quick Create</span>
        </NavLink>
      </nav>
    </aside>
  );
}
