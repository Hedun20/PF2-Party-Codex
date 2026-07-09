import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Archive,
  BookOpen,
  Castle,
  Clock3,
  Crosshair,
  Dices,
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
import { modeHome, modeMeta, scopedPath, scopeKicker, scopeLabel, shellModeFromLocation } from "../utils/shellContext.js";

const codexSections = [
  ["Worlds", "/category/worlds", Globe2],
  ["Countries", "/category/countries", Map],
  ["Cities", "/category/cities", Castle],
  ["Locations", "/category/locations", MapPinned],
  ["NPC", "/category/npcs", UsersRound],
  ["Enemies", "/category/enemies", Swords],
  ["Quests", "/category/quests", ScrollText]
];

function NavGroup({ title, children, hint = "" }) {
  return (
    <div className="nav-group">
      <span className="nav-group-title">{title}</span>
      {hint ? <span className="nav-group-hint">{hint}</span> : null}
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

function ArchiveTools({ activeWorld, onClose, canEdit }) {
  return (
    <>
      <NavGroup title="Архив" hint={activeWorld ? `Scope: ${activeWorld.title}` : "Scope: вся кампания"}>
        <NavItem to={scopedPath("/archive", activeWorld)} icon={Archive} label="Archive overview" onClose={onClose} />
        {codexSections.map(([label, path, Icon]) => (
          <NavItem key={path} to={scopedPath(path, activeWorld)} icon={Icon} label={label} onClose={onClose} />
        ))}
        <NavItem to={scopedPath("/maps", activeWorld)} icon={MapPinned} label={activeWorld ? "World Maps" : "Maps"} onClose={onClose} />
        <NavItem to={scopedPath("/timeline", activeWorld)} icon={Clock3} label={activeWorld ? "World Timeline" : "Timeline"} onClose={onClose} />
        <NavItem to={scopedPath("/handouts", activeWorld)} icon={Sparkles} label="Handouts" onClose={onClose} />
        <NavItem to={scopedPath("/notes", activeWorld)} icon={NotebookPen} label="Notes" onClose={onClose} />
        <LoreDropdown activeWorld={activeWorld} />
      </NavGroup>

      {canEdit ? (
        <NavGroup title="Create">
          <NavItem to={activeWorld ? `/editor?world=${encodeURIComponent(activeWorld.title)}` : "/editor"} icon={Crosshair} label={activeWorld ? "Create in world" : "Create material"} onClose={onClose} className="primary-link" />
        </NavGroup>
      ) : null}
    </>
  );
}

function TableTools({ activeWorld, onClose }) {
  return (
    <NavGroup title="Игровой стол" hint={activeWorld ? `Scope: ${activeWorld.title}` : "Scope: вся кампания"}>
      <NavItem to={scopedPath("/session-desk", activeWorld)} icon={Dices} label="Session Desk" onClose={onClose} />
      <NavItem to={scopedPath("/sessions", activeWorld)} icon={Swords} label="Current Session" onClose={onClose} />
      <NavItem to={scopedPath("/dice", activeWorld)} icon={Dices} label="Dice Tray" onClose={onClose} />
      <NavItem to={scopedPath("/notes", activeWorld, { mode: "table" })} icon={NotebookPen} label="Quick Notes" onClose={onClose} />
      <NavItem to={scopedPath("/handouts", activeWorld, { mode: "table" })} icon={Sparkles} label="Reveal / Handouts" onClose={onClose} />
      <NavItem to={scopedPath("/characters", activeWorld)} icon={UsersRound} label="Characters / Party" onClose={onClose} />
      <NavItem to={scopedPath("/maps", activeWorld, { mode: "table" })} icon={MapPinned} label="Session Maps" onClose={onClose} />
      <NavItem to={scopedPath("/archive", activeWorld)} icon={BookOpen} label="Quick Archive" onClose={onClose} />
    </NavGroup>
  );
}

function ManagementTools({ activeWorld, onClose, canEdit }) {
  if (!canEdit) {
    return (
      <NavGroup title="Профиль">
        <NavItem to="/profile" icon={UserRound} label="Profile" onClose={onClose} />
        <NavItem to="/settings" icon={Settings} label="Settings" onClose={onClose} />
        <NavItem to="/guide" icon={BookOpen} label="Guide" onClose={onClose} />
      </NavGroup>
    );
  }

  return (
    <>
      <NavGroup title="Управление кампанией" hint="Campaign-wide by default">
        <NavItem to="/my" icon={UserRound} label="My Workspace" onClose={onClose} />
        <NavItem to="/players" icon={UsersRound} label="Players & Invitations" onClose={onClose} />
        <NavItem to="/settings" icon={Settings} label="Campaign Settings" onClose={onClose} />
        <NavItem to="/profile" icon={UserRound} label="Profile" onClose={onClose} />
      </NavGroup>

      {activeWorld ? (
        <NavGroup title="Управление миром" hint={activeWorld.title}>
          <NavItem to={scopedPath("/settings", activeWorld)} icon={Sparkles} label="World theme / assets" onClose={onClose} />
          <NavItem to={scopedPath("/archive", activeWorld)} icon={Archive} label="Open world archive" onClose={onClose} />
        </NavGroup>
      ) : null}

      <NavGroup title="GM Tools">
        <NavItem to="/gm-tools" icon={Wrench} label="GM Tools" onClose={onClose} />
        <NavItem to="/health" icon={ShieldCheck} label="Vault Health" onClose={onClose} />
        <NavItem to="/foundry" icon={Hammer} label="Import / Export" onClose={onClose} />
        <NavItem to="/missing" icon={FileQuestion} label="Missing Articles" onClose={onClose} />
        <NavItem to="/player-safety" icon={ShieldAlert} label="Player Safety" onClose={onClose} />
      </NavGroup>
    </>
  );
}

function DashboardTools({ activeWorld, onClose, canEdit }) {
  return (
    <>
      <NavGroup title="Dashboard">
        <NavItem to="/" icon={Home} label="Campaign dashboard" onClose={onClose} />
      </NavGroup>
      <NavGroup title="Выберите режим">
        <NavItem to={scopedPath("/archive", activeWorld)} icon={Archive} label="Архив" onClose={onClose} />
        <NavItem to={scopedPath("/session-desk", activeWorld)} icon={Dices} label="Игровой стол" onClose={onClose} />
        <NavItem to={modeHome("management", canEdit, activeWorld)} icon={Settings} label={canEdit ? "Управление" : "Профиль"} onClose={onClose} />
      </NavGroup>
    </>
  );
}

function PlayerTools({ mode, activeWorld, onClose }) {
  if (mode === "management") return <ManagementTools activeWorld={activeWorld} onClose={onClose} canEdit={false} />;
  if (mode === "table") return <TableTools activeWorld={activeWorld} onClose={onClose} />;
  if (mode === "dashboard") return <DashboardTools activeWorld={activeWorld} onClose={onClose} canEdit={false} />;

  return (
    <>
      <ArchiveTools activeWorld={activeWorld} onClose={onClose} canEdit={false} />
      <NavGroup title="Player">
        <NavItem to={scopedPath("/player", activeWorld)} icon={Home} label="Player home" onClose={onClose} />
        <NavItem to={scopedPath("/characters", activeWorld)} icon={UserRound} label="My Character" onClose={onClose} />
      </NavGroup>
    </>
  );
}

export default function CodexSidebar({ onClose, canEdit = false, activeWorld = null, signedIn = false, hasCampaignMembership = true }) {
  const location = useLocation();
  const mode = shellModeFromLocation(location.pathname, location.search);
  const meta = modeMeta(mode);
  const brandTarget = modeHome(mode, canEdit, activeWorld);
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

      {signedIn && !showOnboardingNav ? (
        <div className="sidebar-context-card">
          <span className="kicker">{meta.label}</span>
          <strong>{scopeLabel(activeWorld)}</strong>
          <p>{scopeKicker(activeWorld)}. Sidebar shows tools for the selected mode only.</p>
          {activeWorld ? <Link to={modeHome(mode, canEdit, null)} onClick={onClose}><Home size={15} /> Вся кампания</Link> : null}
        </div>
      ) : null}

      <nav className="nav-stack nav-stack-v2" aria-label="Main navigation">
        {!signedIn ? (
          <>
            <NavGroup title="Campaign access">
              <NavItem to="/login" icon={UserRound} label="Login / Register" onClose={onClose} />
            </NavGroup>
            <NavGroup title="Invitation">
              <NavItem to="/login" icon={Sparkles} label="Open invite link after login" onClose={onClose} />
            </NavGroup>
            <NavGroup title="Help">
              <NavItem to="/guide" icon={BookOpen} label="Guide" onClose={onClose} />
            </NavGroup>
          </>
        ) : showOnboardingNav ? (
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
            {mode === "dashboard" ? <DashboardTools activeWorld={activeWorld} onClose={onClose} canEdit={canEdit} /> : null}
            {mode === "archive" ? <ArchiveTools activeWorld={activeWorld} onClose={onClose} canEdit={canEdit} /> : null}
            {mode === "table" ? <TableTools activeWorld={activeWorld} onClose={onClose} /> : null}
            {mode === "management" ? <ManagementTools activeWorld={activeWorld} onClose={onClose} canEdit={canEdit} /> : null}
            <NavGroup title="Help">
              <NavItem to="/guide" icon={BookOpen} label="Guide" onClose={onClose} />
            </NavGroup>
          </>
        ) : (
          <>
            <PlayerTools mode={mode} activeWorld={activeWorld} onClose={onClose} />
            <NavGroup title="Help">
              <NavItem to="/guide" icon={BookOpen} label="Guide" onClose={onClose} />
            </NavGroup>
          </>
        )}
      </nav>
    </aside>
  );
}
