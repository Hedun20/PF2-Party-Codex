import FoundryExportPanel from "../components/FoundryExportPanel.jsx";
import FoundryImportPanel from "../components/FoundryImportPanel.jsx";

export default function FoundryImportExportPage({ mode }) {
  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">Legacy-инструмент</span>
        <h1>Foundry импорт / экспорт</h1>
        <p>Раздел скрыт из основной навигации. Код оставлен для будущего импорта журналов, но текущий фокус — локальный Markdown-vault и PNG-карты.</p>
      </header>
      <div className="tool-grid">
        <FoundryImportPanel />
        <FoundryExportPanel mode={mode} />
      </div>
    </div>
  );
}
