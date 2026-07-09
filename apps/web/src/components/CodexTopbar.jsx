import { Link, useLocation, useNavigate } from "react-router-dom";
import CommandSearch from "./CommandSearch.jsx";
import WorldAmbienceControl from "./world/WorldAmbienceControl.jsx";
import { Archive, LogIn, LogOut, Menu, NotebookPen, PenLine, Settings, Swords, UserRound } from "lucide-react";
import { getWorlds, worldRoute, worldSlug } from "../utils/worldContext.js";

const managementPaths = ["/my", "/players", "/profile", "/settings", "/gm-tools", "/health", "/foundry", "/missing", "/player-safety", "/admin"];
const gameTablePaths = ["/sessions", "/dice", "/handouts"];

function activeRole(session) {
  return String(session?.activeMembership?.role || "").toLowerCase();
}

function roleLabel(role, signedIn) {
  if (role === "owner") return "Owner";
  if (role === "gm") return "GM";
  if (role === "player") return "Player";
  return signedIn ? "No campaign" : "Guest";
}

function appSection(pathname = "") {
  if (managementPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return "management";
  if (gameTablePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return "gameTable";
  if (/^\/world\/[^/]+\/(session|reveal)/.test(pathname)) return "gameTable";
  return "campaignArchive";
}

function sectionMeta(section) {
  if (section === "management") return { label: "Management", icon: Settings, title: "Workspace, players and campaign settings" };
  if (section === "gameTable") return { label: "Game Table", icon: Swords, title: "Session tools and live table workspace" };
  return { label: "Campaign Archive", icon: Archive, title: "Archive, worlds and lore" };
}

export default function CodexTopbar({ session, pages, allPages, query, setQuery, onSelectPage, sidebarOpen, setSidebarOpen, activeWorld, worldTheme, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const section = appSection(location.pathname);
  const meta = sectionMeta(section);
  const SectionIcon = meta.icon;
  const hasMembership = Boolean(session?.activeMembership?.id);
  const signedIn = Boolean(session?.user);
  const campaignNavAvailable = !signedIn || hasMembership;
  const sourcePages = campaignNavAvailable ? allPages || pages : [];
  const visiblePages = campaignNavAvailable ? pages : [];
  const worlds = getWorlds(sourcePages);
  const worldCount = worlds.length;
  const publicCount = visiblePages.filter((page) => page.visibility === "public").length;
  const role = activeRole(session);
  const canManage = hasMembership && (role === "owner" || role === "gm");
  const showWorldSwitcher = campaignNavAvailable && section !== "management";

  function changeWorld(event) {
    const value = event.target.value;
    if (value === "archive") navigate("/archive");
    else {
      const world = worlds.find((item) => worldSlug(item) === value);
      if (world) navigate(worldRoute(world));
    }
  }

  return (
    <header className="topbar topbar-v2">
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Open navigation">
        <Menu size={20} />
      </button>

      <div className="app-section-chip" title={meta.title}>
        <SectionIcon size={16} />
        <span>{meta.label}</span>
      </div>

      {showWorldSwitcher ? (
        <div className="world-context-switcher" title="Switch Archive / World">
          <Archive size={16} />
          <select value={activeWorld ? worldSlug(activeWorld) : "archive"} onChange={changeWorld}>
            <option value="archive">Archive: all worlds</option>
            {worlds.map((world) => <option key={world.path} value={worldSlug(world)}>{world.title}</option>)}
          </select>
        </div>
      ) : campaignNavAvailable ? (
        <div className="world-context-switcher world-context-switcher-static" title="Management does not use active world filters">
          <Settings size={16} />
          <span>Management tools</span>
        </div>
      ) : (
        <div className="world-context-switcher world-context-switcher-static" title="No active campaign membership">
          <Archive size={16} />
          <span>No campaign yet</span>
        </div>
      )}

      {campaignNavAvailable && section !== "management" ? <CommandSearch pages={visiblePages} query={query} setQuery={setQuery} onSelectPage={onSelectPage} /> : <div className="topbar-spacer" />}

      {campaignNavAvailable && section !== "management" ? (
        <div className="top-quick-actions">
          <Link to="/notes" title="Quick note"><NotebookPen size={16} /> <span>Note</span></Link>
          {canManage && <Link to={activeWorld ? `/editor?world=${encodeURIComponent(activeWorld.title)}` : "/editor"} title="Quick create"><PenLine size={16} /> <span>Create</span></Link>}
        </div>
      ) : null}

      <div className="top-info top-info-v2">
        {showWorldSwitcher ? <WorldAmbienceControl theme={worldTheme} /> : null}
        {showWorldSwitcher ? <span><strong>{worldCount}</strong> worlds</span> : null}
        {showWorldSwitcher ? <span><strong>{publicCount}</strong> public</span> : null}
        <span>{section === "management" ? "No world filter" : activeWorld ? activeWorld.title : "Archive"}</span>
        <span>{roleLabel(role, signedIn)}</span>
      </div>
      <Link to="/profile" className="auth-chip auth-chip-link">
        <UserRound size={16} />
        {session?.user ? <span>{session.user.name || session.user.email}</span> : <span>Guest</span>}
      </Link>
      {session?.user ? (
        <button type="button" className="topbar-auth-button" onClick={onLogout} title="Log out"><LogOut size={16} /></button>
      ) : (
        <Link className="topbar-auth-button" to="/login" title="Log in"><LogIn size={16} /></Link>
      )}
    </header>
  );
}
