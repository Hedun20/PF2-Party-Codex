import CommandSearch from "./CommandSearch.jsx";
import ModeToggle from "./ModeToggle.jsx";

export default function CodexTopbar({ mode, setMode, pages, query, setQuery, onSelectPage }) {
  return (
    <header className="topbar">
      <CommandSearch pages={pages} query={query} setQuery={setQuery} onSelectPage={onSelectPage} />
      <ModeToggle mode={mode} setMode={setMode} />
    </header>
  );
}
