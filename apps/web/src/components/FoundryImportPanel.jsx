import { useState } from "react";
import { Save } from "lucide-react";
import { api } from "../api/client.js";
import CodexButton from "./ui/CodexButton.jsx";

export default function FoundryImportPanel() {
  const [preview, setPreview] = useState([]);
  const [conflictMode, setConflictMode] = useState("skip");
  const [message, setMessage] = useState("");

  async function upload(event) {
    const form = new FormData();
    [...event.target.files].forEach((file) => form.append("files", file));
    const result = await api.foundryImportPreview(form);
    setPreview(result.preview);
  }

  async function commit() {
    const result = await api.foundryImportCommit(preview, conflictMode);
    setMessage(`Импортировано страниц: ${result.written.length}`);
  }

  return (
    <section className="tool-panel">
      <h2>Импорт Foundry</h2>
      <input type="file" accept="application/json,.json" multiple onChange={upload} />
      {preview.length > 0 && (
        <>
          <label>Конфликты<select value={conflictMode} onChange={(event) => setConflictMode(event.target.value)}><option value="skip">пропустить</option><option value="overwrite">перезаписать</option><option value="copy">создать копию</option></select></label>
          <div className="preview-list">
            {preview.map((item, index) => (
              <div key={`${item.targetPath}-${index}`}>
                <strong>{item.sourceTitle}</strong>
                <span>{item.detectedCategory} {"->"} {item.targetPath}{item.conflict ? " (конфликт)" : ""}</span>
                {item.warnings.map((warning) => <em key={warning}>{warning}</em>)}
              </div>
            ))}
          </div>
          <CodexButton type="button" onClick={commit}><Save size={16} /> Записать Markdown-файлы</CodexButton>
        </>
      )}
      {message && <p className="save-message">{message}</p>}
    </section>
  );
}
