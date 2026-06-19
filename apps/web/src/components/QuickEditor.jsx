import { useState } from "react";
import { api } from "../api/client.js";

const types = ["world", "country", "city", "npc", "enemy", "lore", "quest", "session", "location"];

export default function QuickEditor({ onSaved }) {
  const [form, setForm] = useState({ type: "npc", visibility: "public", tags: "" });
  const [message, setMessage] = useState("");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    const page = await api.createPage({
      ...form,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      related: (form.related || "").split(",").map((item) => item.trim()).filter(Boolean)
    });
    setMessage(`Сохранено: ${page.page.path}`);
    onSaved?.();
  }

  return (
    <form className="editor-form" onSubmit={submit}>
      <label>Тип<select value={form.type} onChange={(event) => update("type", event.target.value)}>{types.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label>Название<input value={form.name || ""} onChange={(event) => update("name", event.target.value)} required /></label>
      <label>Категория<input value={form.category || ""} onChange={(event) => update("category", event.target.value)} placeholder="worlds, countries, cities" /></label>
      <label>Подтип<input value={form.subtype || ""} onChange={(event) => update("subtype", event.target.value)} /></label>
      <label>Краткое описание<textarea value={form.summary || ""} onChange={(event) => update("summary", event.target.value)} /></label>
      <label>Теги<input value={form.tags || ""} onChange={(event) => update("tags", event.target.value)} placeholder="город, столица, магия" /></label>
      <label>Связанные статьи<input value={form.related || ""} onChange={(event) => update("related", event.target.value)} placeholder="Арка Ночи, Малые миры" /></label>
      <label>Публичные заметки<textarea value={form.publicNotes || ""} onChange={(event) => update("publicNotes", event.target.value)} /></label>
      <label>Секреты GM<textarea value={form.gmSecrets || ""} onChange={(event) => update("gmSecrets", event.target.value)} /></label>
      <label>Видимость<select value={form.visibility} onChange={(event) => update("visibility", event.target.value)}><option>public</option><option>gm</option><option>draft</option></select></label>
      <button className="gold-button" type="submit">Сохранить Markdown</button>
      {message && <p className="save-message">{message}</p>}
    </form>
  );
}
