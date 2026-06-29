import { Link, NavLink } from "react-router-dom";
import { BookOpen, Castle, Clock3, Crosshair, FileQuestion, Globe2, Home, Map, MapPinned, NotebookPen, ScrollText, ShieldAlert, ShieldCheck, Swords, UserRound, UsersRound, X } from "lucide-react";
import LoreDropdown from "./LoreDropdown.jsx";
import { worldRoute } from "../utils/worldContext.js";

const sections = [
  ["Countries", "countries", Map],
  ["Cities", "cities", Castle],
  ["NPC", "npcs", UsersRound],
  ["Enemies", "enemies", Swords],
  ["Quests", "quests", ScrollText],
  ["Sessions", "sessions", BookOpen],
  ["Locations", "locations", Map]
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
        <button className="sidebar-close" onClick={onClose} title="Close navigation">
          <X size={18} />
        </button>
      </div>
      {activeWorld && (
        <div className="sidebar-world-card">
          <span className="kicker">Active world</span>
          <strong>{activeWorld.title}</strong>
          <p>{activeWorld.summary || "World filter is active. Navigation below shows this world's material."}</p>
          <Link to="/" onClick={onClose}><Home size={15} /> All worlds</Link>
        </div>
      )}
      <nav className="nav-stack">
        <NavLink to="/category/worlds" className="nav-link" onClick={onClose}>
          <Globe2 size={18} />
          <span>Worlds</span>
        </NavLink>
        <NavLink to={scopedPath(activeWorld, "/timeline")} className="nav-link" onClick={onClose}>
          <Clock3 size={18} />
          <span>{activeWorld ? "World timeline" : "Timeline"}</span>
        </NavLink>
        <NavLink to={scopedPath(activeWorld, "/maps")} className="nav-link" onClick={onClose}>
          <MapPinned size={18} />
          <span>{activeWorld ? "World maps" : "Maps"}</span>
        </NavLink>
        <NavLink to="/notes" className="nav-link" onClick={onClose}>
          <NotebookPen size={18} />
          <span>Notes</span>
        </NavLink>
        <NavLink to="/characters" className="nav-link" onClick={onClose}>
          <UserRound size={18} />
          <span>Characters</span>
        </NavLink>
        {activeWorld && (
          <NavLink to={`${worldRoute(activeWorld)}/player`} className="nav-link" onClick={onClose}>
            <NotebookPen size={18} />
            <span>Player portal</span>
          </NavLink>
        )}
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
            <span>{activeWorld ? "Create in world" : "Create article"}</span>
          </NavLink>
        )}
        {canEdit && (
          <NavLink to="/missing" className="nav-link" onClick={onClose}>
            <FileQuestion size={18} />
            <span>Missing articles</span>
          </NavLink>
        )}
        {canEdit && (
          <NavLink to="/player-safety" className="nav-link" onClick={onClose}>
            <ShieldAlert size={18} />
            <span>Player Safety</span>
          </NavLink>
        )}
        {canEdit && (
          <NavLink to="/health" className="nav-link" onClick={onClose}>
            <ShieldCheck size={18} />
            <span>Vault control</span>
          </NavLink>
        )}
        <NavLink to="/guide" className="nav-link" onClick={onClose}>
          <BookOpen size={18} />
          <span>Guide</span>
        </NavLink>
      </nav>
    </aside>
  );
}