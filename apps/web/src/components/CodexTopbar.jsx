import { Link, useNavigate } from "react-router-dom";
import CommandSearch from "./CommandSearch.jsx";
import ModeToggle from "./ModeToggle.jsx";
import WorldAmbienceControl from "./world/WorldAmbienceControl.jsx";
import { Archive, LogIn, LogOut, Menu, NotebookPen, PenLine, UserRound } from "lucide-react";
import { getWorlds, worldRoute, worldSlug } from "../utils/worldContext.js";

function activeRole(session) {
  return String(session?.activeMembership?.role || "").toLowerCase();
}

export default function CodexTopbar({ mode, setMode, session, pages, allPages, query, setQuery, onSelectPage, sidebarOpen, setSidebarOpen, activeWorld, worldTheme, onLogout }) {
  const navigate = useNavigate();
  const hasMembership = Boolean(session?.activeMembership?.id);
  const signedIn = Boolean(session?.user);
  const campaignNavAvailable = !signedIn || hasMembership;
  const sourcePages = campaignNavAvailable ? allPages || pages : [];
  const visiblePages = campaignNavAvailable ? pages : [];
  const worlds = getWorlds(sourcePages);
  const worldCount = worlds.length;
  const publicCount = visiblePages.filter((page) => page.visibility === "public").length;
  const role = activeRole(session) || (signedIn ? "user" : "guest");
  const canManage = hasMembership && (role === "owner" || role === "gm");
  const isGm = canManage && mode === "gm";

  function changeWorld(event) {
    const value = event.target.value;
    if (value === "archive") navigate("/");
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
      {campaignNavAvailable ? (
        <>
          <div className="world-context-switcher" title="Switch Archive / World">
            <Archive size={16} />
            <select value={activeWorld ? worldSlug(activeWorld) : "archive"} onChange={changeWorld}>
              <option value="archive">Archive: all worlds</option>
              {worlds.map((world) => <option key={world.path} value={worldSlug(world)}>{world.title}</option>)}
            </select>
          </div>
          <CommandSearch pages={visiblePages} query={query} setQuery={setQuery} onSelectPage={onSelectPage} />
          <div className="top-quick-actions">
            <Link to="/notes" title="Quick note"><NotebookPen size={16} /> <span>Note</span></Link>
            {isGm && <Link to={activeWorld ? `/editor?world=${encodeURIComponent(activeWorld.title)}` : "/editor"} title="Quick create"><PenLine size={16} /> <span>Create</span></Link>}
          </div>
        </>
      ) : (
        <div className="world-context-switcher" title="No active campaign membership">
          <Archive size={16} />
          <span>No campaign yet</span>
        </div>
      )}
      <div className="top-info top-info-v2">
        {campaignNavAvailable ? <WorldAmbienceControl theme={worldTheme} /> : null}
        {campaignNavAvailable ? <span><strong>{worldCount}</strong> worlds</span> : null}
        {campaignNavAvailable ? <span><strong>{publicCount}</strong> public</span> : null}
        <span>{campaignNavAvailable ? activeWorld ? activeWorld.title : "Archive" : "Onboarding"}</span>
        <span>{isGm ? "GM" : role === "owner" ? "Owner" : role === "user" ? "No campaign" : "Player"}</span>
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
      <ModeToggle mode={mode} setMode={setMode} canEdit={canManage} />
    </header>
  );
}
