import { useState } from "react";
import { api } from "../api/client.js";

export default function FoundryExportPanel({ mode }) {
  const [category, setCategory] = useState("");
  const [exportMode, setExportMode] = useState("single");
  const [message, setMessage] = useState("");

  async function exportData() {
    const result = await api.foundryExport({ mode, category, exportMode });
    setMessage(`Подготовлено журналов: ${result.journals.length}`);
  }

  return (
    <section className="tool-panel">
      <h2>Экспорт Foundry</h2>
      <label>Категория<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="необязательно, например lore/gods" /></label>
      <label>Режим экспорта<select value={exportMode} onChange={(event) => setExportMode(event.target.value)}><option value="single">один JSON</option><option value="per-page">JSON на страницу</option><option value="module">каркас модуля</option></select></label>
      <button className="gold-button" onClick={exportData}>Собрать экспорт</button>
      <a className="download-link" href="/api/foundry/export/download">Скачать JSON</a>
      {message && <p className="save-message">{message}</p>}
    </section>
  );
}
