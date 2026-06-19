import { useEffect, useMemo, useState } from "react";
import { Crosshair, Upload } from "lucide-react";
import { api } from "../api/client.js";
import { labelCategory } from "../utils/labels.js";

const types = [
  ["world", "Мир"],
  ["country", "Страна"],
  ["city", "Город"],
  ["location", "Локация"],
  ["npc", "NPC"],
  ["enemy", "Враг"],
  ["quest", "Квест"],
  ["session", "Сессия"],
  ["lore", "Лор"]
];

const categoryByType = {
  world: "worlds",
  country: "countries",
  city: "cities",
  npc: "npcs",
  enemy: "enemies",
  quest: "quests",
  session: "sessions",
  location: "locations",
  lore: "lore"
};

function optionLabel(page) {
  return `${page.title} · ${labelCategory(page.category)}`;
}

export default function QuickEditor({ onSaved }) {
  const [metadata, setMetadata] = useState({ pages: [], tags: [], worlds: [], countries: [], cities: [] });
  const [form, setForm] = useState({ type: "world", visibility: "public", tags: [], related: [], pins: [] });
  const [pinDraft, setPinDraft] = useState({ label: "", path: "" });
  const [localMapPreview, setLocalMapPreview] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.metadata("gm").then(setMetadata).catch((error) => setMessage(error.message));
  }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const selectedTypeLabel = useMemo(() => types.find(([value]) => value === form.type)?.[1] || "Статья", [form.type]);
  const countries = metadata.countries.filter((page) => !form.world || page.world === form.world);
  const cities = metadata.cities.filter((page) => {
    const worldOk = !form.world || page.world === form.world;
    const countryOk = !form.country || page.country === form.country;
    return worldOk && countryOk;
  });

  function toggleArray(key, value) {
    setForm((current) => {
      const list = current[key] || [];
      return { ...current, [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] };
    });
  }

  async function uploadMap(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage(`Загружаю карту: ${file.name}`);
    const previewUrl = URL.createObjectURL(file);
    setLocalMapPreview(previewUrl);
    try {
      const data = new FormData();
      data.append("file", file);
      const uploaded = await api.uploadAsset(data);
      update("mapImage", uploaded.path);
      setLocalMapPreview("");
      setMessage(`Карта загружена: ${uploaded.path}`);
    } catch (error) {
      setMessage(`Не удалось загрузить карту: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  }

  function addPin(event) {
    if (!form.mapImage || !pinDraft.label || !pinDraft.path) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Number((((event.clientX - rect.left) / rect.width) * 100).toFixed(2));
    const y = Number((((event.clientY - rect.top) / rect.height) * 100).toFixed(2));
    update("pins", [...(form.pins || []), { label: pinDraft.label, path: pinDraft.path, x, y }]);
    setPinDraft({ label: "", path: pinDraft.path });
  }

  function removePin(index) {
    update("pins", form.pins.filter((_pin, pinIndex) => pinIndex !== index));
  }

  async function submit(event) {
    event.preventDefault();
    const category = form.category || categoryByType[form.type] || "lore";
    const page = await api.createPage({
      ...form,
      category,
      tags: form.tags || [],
      related: form.related || [],
      pins: form.pins || []
    });
    setMessage(`Сохранено: ${page.page.path}`);
    onSaved?.();
    api.metadata("gm").then(setMetadata).catch(() => {});
  }

  return (
    <form className="editor-form builder-form" onSubmit={submit}>
      <section className="builder-section">
        <div>
          <span className="kicker">Что создаём</span>
          <h2>{selectedTypeLabel}</h2>
        </div>
        <div className="type-grid">
          {types.map(([value, label]) => (
            <button key={value} type="button" className={form.type === value ? "type-chip active" : "type-chip"} onClick={() => update("type", value)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="builder-section two-col">
        <label>Название<input value={form.name || ""} onChange={(event) => update("name", event.target.value)} required /></label>
        <label>Категория<select value={form.category || categoryByType[form.type]} onChange={(event) => update("category", event.target.value)}>
          {Object.entries(categoryByType).map(([_type, category]) => <option key={category} value={category}>{labelCategory(category)}</option>)}
        </select></label>
        <label>Мир<select value={form.world || ""} onChange={(event) => { update("world", event.target.value); update("country", ""); update("city", ""); }}>
          <option value="">Без привязки к миру</option>
          {metadata.worlds.map((page) => <option key={page.path} value={page.title}>{page.title}</option>)}
        </select></label>
        <label>Страна<select value={form.country || ""} onChange={(event) => { update("country", event.target.value); update("city", ""); }}>
          <option value="">Без привязки к стране</option>
          {countries.map((page) => <option key={page.path} value={page.title}>{page.title}</option>)}
        </select></label>
        <label>Город<select value={form.city || ""} onChange={(event) => update("city", event.target.value)}>
          <option value="">Без привязки к городу</option>
          {cities.map((page) => <option key={page.path} value={page.title}>{page.title}</option>)}
        </select></label>
        <label>Видимость<select value={form.visibility} onChange={(event) => update("visibility", event.target.value)}>
          <option value="public">public · видно игрокам</option>
          <option value="gm">gm · только мастеру</option>
          <option value="draft">draft · черновик</option>
        </select></label>
      </section>

      <section className="builder-section">
        <label>Краткое описание<textarea value={form.summary || ""} onChange={(event) => update("summary", event.target.value)} /></label>
        <div>
          <span className="field-title">Теги из vault</span>
          <div className="choice-row">
            {metadata.tags.map((tag) => (
              <button key={tag} type="button" className={form.tags?.includes(tag) ? "choice-pill active" : "choice-pill"} onClick={() => toggleArray("tags", tag)}>
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="field-title">Связанные статьи</span>
          <select value="" onChange={(event) => event.target.value && toggleArray("related", event.target.value)}>
            <option value="">Добавить связь</option>
            {metadata.pages.map((page) => <option key={page.path} value={page.title}>{optionLabel(page)}</option>)}
          </select>
          <div className="choice-row">
            {(form.related || []).map((title) => <button key={title} type="button" className="choice-pill active" onClick={() => toggleArray("related", title)}>{title}</button>)}
          </div>
        </div>
      </section>

      <section className="builder-section">
        <div className="map-upload-row">
          <div>
            <span className="kicker">Карта и пины</span>
            <h2>PNG/JPG редактор</h2>
          </div>
          <label className="upload-button">
            <Upload size={18} />
            <span>Загрузить карту</span>
            <input type="file" accept="image/png,image/jpg,image/jpeg,image/pjpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={uploadMap} />
          </label>
        </div>
        <label>Файл карты<input value={form.mapImage || ""} onChange={(event) => update("mapImage", event.target.value)} placeholder="arka-nochi-map.png" /></label>
        <div className="pin-tools">
          <label>Название пина<input value={pinDraft.label} onChange={(event) => setPinDraft((current) => ({ ...current, label: event.target.value }))} placeholder="Башня Памяти" /></label>
          <label>Куда ведёт<select value={pinDraft.path} onChange={(event) => setPinDraft((current) => ({ ...current, path: event.target.value }))}>
            <option value="">Выбрать статью</option>
            {metadata.pages.map((page) => <option key={page.path} value={page.path}>{optionLabel(page)}</option>)}
          </select></label>
        </div>
        {(form.mapImage || localMapPreview) && (
          <div className="pin-editor" onClick={addPin}>
            <img
              src={localMapPreview || `/api/assets/${form.mapImage.replace(/^images\//, "")}`}
              alt="Карта для расстановки пинов"
              onError={() => setMessage("Карта загружена в поле, но браузер не смог открыть файл. Проверь расширение PNG/JPG/WebP и путь в vault/images.")}
            />
            {(form.pins || []).map((pin, index) => (
              <button key={`${pin.label}-${index}`} type="button" className="pin-editor-dot" style={{ left: `${pin.x}%`, top: `${pin.y}%` }} onClick={(event) => { event.stopPropagation(); removePin(index); }} title="Удалить пин">
                <Crosshair size={14} />
                <span>{pin.label}</span>
              </button>
            ))}
          </div>
        )}
        <p className="builder-hint">Заполни название и связанную статью, затем кликни по карте. Повторный клик по пину удаляет его.</p>
      </section>

      <section className="builder-section">
        <label>Публичные заметки<textarea value={form.publicNotes || ""} onChange={(event) => update("publicNotes", event.target.value)} /></label>
        <label>Секреты GM<textarea value={form.gmSecrets || ""} onChange={(event) => update("gmSecrets", event.target.value)} /></label>
      </section>

      <button className="gold-button" type="submit">Создать Markdown-статью</button>
      {message && <p className="save-message">{message}</p>}
    </form>
  );
}
