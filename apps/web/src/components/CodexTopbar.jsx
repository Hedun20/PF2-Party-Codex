import { Link, useNavigate } from "react-router-dom";
import CommandSearch from "./CommandSearch.jsx";
import ModeToggle from "./ModeToggle.jsx";
import WorldAmbienceControl from "./world/WorldAmbienceControl.jsx";
import { Archive, LogIn, LogOut, Menu, UserRound } from "lucide-react";
import { getWorlds, worldRoute, worldSlug } from "../utils/worldContext.js";

export default function CodexTopbar({ mode, setMode, session, pages, allPages, query, setQuery, onSelectPage, sidebarOpen, setSidebarOpen, activeWorld, worldTheme, onLogout }) {
  const navigate = useNavigate();
  const sourcePages = allPages || pages;
  const worlds = getWorlds(sourcePages);
  const worldCount = worlds.length;
  const publicCount = pages.filter((page) => page.visibility === "public").length;

  function changeWorld(event) {
    const value = event.target.value;
    if (value === "archive") navigate("/");
    else {
      const world = worlds.find((item) => worldSlug(item) === value);
      if (world) navigate(worldRoute(world));
    }
  }

  return (
    <header className="topbar">
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Open navigation">
        <Menu size={20} />
      </button>
      <div className="world-context-switcher" title="Switch Archive / World">
        <Archive size={16} />
        <select value={activeWorld ? worldSlug(activeWorld) : "archive"} onChange={changeWorld}>
          <option value="archive">Archive: all worlds</option>
          {worlds.map((world) => <option key={world.path} value={worldSlug(world)}>{world.title}</option>)}
        </select>
      </div>
      <CommandSearch pages={pages} query={query} setQuery={setQuery} onSelectPage={onSelectPage} />
      <div className="top-info">
        <WorldAmbienceControl theme={worldTheme} />
        <span><strong>{worldCount}</strong> worlds</span>
        <span><strong>{publicCount}</strong> public</span>
        <span>{activeWorld ? `World: ${activeWorld.title}` : "Archive"}</span>
        <span>{session?.canEdit ? (mode === "gm" ? "GM" : "Player preview") : "Player"}</span>
      </div>
      <div className="auth-chip">
        <UserRound size={16} />
        {session?.user ? <span>{session.user.name || session.user.email}</span> : <span>Guest</span>}
        {session?.user ? (
          <button type="button" onClick={onLogout} title="Log out"><LogOut size={16} /></button>
        ) : (
          <Link to="/login" title="Log in"><LogIn size={16} /></Link>
        )}
      </div>
      <ModeToggle mode={mode} setMode={setMode} canEdit={Boolean(session?.canEdit)} />
    </header>
  );
}