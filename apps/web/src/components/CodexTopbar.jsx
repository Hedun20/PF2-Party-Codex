import CommandSearch from "./CommandSearch.jsx";
import ModeToggle from "./ModeToggle.jsx";
import { Menu } from "lucide-react";

export default function CodexTopbar({ mode, setMode, pages, query, setQuery, onSelectPage, sidebarOpen, setSidebarOpen }) {
  const worldCount = pages.filter((page) => page.category === "worlds").length;
  const publicCount = pages.filter((page) => page.visibility === "public").length;

  return (
    <header className="topbar">
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Открыть навигацию">
        <Menu size={20} />
      </button>
      <CommandSearch pages={pages} query={query} setQuery={setQuery} onSelectPage={onSelectPage} />
      <div className="top-info">
        <span><strong>{worldCount}</strong> миров</span>
        <span><strong>{publicCount}</strong> публично</span>
        <span>{mode === "gm" ? "GM-архив" : "Игроки"}</span>
      </div>
      <ModeToggle mode={mode} setMode={setMode} />
    </header>
  );
}
