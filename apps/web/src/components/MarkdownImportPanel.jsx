import { useState } from "react";
import { FileUp, Save } from "lucide-react";
import { api } from "../api/client.js";
import { labelCategory } from "../utils/labels.js";

const categories = ["worlds", "countries", "cities", "locations", "npcs", "enemies", "quests", "sessions", "lore"];
const types = ["world", "country", "city", "location", "npc", "enemy", "quest", "session", "lore"];

export default function MarkdownImportPanel({ onImported }) {
  const [preview, setPreview] = useState([]);
  const [conflictMode, setConflictMode] = useState("skip");
  const [message, setMessage] = useState("");

  async function chooseFiles(event) {
    const files = [...(event.target.files || [])];
    if (!files.length) return;
    setMessage(`Читаю файлов: ${files.length}`);
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    try {
      const data = await api.markdownImportPreview(form);
      setPreview(data.preview);
      setMessage(`Готово к проверке: ${data.preview.length} файлов`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      event.target.value = "";
    }
  }

  function updateItem(id, key, value) {
    setPreview((items) => items.map((item) => item.id === id ? { ...item, [key]: value } : item));
  }

  async function commit() {
    if (!preview.length) return;
    try {
      const result = await api.markdownImportCommit({ items: preview, conflictMode });
      setMessage(`Импортировано: ${result.written.length}. Пропущено: ${result.skipped.length}.`);
      setPreview([]);
      onImported?.();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="builder-section md-import-panel">
      <div className="md-import-head">
        <div>
          <span className="kicker">Импорт архива</span>
          <h2>Массовый MD-импорт</h2>
          <p className="builder-hint">Загрузи один или несколько `.md`, проверь раскладку и только потом запиши их в vault.</p>
        </div>
        <label className="upload-button">
          <FileUp size={18} />
          <span>Выбрать MD</span>
          <input type="file" accept=".md,text/markdown,text/plain" multiple onChange={chooseFiles} />
        </label>
      </div>

      {preview.length > 0 && (
        <>
          <div className="md-import-controls">
            <label>Конфликты
              <select value={conflictMode} onChange={(event) => setConflictMode(event.target.value)}>
                <option value="skip">Пропустить существующие</option>
                <option value="copy">Создать копии</option>
                <option value="overwrite">Перезаписать</option>
              </select>
            </label>
            <button type="button" className="gold-button" onClick={commit}>
              <Save size={16} />
              Импортировать в vault
            </button>
          </div>

          <div className="md-import-list">
            {preview.map((item) => (
              <article className={item.warnings.length ? "md-import-item warning" : "md-import-item"} key={item.id}>
                <div>
                  <span>{item.originalName}</span>
                  <h3>{item.title}</h3>
                  <p>{item.summary || "Описание не найдено."}</p>
                </div>
                <div className="md-import-fields">
                  <label>Тип
                    <select value={item.type} onChange={(event) => updateItem(item.id, "type", event.target.value)}>
                      {types.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  <label>Категория
                    <select value={item.category} onChange={(event) => updateItem(item.id, "category", event.target.value)}>
                      {categories.map((category) => <option key={category} value={category}>{labelCategory(category)}</option>)}
                    </select>
                  </label>
                  <label>Путь
                    <input value={item.targetPath} onChange={(event) => updateItem(item.id, "targetPath", event.target.value)} />
                  </label>
                </div>
                {item.warnings.length > 0 && (
                  <div className="md-import-warnings">
                    {item.warnings.map((warning) => <span key={warning}>{warning}</span>)}
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}

      {message && <p className="save-message">{message}</p>}
    </section>
  );
}
