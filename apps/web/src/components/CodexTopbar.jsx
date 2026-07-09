import { Link, useLocation, useNavigate } from "react-router-dom";
import CommandSearch from "./CommandSearch.jsx";
import WorldAmbienceControl from "./world/WorldAmbienceControl.jsx";
import { Archive, Dices, LogIn, LogOut, Menu, NotebookPen, PenLine, Settings, Sparkles, UserRound, UsersRound } from "lucide-react";
import { getWorlds, worldSlug } from "../utils/worldContext.js";
import { changeScopePath, modeHome, modeMeta, pageToolFromPath, scopeLabel, shellModeFromPath } from "../utils/shellContext.js";

function activeRole(session) {
  return String(session?.activeMembership?.role || "").toLowerCase();
}

function roleLabel(role, signedIn) {
  if (role === "owner") return "Owner";
  if (role === "gm") return "GM";
  if (role === "player") return "Player";
  return signedIn ? "No campaign" : "Guest";
}

function modeClass(mode, currentMode) {
  return `top-mode-link ${mode === currentMode ? "is-active" : ""}`.trim();
}

export default function CodexTopbar({ session, pages, allPages, query, setQuery, onSelectPage, sidebarOpen, setSidebarOpen, activeWorld, worldTheme, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentMode = shellModeFromPath(location.pathname);
  const meta = modeMeta(currentMode);
  const hasMembership = Boolean(session?.activeMembership?.id);
  const signedIn = Boolean(session?.user);
  const campaignNavAvailable = signedIn && hasMembership;
  const sourcePages = campaignNavAvailable ? allPages || pages : [];
  const visiblePages = campaignNavAvailable ? pages : [];
  const worlds = getWorlds(sourcePages);
  const worldCount = worlds.length;
  const publicCount = visiblePages.filter((page) => page.visibility === "public").length;
  const role = activeRole(session);
  const canManage = hasMembership && (role === "owner" || role === "gm");
  const showSearch = campaignNavAvailable && currentMode !== "management";
  const toolLabel = pageToolFromPath(location.pathname);
  const campaignName = session?.activeCampaign?.name || "Campaign";

  function changeWorld(event) {
    const value = event.target.value;
    if (value === "campaign") {
      navigate(changeScopePath(location.pathname, location.search, null));
      return;
    }
    const world = worlds.find((item) => worldSlug(item) === value);
    if (world) navigate(changeScopePath(location.pathname, location.search, world));
  }

  return (
    <header className="topbar topbar-v2 topbar-mode-scope">
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Open navigation">
        <Menu size={20} />
      </button>

      <div className="topbar-context-trail" title={meta.title}>
        <span>{campaignName}</span>
        <strong>{meta.label}</strong>
        <span>{toolLabel}</span>
      </div>

      {campaignNavAvailable ? (
        <nav className="top-mode-switch" aria-label="Workspace mode">
          <Link to={modeHome("archive", canManage, activeWorld)} className={modeClass("archive", currentMode)}><Archive size={15} /><span>Архив</span></Link>
          <Link to={modeHome("table", canManage, activeWorld)} className={modeClass("table", currentMode)}><Dices size={15} /><span>Игровой стол</span></Link>
          <Link to={modeHome("management", canManage, activeWorld)} className={modeClass("management", currentMode)}><Settings size={15} /><span>{canManage ? "Управление" : "Профиль"}</span></Link>
        </nav>
      ) : null}

      {campaignNavAvailable ? (
        <div className="world-context-switcher mode-scope-switcher" title="Scope inside selected mode">
          <Sparkles size={16} />
          <select value={activeWorld ? worldSlug(activeWorld) : "campaign"} onChange={changeWorld}>
            <option value="campaign">Scope: вся кампания</option>
            {worlds.map((world) => <option key={world.path} value={worldSlug(world)}>Scope: {world.title}</option>)}
          </select>
        </div>
      ) : (
        <div className="world-context-switcher world-context-switcher-static" title="No active campaign membership">
          <Archive size={16} />
          <span>No campaign yet</span>
        </div>
      )}

      {showSearch ? <CommandSearch pages={visiblePages} query={query} setQuery={setQuery} onSelectPage={onSelectPage} /> : <div className="topbar-spacer" />}

      {campaignNavAvailable ? (
        <div className="top-quick-actions top-quick-actions-contextual">
          {currentMode === "archive" && canManage ? <Link to={activeWorld ? `/editor?world=${encodeURIComponent(activeWorld.title)}` : "/editor"} title="Create archive entry"><PenLine size={16} /> <span>Create</span></Link> : null}
          {currentMode === "table" ? <Link to={activeWorld ? `/dice?world=${encodeURIComponent(worldSlug(activeWorld))}` : "/dice"} title="Dice tray"><Dices size={16} /> <span>Dice</span></Link> : null}
          {currentMode === "table" ? <Link to={activeWorld ? `/handouts?world=${encodeURIComponent(worldSlug(activeWorld))}` : "/handouts"} title="Handouts"><Sparkles size={16} /> <span>Handouts</span></Link> : null}
          {currentMode === "management" && canManage ? <Link to="/players" title="Players and invitations"><UsersRound size={16} /> <span>Players</span></Link> : null}
          {currentMode !== "management" ? <Link to={activeWorld ? `/notes?world=${encodeURIComponent(worldSlug(activeWorld))}` : "/notes"} title="Quick note"><NotebookPen size={16} /> <span>Note</span></Link> : null}
        </div>
      ) : null}

      <div className="top-info top-info-v2">
        {campaignNavAvailable ? <WorldAmbienceControl theme={worldTheme} /> : null}
        {campaignNavAvailable ? <span><strong>{worldCount}</strong> worlds</span> : null}
        {campaignNavAvailable ? <span><strong>{publicCount}</strong> visible</span> : null}
        <span>{scopeLabel(activeWorld)}</span>
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
