import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, Link2, NotebookPen, Plus, Search, Trash2 } from "lucide-react";
import CodexButton from "../components/ui/CodexButton.jsx";
import { usePlayerNotes } from "../utils/playerNotes.js";
import { labelCategory } from "../utils/labels.js";

const visibilityOptions = [
  { value: "private", label: "Private" },
  { value: "sharedWithGm", label: "Shared with GM" },
  { value: "partyVisible", label: "Party visible" },
  { value: "gmPrivate", label: "GM private" }
];

function pageLabel(page) {
  if (!page) return "Без привязки";
  return `${page.title} · ${labelCategory(page.category)}`;
}

function formatDate(value = "") {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function NotesPage({ pages = [] }) {
  const [searchParams] = useSearchParams();
  const initialPath = searchParams.get("article") || "";
  const initialPage = pages.find((page) => page.path === initialPath);
  const { notes, addNote, updateNote, deleteNote, storageMode, busy, error } = usePlayerNotes();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(notes[0]?.id || "");
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    if (!selectedId && notes[0]?.id) setSelectedId(notes[0].id);
    if (selectedId && !notes.some((note) => note.id === selectedId)) setSelectedId(notes[0]?.id || "");
  }, [notes, selectedId]);

  const sortedPages = useMemo(() => [...pages].sort((a, b) => a.title.localeCompare(b.title)), [pages]);
  const selectedNote = notes.find((note) => note.id === selectedId) || notes[0] || null;
  const filteredNotes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return notes;
    return notes.filter((note) => [note.title, note.body, note.linkedTitle, note.visibility].some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [notes, query]);

  async function createNote() {
    const note = await addNote({
      title: initialPage ? `Заметка: ${initialPage.title}` : "Новая заметка",
      linkedPath: initialPage?.path || "",
      linkedTitle: initialPage?.title || "",
      visibility: "private"
    });
    setSelectedId(note.id);
  }

  async function patchNote(id, patch) {
    setSavingId(id);
    try {
      await updateNote(id, patch);
    } finally {
      setSavingId("");
    }
  }

  function updateLinkedPage(path) {
    if (!selectedNote) return;
    const linked = pages.find((page) => page.path === path);
    patchNote(selectedNote.id, { linkedPath: linked?.path || "", linkedTitle: linked?.title || "" });
  }

  async function removeNote() {
    if (!selectedNote) return;
    const next = notes.find((note) => note.id !== selectedNote.id);
    await deleteNote(selectedNote.id);
    setSelectedId(next?.id || "");
  }

  return (
    <div className="page-stack notes-page">
      <header className="list-header notes-header">
        <span className="kicker">Player Workspace</span>
        <h1>Заметки</h1>
        <p>Личный блокнот игрока и GM: private, shared with GM, party-visible и GM-private заметки теперь готовы к Mongo workspace.</p>
      </header>

      <div className={`status-message ${storageMode === "mongo" ? "success-message" : "warning-message"}`}>
        <span>{storageMode === "mongo" ? "Mongo workspace" : "Browser fallback"}{busy ? " · loading..." : ""}</span>
        {error && <small>{error}</small>}
      </div>

      <section className="notes-layout notes-layout-polished">
        <aside className="notes-list-panel">
          <div className="notes-list-head">
            <div>
              <span className="kicker">Notebook</span>
              <h2>{notes.length} заметок</h2>
            </div>
            <button type="button" className="notes-icon-action" onClick={createNote} title="Новая заметка"><Plus size={18} /></button>
          </div>
          <label className="notes-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск заметок..." /></label>
          <div className="notes-list">
            {filteredNotes.map((note) => (
              <button key={note.id} type="button" className={selectedNote?.id === note.id ? "is-active" : ""} onClick={() => setSelectedId(note.id)}>
                <strong>{note.title}</strong>
                <span>{note.linkedTitle || "Без привязки"}</span>
                <small>{note.visibility || "private"} · {formatDate(note.updatedAt)}</small>
              </button>
            ))}
            {!filteredNotes.length && <p className="empty-copy">Заметок пока нет.</p>}
          </div>
        </aside>

        <section className="notes-editor-panel">
          {selectedNote ? (
            <>
              <div className="notes-editor-head">
                <NotebookPen size={22} />
                <input value={selectedNote.title} onChange={(event) => patchNote(selectedNote.id, { title: event.target.value })} />
                <button type="button" onClick={removeNote} title="Удалить заметку"><Trash2 size={17} /></button>
              </div>
              <div className="notes-meta-grid">
                <label className="notes-link-field">
                  <span><Link2 size={15} /> Связанная статья</span>
                  <select value={selectedNote.linkedPath || ""} onChange={(event) => updateLinkedPage(event.target.value)}>
                    <option value="">Без привязки</option>
                    {sortedPages.map((page) => <option key={page.path} value={page.path}>{pageLabel(page)}</option>)}
                  </select>
                </label>
                <label className="notes-link-field">
                  <span>Visibility</span>
                  <select value={selectedNote.visibility || "private"} onChange={(event) => patchNote(selectedNote.id, { visibility: event.target.value })}>
                    {visibilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
              {selectedNote.linkedPath && (
                <Link className="notes-linked-card" to={`/page/${encodeURIComponent(selectedNote.linkedPath)}`}>
                  <BookOpen size={16} /> Открыть статью: {selectedNote.linkedTitle}
                </Link>
              )}
              <textarea value={selectedNote.body} onChange={(event) => patchNote(selectedNote.id, { body: event.target.value })} placeholder="Пиши мысли, догадки, обещания NPC, планы на следующую сессию..." />
              {savingId === selectedNote.id && <p className="character-muted-line">Saving...</p>}
            </>
          ) : (
            <div className="notes-empty-editor notes-empty-compact">
              <NotebookPen size={34} />
              <h2>Создай первую заметку</h2>
              <p>Можно оставить её общей или сразу привязать к статье.</p>
              <CodexButton type="button" onClick={createNote}><Plus size={16} /> Новая заметка</CodexButton>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
