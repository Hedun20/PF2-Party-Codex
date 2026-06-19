import { useState } from "react";
import { api } from "../api/client.js";

export default function FoundryExportPanel({ mode }) {
  const [category, setCategory] = useState("");
  const [exportMode, setExportMode] = useState("single");
  const [message, setMessage] = useState("");

  async function exportData() {
    const result = await api.foundryExport({ mode, category, exportMode });
    setMessage(`Prepared ${result.journals.length} journals`);
  }

  return (
    <section className="tool-panel">
      <h2>Foundry Export</h2>
      <label>Category<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="optional, e.g. lore/gods" /></label>
      <label>Export mode<select value={exportMode} onChange={(event) => setExportMode(event.target.value)}><option value="single">single JSON</option><option value="per-page">per-page JSON</option><option value="module">module skeleton</option></select></label>
      <button className="gold-button" onClick={exportData}>Build Export</button>
      <a className="download-link" href="/api/foundry/export/download">Download JSON</a>
      {message && <p className="save-message">{message}</p>}
    </section>
  );
}
