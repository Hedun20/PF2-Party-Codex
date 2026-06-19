import { useState } from "react";
import { api } from "../api/client.js";

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
    setMessage(`Imported ${result.written.length} pages`);
  }

  return (
    <section className="tool-panel">
      <h2>Foundry Import</h2>
      <input type="file" accept="application/json,.json" multiple onChange={upload} />
      {preview.length > 0 && (
        <>
          <label>Conflicts<select value={conflictMode} onChange={(event) => setConflictMode(event.target.value)}><option>skip</option><option>overwrite</option><option>copy</option></select></label>
          <div className="preview-list">
            {preview.map((item, index) => (
              <div key={`${item.targetPath}-${index}`}>
                <strong>{item.sourceTitle}</strong>
                <span>{item.detectedCategory} {"->"} {item.targetPath}{item.conflict ? " (conflict)" : ""}</span>
                {item.warnings.map((warning) => <em key={warning}>{warning}</em>)}
              </div>
            ))}
          </div>
          <button className="gold-button" onClick={commit}>Write Markdown Files</button>
        </>
      )}
      {message && <p className="save-message">{message}</p>}
    </section>
  );
}
