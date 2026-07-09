import { Link, NavLink } from "react-router-dom";
import {
  BookOpen,
  Castle,
  Clock3,
  Crosshair,
  FileQuestion,
  Globe2,
  Hammer,
  Home,
  Map,
  MapPinned,
  NotebookPen,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Swords,
  UserRound,
  UsersRound,
  Wrench,
  X
} from "lucide-react";
import LoreDropdown from "./LoreDropdown.jsx";
import { worldRoute } from "../utils/worldContext.js";

const codexSections = [
  ["Worlds", "/category/worlds", Globe2],
  ["Countries", "/category/countries", Map],
  ["Cities", "/category/cities", Castle],
  ["Locations", "/category/locations", MapPinned],
  ["NPC", "/category/npcs", UsersRound],
  ["Enemies", "/category/enemies", Swords],
  ["Quests", "/category/quests", ScrollText]
];

const playerSections = [
  ["Home", "/player", Home],
  ["Known Lore", "/archive", BookOpen],
  ["Handouts", "/handouts", Sparkles],
  ["Maps", "/maps", MapPinned],
  ["Timeline", "/timeline", Clock3],
  ["My Character", "/characters", UserRound],
  ["My Notes", "/notes", NotebookPen],
  ["Profile", "/profile", UserRound]
];

function scopedPath(activeWorld, path) {
  if (!activeWorld) return path;
  if (path === "/") return worldRoute(activeWorld);
  if (path === "/maps" || path === "/timeline") return `${worldRoute(activeWorld)}${path}`;
  if (path.startsWith("/category/")) return `${worldRoute(activeWorld)}${path}`;
  return path;
}

function NavGroup({ title, children }) {
  return (
    <div className="nav-group">
      <span className="nav-group-title">{title}</span>
      <div className="nav-group-links">{children}</div>
    </div>
  );
}

function NavItem({ to, icon: Icon, label, onClose, className = "" }) {
  return (
    <NavLink to={to} className={`nav-link ${className}`.trim()} onClick={onClose}>
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function CodexSidebar({ onClose, canEdit = false, activeWorld = null, signedIn = false, hasCampaignMembership = true }) {
  const brandTarget = activeWorld ? worldRoute(activeWorld) : "/";
  const showOnboardingNav = signedIn && !hasCampaignMembership;

  return (
    <aside className="sidebar sidebar-v2">
      <div className="sidebar-head">
        <Link to={brandTarget} className="brand" onClick={onClose}>
          <Castle />
          <span>{activeWorld ? activeWorld.title : "PF2 Party Codex"}</span>
        </Link>
        <button className="sidebar-close" onClick={onClose} title="Close navigation">
          <X size={18} />
        </button>
      </div>

      {activeWorld && !showOnboardingNav && (
        <div className="sidebar-world-card">
          <span className="kicker">Active world</span>
          <strong>{activeWorld.title}</strong>
          <p>{activeWorld.summary || "World filter is active. Navigation below shows this world's material."}</p>
          <Link to="/" onClick={onClose}><Home size={15} /> All worlds</Link>
        </div>
      )}

      <nav className="nav-stack nav-stack-v2" aria-label="Main navigation">
        {showOnboardingNav ? (
          <>
            <NavGroup title="Account setup">
              <NavItem to="/" icon={Sparkles} label="Start or join campaign" onClose={onClose} />
              <NavItem to="/profile" icon={UserRound} label="Profile" onClose={onClose} />
            </NavGroup>
            <NavGroup title="Help">
              <NavItem to="/guide" icon={BookOpen} label="Guide" onClose={onClose} />
            </NavGroup>
          </>
        ) : canEdit ? (
          <>
            <NavGroup title="GM Portal">
              <NavItem to="/" icon={Home} label="Dashboard" onClose={onClose} />
              <NavItem to="/archive" icon={BookOpen} label="Campaign Archive" onClose={onClose} />
              <NavItem to="/my" icon={UserRound} label="My Workspace" onClose={onClose} />
              <NavItem to="/players" icon={UsersRound} label="Players" onClose={onClose} />
            </NavGroup>

            <NavGroup title="World Codex">
              {codexSections.map(([label, path, Icon]) => (
                <NavItem key={path} to={scopedPath(activeWorld, path)} icon={Icon} label={label} onClose={onClose} />
              ))}
              <NavItem to={scopedPath(activeWorld, "/maps")} icon={MapPinned} label={activeWorld ? "World Maps" : "Maps"} onClose={onClose} />
              <NavItem to={scopedPath(activeWorld, "/timeline")} icon={Clock3} label={activeWorld ? "World Timeline" : "Timeline"} onClose={onClose} />
              {!activeWorld && <LoreDropdown />}
            </NavGroup>

            <NavGroup title="GM Operations">
              <NavItem to={activeWorld ? `/editor?world=${encodeURIComponent(activeWorld.title)}` : "/editor"} icon={Crosshair} label={activeWorld ? "Create in world" : "Create Article"} onClose={onClose} className="primary-link" />
              <NavItem to={activeWorld ? `${worldRoute(activeWorld)}/session` : "/sessions"} icon={BookOpen} label="Sessions" onClose={onClose} />
              <NavItem to={activeWorld ? `${worldRoute(activeWorld)}/reveal` : "/handouts"} icon={Sparkles} label="Reveal / Handouts" onClose={onClose} />
              <NavItem to="/characters" icon={UsersRound} label="Characters" onClose={onClose} />
              <NavItem to="/notes" icon={NotebookPen} label="Notes" onClose={onClose} />
            </NavGroup>

            <NavGroup title="System">
              <NavItem to="/settings" icon={Settings} label="Settings" onClose={onClose} />
              <NavItem to="/gm-tools" icon={Wrench} label="GM Tools" onClose={onClose} />
              <NavItem to="/health" icon={ShieldCheck} label="Vault Control" onClose={onClose} />
              <NavItem to="/foundry" icon={Hammer} label="Foundry Import/Export" onClose={onClose} />
              <NavItem to="/missing" icon={FileQuestion} label="Missing Articles" onClose={onClose} />
              <NavItem to="/player-safety" icon={ShieldAlert} label="Player Safety" onClose={onClose} />
              <NavItem to="/guide" icon={BookOpen} label="Guide" onClose={onClose} />
            </NavGroup>
          </>
        ) : (
          <>
            <NavGroup title="Player Portal">
              {playerSections.map(([label, path, Icon]) => (
                <NavItem key={path} to={scopedPath(activeWorld, path)} icon={Icon} label={label} onClose={onClose} />
              ))}
            </NavGroup>

            <NavGroup title="Campaign Archive">
              <NavItem to={scopedPath(activeWorld, "/category/worlds")} icon={Globe2} label="Worlds" onClose={onClose} />
              <NavItem to={scopedPath(activeWorld, "/category/npcs")} icon={UsersRound} label="Known NPC" onClose={onClose} />
              <NavItem to={scopedPath(activeWorld, "/category/locations")} icon={Map} label="Locations" onClose={onClose} />
              <NavItem to="/guide" icon={BookOpen} label="Guide" onClose={onClose} />
            </NavGroup>
          </>
        )}
      </nav>
    </aside>
  );
}
