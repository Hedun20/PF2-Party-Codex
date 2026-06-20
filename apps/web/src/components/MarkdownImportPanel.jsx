import { useState } from "react";
import { FileUp, Save, Wand2 } from "lucide-react";
import { api } from "../api/client.js";
import CodexButton from "./ui/CodexButton.jsx";
import { labelCategory } from "../utils/labels.js";

const categories = ["worlds", "countries", "cities", "locations", "characters", "npcs", "enemies", "quests", "sessions", "maps", "timeline", "lore", "lore/factions", "lore/cults", "lore/gods", "lore/artifacts", "lore/history", "lore/prophecies", "lore/planes", "lore/magic", "lore/timeline"];
const types = ["world", "country", "city", "location", "npc", "pc", "enemy", "quest", "session", "map", "lore", "timelineEvent"];
const loreSubtypes = [["general", "Общий лор"], ["faction", "Фракция"], ["cult", "Культ"], ["god", "Бог / религия"], ["artifact", "Артефакт"], ["history", "История"], ["prophecy", "Пророчество"], ["plane", "План / измерение"], ["magic", "Магия"]];

export default function MarkdownImportPanel({ onImported, onUseAsDraft }) {
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
    setPreview((items) => items.map((item) => {
      if (item.id !== id) return item;
      const next = { ...item, [key]: value };
      if (key === "loreSubtype" && next.type === "lore") {
        const map = { faction: "lore/factions", cult: "lore/cults", god: "lore/gods", artifact: "lore/artifacts", history: "lore/history", prophecy: "lore/prophecies", plane: "lore/planes", magic: "lore/magic", general: "lore" };
        next.category = map[value] || "lore";
        next.targetPath = `${next.category}/${(next.targetPath || `${next.title}.md`).split("/").pop()}`;
      }
      return next;
    }));
  }

  function splitItem(item) {
    if (!item.splitCandidates?.length) return;
    setPreview((items) => items.flatMap((current) => current.id === item.id ? item.splitCandidates : [current]));
    setMessage(`Файл “${item.title}” разбит на ${item.splitCandidates.length} фракций. Проверь пути и нажми импорт.`);
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
          <p className="builder-hint">Загрузи один или несколько `.md`, проверь раскладку и только потом запиши их в vault. Для создания одной статьи можно заполнить форму без записи в vault.</p>
        </div>
        <CodexButton as="label" variant="secondary" className="codex-file-button">
          <FileUp size={18} />
          <span>Выбрать MD</span>
          <input type="file" accept=".md,text/markdown,text/plain" multiple onChange={chooseFiles} />
        </CodexButton>
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
            <CodexButton type="button" onClick={commit}>
              <Save size={16} />
              Импортировать в vault
            </CodexButton>
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
                  {item.type === "lore" && (
                    <label>Подтип лора
                      <select value={item.loreSubtype || "general"} onChange={(event) => updateItem(item.id, "loreSubtype", event.target.value)}>
                        {loreSubtypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                  )}
                  <label>Категория
                    <select value={item.category} onChange={(event) => updateItem(item.id, "category", event.target.value)}>
                      {categories.map((category) => <option key={category} value={category}>{labelCategory(category)}</option>)}
                    </select>
                  </label>
                  <label>Путь
                    <input value={item.targetPath} onChange={(event) => updateItem(item.id, "targetPath", event.target.value)} />
                  </label>
                  {item.splitCandidates?.length > 1 && (
                    <CodexButton type="button" variant="secondary" size="sm" className="md-draft-button" onClick={() => splitItem(item)}>
                      <Wand2 size={16} /> Разбить на {item.splitCandidates.length} фракций
                    </CodexButton>
                  )}
                  {onUseAsDraft && (
                    <CodexButton type="button" variant="secondary" size="sm" className="md-draft-button" onClick={() => onUseAsDraft(item)}>
                      <Wand2 size={16} /> Заполнить форму
                    </CodexButton>
                  )}
                </div>
                {item.warnings.length > 0 && (
                  <div className="md-import-warnings">
                    {item.warnings.map((warning) => <span key={warning}>{warning}</span>)}
                    {item.warnings.some((warning) => warning.toLowerCase().includes("obsidian")) && (
                      <p className="obsidian-help">
                        Это похоже на Obsidian-ссылку, а не на сам текст статьи. Открой Obsidian → правый клик по заметке → Show in system explorer / Показать в папке → выбери настоящий .md файл.
                      </p>
                    )}
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
