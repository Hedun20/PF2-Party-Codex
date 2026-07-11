import { useState } from "react";
import { Download, PackageCheck } from "lucide-react";
import { api } from "../api/client.js";
import CodexButton from "./ui/CodexButton.jsx";

export default function FoundryExportPanel({ mode }) {
  const [category, setCategory] = useState("");
  const [exportMode, setExportMode] = useState("single");
  const [message, setMessage] = useState("");

  async function exportData() {
    try {
      const result = await api.foundryExport({ mode, category, exportMode });
      setMessage(`Подготовлено журналов: ${result.journals.length}`);
    } catch (error) {
      setMessage(error.message || "Не удалось собрать экспорт.");
    }
  }

  async function downloadData() {
    try {
      const blob = await api.foundryExportDownload();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "party-codex-journals.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error.message || "Не удалось скачать экспорт.");
    }
  }

  return (
    <section className="tool-panel">
      <h2>Экспорт Foundry</h2>
      <label>Категория<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="необязательно, например lore/gods" /></label>
      <label>Режим экспорта<select value={exportMode} onChange={(event) => setExportMode(event.target.value)}><option value="single">один JSON</option><option value="per-page">JSON на страницу</option><option value="module">каркас модуля</option></select></label>
      <CodexButton type="button" onClick={exportData}><PackageCheck size={16} /> Собрать экспорт</CodexButton>
      <CodexButton type="button" onClick={downloadData} variant="secondary"><Download size={16} /> Скачать JSON</CodexButton>
      {message && <p className="save-message">{message}</p>}
    </section>
  );
}
