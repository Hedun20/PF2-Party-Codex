import { useMemo, useState } from "react";
import { api } from "../api/client.js";

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

const pinExample = `[
  { "label": "Столица", "path": "cities/stolica.md", "x": 48, "y": 42 }
]`;

export default function QuickEditor({ onSaved }) {
  const [form, setForm] = useState({ type: "world", visibility: "public", tags: "", related: "", pins: "" });
  const [message, setMessage] = useState("");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const selectedTypeLabel = useMemo(() => types.find(([value]) => value === form.type)?.[1] || "Статья", [form.type]);

  async function submit(event) {
    event.preventDefault();
    let pins = [];
    if (form.pins.trim()) {
      try {
        pins = JSON.parse(form.pins);
      } catch {
        setMessage("Пины должны быть валидным JSON-массивом.");
        return;
      }
    }

    const category = form.category || categoryByType[form.type] || "lore";
    const page = await api.createPage({
      ...form,
      category,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      related: form.related.split(",").map((item) => item.trim()).filter(Boolean),
      pins
    });
    setMessage(`Сохранено: ${page.page.path}`);
    onSaved?.();
  }

  return (
    <form className="editor-form builder-form" onSubmit={submit}>
      <section className="builder-section">
        <div>
          <span className="kicker">Тип сущности</span>
          <h2>{selectedTypeLabel}</h2>
        </div>
        <div className="type-grid">
          {types.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={form.type === value ? "type-chip active" : "type-chip"}
              onClick={() => update("type", value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="builder-section two-col">
        <label>Название<input value={form.name || ""} onChange={(event) => update("name", event.target.value)} required /></label>
        <label>Категория<input value={form.category || ""} onChange={(event) => update("category", event.target.value)} placeholder={categoryByType[form.type]} /></label>
        <label>Мир<input value={form.world || ""} onChange={(event) => update("world", event.target.value)} placeholder="Арка Ночи" /></label>
        <label>Страна<input value={form.country || ""} onChange={(event) => update("country", event.target.value)} placeholder="Северная марка" /></label>
        <label>Город<input value={form.city || ""} onChange={(event) => update("city", event.target.value)} placeholder="Столица" /></label>
        <label>Родитель<input value={form.parent || ""} onChange={(event) => update("parent", event.target.value)} placeholder="если нужна ручная привязка" /></label>
      </section>

      <section className="builder-section">
        <label>Краткое описание<textarea value={form.summary || ""} onChange={(event) => update("summary", event.target.value)} /></label>
        <label>Теги<input value={form.tags || ""} onChange={(event) => update("tags", event.target.value)} placeholder="город, столица, магия" /></label>
        <label>Связанные статьи<input value={form.related || ""} onChange={(event) => update("related", event.target.value)} placeholder="Арка Ночи, Малые миры" /></label>
      </section>

      <section className="builder-section two-col">
        <label>PNG-карта<input value={form.mapImage || ""} onChange={(event) => update("mapImage", event.target.value)} placeholder="images/arka-nochi-map.png или arka-nochi-map.png" /></label>
        <label>Видимость<select value={form.visibility} onChange={(event) => update("visibility", event.target.value)}><option value="public">public</option><option value="gm">gm</option><option value="draft">draft</option></select></label>
      </section>

      <section className="builder-section">
        <label>Пины на PNG-карте<textarea value={form.pins || ""} onChange={(event) => update("pins", event.target.value)} placeholder={pinExample} /></label>
        <p className="builder-hint">Пины хранятся прямо в Markdown frontmatter. PNG-файл положи в `vault/images`, а координаты указывай в процентах.</p>
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
