import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client.js";

const NOTES_KEY = "pf2-player-notes:v1";

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) || fallback;
  } catch {
    return fallback;
  }
}

function now() {
  return new Date().toISOString();
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

export function createPlayerNote({ title = "Новая заметка", body = "", linkedPath = "", linkedTitle = "", visibility = "private" } = {}) {
  const stamp = now();
  return {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title.trim() || "Новая заметка",
    body,
    linkedPath,
    linkedTitle,
    linkedEntryIds: [],
    tags: [],
    visibility,
    createdAt: stamp,
    updatedAt: stamp
  };
}

export function usePlayerNotes() {
  const [notes, setNotes] = useState(() => loadPlayerNotes());
  const [storageMode, setStorageMode] = useState("browser");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadRemote = useCallback(async () => {
    if (!api.getToken()) {
      setStorageMode("browser");
      setNotes(loadPlayerNotes());
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api.notes("mine");
      setNotes(Array.isArray(data.notes) ? data.notes : []);
      setStorageMode("mongo");
    } catch (loadError) {
      setStorageMode("browser");
      setError(loadError.message || "Notes API unavailable; using browser fallback.");
      setNotes(loadPlayerNotes());
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    loadRemote();
  }, [loadRemote]);

  useEffect(() => {
    const sync = () => {
      if (storageMode === "browser") setNotes(loadPlayerNotes());
    };
    window.addEventListener("storage", sync);
    window.addEventListener("pf2-player-notes-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("pf2-player-notes-changed", sync);
    };
  }, [storageMode]);

  const persistLocal = useCallback((nextNotes) => {
    setNotes(nextNotes);
    savePlayerNotes(nextNotes);
  }, []);

  const addNote = useCallback(async (input = {}) => {
    if (storageMode === "mongo") {
      const data = await api.createNote(input);
      const note = data.note;
      setNotes((current) => [note, ...current]);
      return note;
    }
    const note = createPlayerNote(input);
    const next = [note, ...notes];
    persistLocal(next);
    return note;
  }, [notes, persistLocal, storageMode]);

  const updateNote = useCallback(async (id, patch) => {
    if (storageMode === "mongo") {
      const data = await api.updateNote(id, patch);
      setNotes((current) => current.map((note) => note.id === id ? data.note : note));
      return data.note;
    }
    const next = notes.map((note) => note.id === id ? { ...note, ...patch, updatedAt: now() } : note);
    persistLocal(next);
    return next.find((note) => note.id === id);
  }, [notes, persistLocal, storageMode]);

  const deleteNote = useCallback(async (id) => {
    if (storageMode === "mongo") {
      await api.deleteNote(id);
      setNotes((current) => current.filter((note) => note.id !== id));
      return;
    }
    persistLocal(notes.filter((note) => note.id !== id));
  }, [notes, persistLocal, storageMode]);

  return { notes, setNotes: persistLocal, addNote, updateNote, deleteNote, reloadNotes: loadRemote, storageMode, busy, error };
}

export function notesForPage(notes = [], pagePath = "") {
  return notes.filter((note) => note.linkedPath === pagePath);
}
