import FoundryExportPanel from "../components/FoundryExportPanel.jsx";
import FoundryImportPanel from "../components/FoundryImportPanel.jsx";
import { Chip, PageHeader } from "../components/ui/Silverleaf.jsx";

export default function FoundryImportExportPage({ mode }) {
  return (
    <div className="page-stack foundry-page">
      <PageHeader
        eyebrow="Campaign integration"
        title="Foundry импорт / экспорт"
        description="Импорт и экспорт работают только внутри активной кампании. Данные других кампаний и их файлы не включаются."
        meta={(
          <>
            <Chip tone="gold">Campaign-scoped</Chip>
            <Chip tone={mode === "gm" ? "success" : "neutral"}>{mode === "gm" ? "GM access" : "Read-only access"}</Chip>
          </>
        )}
      />
      <div className="tool-grid foundry-tool-grid">
        <FoundryImportPanel />
        <FoundryExportPanel mode={mode} />
      </div>
    </div>
  );
}
