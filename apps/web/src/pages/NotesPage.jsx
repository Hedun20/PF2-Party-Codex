import { useEffect, useMemo, useState } from "react";
import { BookOpen, NotebookPen, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";

function formatDate(value = "") {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function preview(text = "", limit = 900) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "No note body returned.";
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function visibilityLabel(value = "private") {
  return value || "private";
}

export default function NotesPage({ pages = [] }) {
  const [searchParams] = useSearchParams();
  const requestedArticle = searchParams.get("article") || "";
  const [state, setState] = useState({ loading: true, error: "", notes: [] });
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: "", notes: [] });
    api.notes("mine")
      .then((data) => {
        if (!active) return;
        setState({ loading: false, error: "", notes: Array.isArray(data.notes) ? data.notes : [] });
      })
      .catch((error) => {
        if (!active) return;
        setState({ loading: false, error: error.message || "Notes API failed.", notes: [] });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const articleNote = requestedArticle ? state.notes.find((note) => note.linkedPath === requestedArticle) : null;
    if (articleNote && selectedId !== articleNote.id) {
      setSelectedId(articleNote.id);
      return;
    }
    if (!selectedId && state.notes[0]?.id) setSelectedId(state.notes[0].id);
    if (selectedId && !state.notes.some((note) => note.id === selectedId)) setSelectedId(state.notes[0]?.id || "");
  }, [requestedArticle, selectedId, state.notes]);

  const filteredNotes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return state.notes;
    return state.notes.filter((note) => [note.title, note.body, note.linkedTitle, note.visibility].some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [query, state.notes]);

  const selectedNote = useMemo(() => state.notes.find((note) => note.id === selectedId) || state.notes[0] || null, [selectedId, state.notes]);
  const linkedPageExists = selectedNote?.linkedPath && pages.some((page) => page.path === selectedNote.linkedPath);

  return (
    <div className="page-stack notes-page">
      <header className="list-header notes-header">
        <span className="kicker">Player Workspace</span>
        <h1>My Notes</h1>
        <p>Campaign notes loaded from the Mongo API. Create/edit is intentionally deferred here unless a later stage enables the full notes workflow.</p>
      </header>

      {state.loading ? <div className="status-message success-message"><span>Loading notes from Mongo...</span></div> : null}
      {state.error ? <div className="status-message danger-message"><span>{state.error}</span></div> : null}

      <section className="notes-layout notes-layout-polished">
        <aside className="notes-list-panel">
          <div className="notes-list-head">
            <div>
              <span className="kicker">Notebook</span>
              <h2>{state.notes.length} notes</h2>
            </div>
          </div>
          <label className="notes-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes..." /></label>
          <div className="notes-list">
            {filteredNotes.map((note) => (
              <button key={note.id} type="button" className={selectedNote?.id === note.id ? "is-active" : ""} onClick={() => setSelectedId(note.id)}>
                <strong>{note.title || "Untitled note"}</strong>
                <span>{note.linkedTitle || "No linked article"}</span>
                <small>{visibilityLabel(note.visibility)} · {formatDate(note.updatedAt)}</small>
              </button>
            ))}
            {!state.loading && !state.error && !filteredNotes.length ? <p className="empty-copy">No notes have been added to this campaign yet.</p> : null}
          </div>
        </aside>

        <section className="notes-editor-panel">
          {selectedNote ? (
            <>
              <div className="notes-editor-head">
                <NotebookPen size={22} />
                <h2>{selectedNote.title || "Untitled note"}</h2>
              </div>
              <div className="notes-meta-grid">
                <label className="notes-link-field">
                  <span>Visibility</span>
                  <input readOnly value={visibilityLabel(selectedNote.visibility)} />
                </label>
                <label className="notes-link-field">
                  <span>Updated</span>
                  <input readOnly value={formatDate(selectedNote.updatedAt) || "Not available"} />
                </label>
              </div>
              {selectedNote.linkedPath && linkedPageExists ? (
                <Link className="notes-linked-card" to={`/page/${encodeURIComponent(selectedNote.linkedPath)}`}>
                  <BookOpen size={16} /> Open linked article: {selectedNote.linkedTitle || selectedNote.linkedPath}
                </Link>
              ) : null}
              <div className="article-notes-panel">
                <p>{preview(selectedNote.body)}</p>
              </div>
            </>
          ) : (
            <div className="notes-empty-editor notes-empty-compact">
              <NotebookPen size={34} />
              <h2>No notes have been added to this campaign yet.</h2>
              <p>Private, shared-with-GM, and party-visible notes will appear here when returned by the backend.</p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}