import { useEffect, useMemo, useState } from "react";
import { BookOpen, Link2, NotebookPen, Plus, Save, Search, Trash2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import CodexButton from "../components/ui/CodexButton.jsx";
import { notesForPage, usePlayerNotes } from "../utils/playerNotes.js";
import { labelCategory } from "../utils/labels.js";

const visibilityOptions = [
  { value: "private", label: "Private" },
  { value: "sharedWithGm", label: "Shared with GM" },
  { value: "partyVisible", label: "Party visible" },
  { value: "gmPrivate", label: "GM private" }
];

function formatDate(value = "") {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function pageLabel(page) {
  if (!page) return "Без привязки";
  return `${page.title} · ${labelCategory(page.category)}`;
}

function draftFromNote(note) {
  return {
    title: note?.title || "Новая заметка",
    body: note?.body || "",
    visibility: note?.visibility || "private",
    linkedPath: note?.linkedPath || "",
    linkedTitle: note?.linkedTitle || ""
  };
}

export default function NotesPage({ pages = [] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedArticle = searchParams.get("article") || "";
  const requestedNoteId = searchParams.get("note") || "";
  const requestedArticlePage = pages.find((page) => page.path === requestedArticle) || null;
  const { notes, addNote, updateNote, deleteNote, storageMode, busy, error } = usePlayerNotes();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(requestedNoteId || "");
  const [draft, setDraft] = useState(draftFromNote(null));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const articleNotes = useMemo(() => requestedArticle ? notesForPage(notes, requestedArticle) : [], [notes, requestedArticle]);
  const baseNotes = requestedArticle && !requestedNoteId ? articleNotes : notes;

  const filteredNotes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return baseNotes;
    return baseNotes.filter((note) => [note.title, note.body, note.linkedTitle, note.visibility].some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [baseNotes, query]);

  const selectedNote = useMemo(() => notes.find((note) => note.id === selectedId) || filteredNotes[0] || notes[0] || null, [filteredNotes, notes, selectedId]);
  const sortedPages = useMemo(() => [...pages].sort((a, b) => a.title.localeCompare(b.title)), [pages]);
  const linkedPageExists = draft.linkedPath && pages.some((page) => page.path === draft.linkedPath);

  useEffect(() => {
    if (requestedNoteId && notes.some((note) => note.id === requestedNoteId)) {
      setSelectedId(requestedNoteId);
      return;
    }
    if (requestedArticle && articleNotes[0]?.id) {
      setSelectedId(articleNotes[0].id);
      return;
    }
    if (!selectedId && notes[0]?.id) setSelectedId(notes[0].id);
    if (selectedId && !notes.some((note) => note.id === selectedId)) setSelectedId(notes[0]?.id || "");
  }, [articleNotes, notes, requestedArticle, requestedNoteId, selectedId]);

  useEffect(() => {
    setDraft(draftFromNote(selectedNote));
    setMessage("");
  }, [selectedNote?.id]);

  function selectNote(id) {
    setSelectedId(id);
    setMessage("");
    if (id) setSearchParams({ note: id });
  }

  async function createNote() {
    setSaving(true);
    setMessage("");
    try {
      const note = await addNote({
        title: requestedArticlePage ? `Заметка: ${requestedArticlePage.title}` : "Новая заметка",
        linkedPath: requestedArticlePage?.path || "",
        linkedTitle: requestedArticlePage?.title || "",
        visibility: "private"
      });
      setSelectedId(note.id);
      setSearchParams({ note: note.id });
      setMessage("Заметка создана. Теперь её можно редактировать и сохранить.");
    } catch (createError) {
      setMessage(createError.message || "Не удалось создать заметку.");
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(patch) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateLinkedPage(path) {
    const linked = pages.find((page) => page.path === path);
    updateDraft({ linkedPath: linked?.path || "", linkedTitle: linked?.title || "" });
  }

  async function saveDraft() {
    if (!selectedNote) return;
    setSaving(true);
    setMessage("");
    try {
      await updateNote(selectedNote.id, draft);
      setMessage("Заметка сохранена.");
    } catch (saveError) {
      setMessage(saveError.message || "Не удалось сохранить заметку.");
    } finally {
      setSaving(false);
    }
  }

  async function removeNote() {
    if (!selectedNote) return;
    if (!window.confirm(`Удалить заметку «${selectedNote.title || "Без названия"}»?`)) return;
    setSaving(true);
    setMessage("");
    try {
      const next = notes.find((note) => note.id !== selectedNote.id);
      await deleteNote(selectedNote.id);
      setSelectedId(next?.id || "");
      if (next?.id) setSearchParams({ note: next.id });
      else setSearchParams({});
    } catch (deleteError) {
      setMessage(deleteError.message || "Не удалось удалить заметку.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack notes-page notes-page-editable">
      <header className="list-header notes-header">
        <span className="kicker">Player Workspace</span>
        <h1>My Notes</h1>
        <p>Личный блокнот кампании: заметки можно создавать, открывать по ссылке, редактировать, привязывать к статье и удалять.</p>
      </header>

      <div className={`status-message ${storageMode === "mongo" ? "success-message" : "warning-message"}`}>
        <span>{storageMode === "mongo" ? "Mongo workspace" : "Browser fallback"}{busy ? " · loading..." : ""}</span>
        {error ? <small>{error}</small> : null}
      </div>
      {message ? <div className="status-message success-message"><span>{message}</span></div> : null}

      <section className="notes-layout notes-layout-polished">
        <aside className="notes-list-panel">
          <div className="notes-list-head">
            <div>
              <span className="kicker">Notebook</span>
              <h2>{requestedArticle && !requestedNoteId ? `${articleNotes.length} linked notes` : `${notes.length} notes`}</h2>
            </div>
            <CodexButton type="button" size="sm" onClick={createNote} disabled={saving}><Plus size={16} /> <span>New</span></CodexButton>
          </div>
          {requestedArticle ? (
            <div className="notes-scope-chip">
              <Link2 size={14} /> Linked to: {requestedArticlePage?.title || requestedArticle}
              <button type="button" onClick={() => setSearchParams({})}>Clear</button>
            </div>
          ) : null}
          <label className="notes-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes..." /></label>
          <div className="notes-list">
            {filteredNotes.map((note) => (
              <button key={note.id} type="button" className={selectedNote?.id === note.id ? "is-active" : ""} onClick={() => selectNote(note.id)}>
                <strong>{note.title || "Untitled note"}</strong>
                <span>{note.linkedTitle || "No linked article"}</span>
                <small>{note.visibility || "private"} · {formatDate(note.updatedAt)}</small>
              </button>
            ))}
            {!busy && !filteredNotes.length ? <p className="empty-copy">No notes match this view.</p> : null}
          </div>
        </aside>

        <section className="notes-editor-panel">
          {selectedNote ? (
            <>
              <div className="notes-editor-head notes-editor-head-editable">
                <NotebookPen size={22} />
                <input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} placeholder="Note title" />
                <CodexButton type="button" variant="danger" size="sm" onClick={removeNote} disabled={saving}><Trash2 size={16} /> <span>Delete</span></CodexButton>
              </div>
              <div className="notes-meta-grid">
                <label className="notes-link-field">
                  <span><Link2 size={15} /> Linked article</span>
                  <select value={draft.linkedPath || ""} onChange={(event) => updateLinkedPage(event.target.value)}>
                    <option value="">No linked article</option>
                    {sortedPages.map((page) => <option key={page.path} value={page.path}>{pageLabel(page)}</option>)}
                  </select>
                </label>
                <label className="notes-link-field">
                  <span>Visibility</span>
                  <select value={draft.visibility || "private"} onChange={(event) => updateDraft({ visibility: event.target.value })}>
                    {visibilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
              {draft.linkedPath && linkedPageExists ? (
                <Link className="notes-linked-card" to={`/page/${encodeURIComponent(draft.linkedPath)}`}>
                  <BookOpen size={16} /> Open linked article: {draft.linkedTitle || draft.linkedPath}
                </Link>
              ) : null}
              <textarea className="notes-body-editor" value={draft.body} onChange={(event) => updateDraft({ body: event.target.value })} placeholder="Пиши мысли, догадки, обещания NPC, планы на следующую сессию..." />
              <div className="notes-editor-actions">
                <span>Updated: {formatDate(selectedNote.updatedAt)}</span>
                <CodexButton type="button" onClick={saveDraft} disabled={saving}><Save size={16} /> <span>{saving ? "Saving..." : "Save note"}</span></CodexButton>
              </div>
            </>
          ) : (
            <div className="notes-empty-editor notes-empty-compact">
              <NotebookPen size={34} />
              <h2>No notes yet.</h2>
              <p>Create the first note, or open an article and add a note directly from there.</p>
              <CodexButton type="button" onClick={createNote} disabled={saving}><Plus size={16} /> <span>New note</span></CodexButton>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
