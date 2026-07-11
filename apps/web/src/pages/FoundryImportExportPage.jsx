import FoundryExportPanel from "../components/FoundryExportPanel.jsx";
import FoundryImportPanel from "../components/FoundryImportPanel.jsx";

export default function FoundryImportExportPage({ mode }) {
  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">Campaign integration</span>
        <h1>Foundry импорт / экспорт</h1>
        <p>Импорт и экспорт работают только внутри активной кампании. Данные других кампаний и их файлы не включаются.</p>
      </header>
      <div className="tool-grid">
        <FoundryImportPanel />
        <FoundryExportPanel mode={mode} />
      </div>
    </div>
  );
}
