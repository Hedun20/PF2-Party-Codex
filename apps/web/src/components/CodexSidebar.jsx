import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Archive,
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

const managementPaths = ["/my", "/players", "/profile", "/settings", "/gm-tools", "/health", "/foundry", "/missing", "/player-safety", "/admin"];
const gameTablePaths = ["/sessions", "/dice", "/handouts"];

function appSection(pathname = "") {
  if (managementPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return "management";
  if (gameTablePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return "gameTable";
  if (/^\/world\/[^/]+\/(session|reveal)/.test(pathname)) return "gameTable";
  return "campaignArchive";
}

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

function SectionSwitch({ section, onClose, canEdit }) {
  return (
    <div className="sidebar-section-switch">
      <NavLink to="/archive" className={section === "campaignArchive" ? "is-active" : ""} onClick={onClose}><Archive size={15} /> Archive</NavLink>
      <NavLink to="/sessions" className={section === "gameTable" ? "is-active" : ""} onClick={onClose}><Swords size={15} /> Game Table</NavLink>
      {canEdit ? <NavLink to="/my" className={section === "management" ? "is-active" : ""} onClick={onClose}><Settings size={15} /> Management</NavLink> : <NavLink to="/profile" className={section === "management" ? "is-active" : ""} onClick={onClose}><UserRound size={15} /> Profile</NavLink>}
    </div>
  );
}

export default function CodexSidebar({ onClose, canEdit = false, activeWorld = null, signedIn = false, hasCampaignMembership = true }) {
  const location = useLocation();
  const section = appSection(location.pathname);
  const brandTarget = activeWorld && section !== "management" ? worldRoute(activeWorld) : "/";
  const showOnboardingNav = signedIn && !hasCampaignMembership;
  const showActiveWorld = Boolean(activeWorld) && !showOnboardingNav && section !== "management";

  return (
    <aside className="sidebar sidebar-v2">
      <div className="sidebar-head">
        <Link to={brandTarget} className="brand" onClick={onClose}>
          <Castle />
          <span>{activeWorld && section !== "management" ? activeWorld.title : "PF2 Party Codex"}</span>
        </Link>
        <button className="sidebar-close" onClick={onClose} title="Close navigation">
          <X size={18} />
        </button>
      </div>

      {!showOnboardingNav ? <SectionSwitch section={section} onClose={onClose} canEdit={canEdit} /> : null}

      {showActiveWorld && (
        <div className="sidebar-world-card">
          <span className="kicker">Active world</span>
          <strong>{activeWorld.title}</strong>
          <p>{activeWorld.summary || "World filter is active. Navigation below shows this world's material."}</p>
          <Link to="/archive" onClick={onClose}><Home size={15} /> All worlds</Link>
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
            {section === "campaignArchive" ? (
              <>
                <NavGroup title="Campaign Archive">
                  <NavItem to="/" icon={Home} label="Archive Dashboard" onClose={onClose} />
                  <NavItem to="/archive" icon={BookOpen} label="Campaign Archive" onClose={onClose} />
                  {codexSections.map(([label, path, Icon]) => (
                    <NavItem key={path} to={scopedPath(activeWorld, path)} icon={Icon} label={label} onClose={onClose} />
                  ))}
                  <NavItem to={scopedPath(activeWorld, "/maps")} icon={MapPinned} label={activeWorld ? "World Maps" : "Maps"} onClose={onClose} />
                  <NavItem to={scopedPath(activeWorld, "/timeline")} icon={Clock3} label={activeWorld ? "World Timeline" : "Timeline"} onClose={onClose} />
                  <NavItem to="/handouts" icon={Sparkles} label="Handouts" onClose={onClose} />
                  <NavItem to="/notes" icon={NotebookPen} label="Notes" onClose={onClose} />
                  {!activeWorld && <LoreDropdown />}
                </NavGroup>
                <NavGroup title="Create">
                  <NavItem to={activeWorld ? `/editor?world=${encodeURIComponent(activeWorld.title)}` : "/editor"} icon={Crosshair} label={activeWorld ? "Create in world" : "Create material"} onClose={onClose} className="primary-link" />
                </NavGroup>
              </>
            ) : null}

            {section === "gameTable" ? (
              <NavGroup title="Game Table">
                <NavItem to="/sessions" icon={BookOpen} label="Session Dashboard" onClose={onClose} />
                <NavItem to={activeWorld ? `${worldRoute(activeWorld)}/session` : "/sessions"} icon={Swords} label="Current Session" onClose={onClose} />
                <NavItem to="/sessions" icon={Clock3} label="Session Prep" onClose={onClose} />
                <NavItem to={activeWorld ? `${worldRoute(activeWorld)}/reveal` : "/handouts"} icon={Sparkles} label="Reveal / Handouts" onClose={onClose} />
                <NavItem to={scopedPath(activeWorld, "/maps")} icon={MapPinned} label="Session Maps" onClose={onClose} />
                <NavItem to="/characters" icon={UsersRound} label="Characters / Party" onClose={onClose} />
                <NavItem to="/notes" icon={NotebookPen} label="Session Notes" onClose={onClose} />
              </NavGroup>
            ) : null}

            {section === "management" ? (
              <>
                <NavGroup title="Management">
                  <NavItem to="/my" icon={UserRound} label="My Workspace" onClose={onClose} />
                  <NavItem to="/players" icon={UsersRound} label="Players & Invitations" onClose={onClose} />
                  <NavItem to="/settings" icon={Settings} label="Campaign Settings" onClose={onClose} />
                  <NavItem to="/profile" icon={UserRound} label="Profile" onClose={onClose} />
                </NavGroup>
                <NavGroup title="GM Tools">
                  <NavItem to="/gm-tools" icon={Wrench} label="GM Tools" onClose={onClose} />
                  <NavItem to="/health" icon={ShieldCheck} label="Vault Health" onClose={onClose} />
                  <NavItem to="/foundry" icon={Hammer} label="Import / Export" onClose={onClose} />
                  <NavItem to="/missing" icon={FileQuestion} label="Missing Articles" onClose={onClose} />
                  <NavItem to="/player-safety" icon={ShieldAlert} label="Player Safety" onClose={onClose} />
                </NavGroup>
              </>
            ) : null}

            <NavGroup title="Help">
              <NavItem to="/guide" icon={BookOpen} label="Guide" onClose={onClose} />
            </NavGroup>
          </>
        ) : (
          <>
            {section === "management" ? (
              <NavGroup title="Player Profile">
                <NavItem to="/profile" icon={UserRound} label="Profile" onClose={onClose} />
                <NavItem to="/guide" icon={BookOpen} label="Guide" onClose={onClose} />
              </NavGroup>
            ) : (
              <>
                <NavGroup title="Player Portal">
                  <NavItem to="/player" icon={Home} label="Home" onClose={onClose} />
                  <NavItem to="/characters" icon={UserRound} label="My Character" onClose={onClose} />
                  <NavItem to="/notes" icon={NotebookPen} label="My Notes" onClose={onClose} />
                  <NavItem to="/handouts" icon={Sparkles} label="Handouts" onClose={onClose} />
                </NavGroup>
                <NavGroup title="Campaign Archive">
                  <NavItem to="/archive" icon={BookOpen} label="Known Lore" onClose={onClose} />
                  <NavItem to={scopedPath(activeWorld, "/category/worlds")} icon={Globe2} label="Worlds" onClose={onClose} />
                  <NavItem to={scopedPath(activeWorld, "/category/npcs")} icon={UsersRound} label="Known NPC" onClose={onClose} />
                  <NavItem to={scopedPath(activeWorld, "/category/locations")} icon={Map} label="Locations" onClose={onClose} />
                  <NavItem to="/maps" icon={MapPinned} label="Maps" onClose={onClose} />
                  <NavItem to="/timeline" icon={Clock3} label="Timeline" onClose={onClose} />
                  <NavItem to="/guide" icon={BookOpen} label="Guide" onClose={onClose} />
                </NavGroup>
              </>
            )}
          </>
        )}
      </nav>
    </aside>
  );
}
