import { useNavigate } from "react-router-dom";
import CommandSearch from "./CommandSearch.jsx";
import ModeToggle from "./ModeToggle.jsx";
import WorldAmbienceControl from "./world/WorldAmbienceControl.jsx";
import { Archive, Menu } from "lucide-react";
import { getWorlds, worldRoute, worldSlug } from "../utils/worldContext.js";

export default function CodexTopbar({ mode, setMode, session, pages, allPages, query, setQuery, onSelectPage, sidebarOpen, setSidebarOpen, activeWorld, worldTheme }) {
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
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Открыть навигацию">
        <Menu size={20} />
      </button>
      <div className="world-context-switcher" title="Переключить Архив / Мир">
        <Archive size={16} />
        <select value={activeWorld ? worldSlug(activeWorld) : "archive"} onChange={changeWorld}>
          <option value="archive">Архив: все миры</option>
          {worlds.map((world) => <option key={world.path} value={worldSlug(world)}>{world.title}</option>)}
        </select>
      </div>
      <CommandSearch pages={pages} query={query} setQuery={setQuery} onSelectPage={onSelectPage} />
      <div className="top-info">
        <WorldAmbienceControl theme={worldTheme} />
        <span><strong>{worldCount}</strong> миров</span>
        <span><strong>{publicCount}</strong> публично</span>
        <span>{activeWorld ? `Мир: ${activeWorld.title}` : "Общий Архив"}</span>
        <span>{session?.canEdit ? (mode === "gm" ? "GM" : "Player preview") : "LAN игрок"}</span>
      </div>
      <ModeToggle mode={mode} setMode={setMode} canEdit={Boolean(session?.canEdit)} />
    </header>
  );
}
