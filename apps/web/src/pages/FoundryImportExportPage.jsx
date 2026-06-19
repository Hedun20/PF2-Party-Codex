import FoundryExportPanel from "../components/FoundryExportPanel.jsx";
import FoundryImportPanel from "../components/FoundryImportPanel.jsx";

export default function FoundryImportExportPage({ mode }) {
  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">Foundry Journals</span>
        <h1>Import / Export</h1>
        <p>Preview imports before writing Markdown. Test exports in a backup Foundry world first.</p>
      </header>
      <div className="tool-grid">
        <FoundryImportPanel />
        <FoundryExportPanel mode={mode} />
      </div>
    </div>
  );
}
