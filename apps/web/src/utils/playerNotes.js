import { useEffect, useState } from "react";

const NOTES_KEY = "pf2-player-notes:v1";

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) || fallback;
  } catch {
    return fallback;
  }
}

export function loadPlayerNotes() {
  if (typeof localStorage === "undefined") return [];
  const notes = safeParse(localStorage.getItem(NOTES_KEY), []);
  return Array.isArray(notes) ? notes : [];
}

export function savePlayerNotes(notes = []) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  window.dispatchEvent(new CustomEvent("pf2-player-notes-changed", { detail: notes }));
}

export function createPlayerNote({ title = "Новая заметка", body = "", linkedPath = "", linkedTitle = "" } = {}) {
  const now = new Date().toISOString();
  return {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title.trim() || "Новая заметка",
    body,
    linkedPath,
    linkedTitle,
    createdAt: now,
    updatedAt: now
  };
}

export function usePlayerNotes() {
  const [notes, setNotes] = useState(() => loadPlayerNotes());

  useEffect(() => {
    const sync = () => setNotes(loadPlayerNotes());
    window.addEventListener("storage", sync);
    window.addEventListener("pf2-player-notes-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("pf2-player-notes-changed", sync);
    };
  }, []);

  function persist(nextNotes) {
    setNotes(nextNotes);
    savePlayerNotes(nextNotes);
  }

  function addNote(input) {
    const note = createPlayerNote(input);
    persist([note, ...notes]);
    return note;
  }

  function updateNote(id, patch) {
    const next = notes.map((note) => note.id === id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note);
    persist(next);
  }

  function deleteNote(id) {
    persist(notes.filter((note) => note.id !== id));
  }

  return { notes, setNotes: persist, addNote, updateNote, deleteNote };
}

export function notesForPage(notes = [], pagePath = "") {
  return notes.filter((note) => note.linkedPath === pagePath);
}