import { useState } from "react";
import { api } from "../api/client.js";

const types = ["npc", "enemy", "lore", "quest", "session", "location"];

export default function QuickEditor({ onSaved }) {
  const [form, setForm] = useState({ type: "npc", visibility: "public", tags: "" });
  const [message, setMessage] = useState("");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    const page = await api.createPage({
      ...form,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
    });
    setMessage(`Saved ${page.page.path}`);
    onSaved?.();
  }

  return (
    <form className="editor-form" onSubmit={submit}>
      <label>Type<select value={form.type} onChange={(event) => update("type", event.target.value)}>{types.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label>Name<input value={form.name || ""} onChange={(event) => update("name", event.target.value)} required /></label>
      <label>Category<input value={form.category || ""} onChange={(event) => update("category", event.target.value)} placeholder="npcs, enemies, lore/gods" /></label>
      <label>Subtype<input value={form.subtype || ""} onChange={(event) => update("subtype", event.target.value)} /></label>
      <label>Summary<textarea value={form.summary || ""} onChange={(event) => update("summary", event.target.value)} /></label>
      <label>Tags<input value={form.tags || ""} onChange={(event) => update("tags", event.target.value)} placeholder="pirate, ally" /></label>
      <label>Public Notes<textarea value={form.publicNotes || ""} onChange={(event) => update("publicNotes", event.target.value)} /></label>
      <label>GM Secrets<textarea value={form.gmSecrets || ""} onChange={(event) => update("gmSecrets", event.target.value)} /></label>
      <label>Visibility<select value={form.visibility} onChange={(event) => update("visibility", event.target.value)}><option>public</option><option>gm</option><option>draft</option></select></label>
      <button className="gold-button" type="submit">Save Markdown Page</button>
      {message && <p className="save-message">{message}</p>}
    </form>
  );
}
