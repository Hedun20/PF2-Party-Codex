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

function normalizePath(value = "") {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
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

export function createPlayerNote({ title = "Новая заметка", body = "", linkedPath = "", linkedTitle = "", visibility = "private" } = {}) {
  const stamp = now();
  return {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: String(title || "").trim() || "Новая заметка",
    body: String(body || ""),
    linkedPath: normalizePath(linkedPath),
    linkedTitle: String(linkedTitle || ""),
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
      setError("");
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

  const persistLocal = useCallback((updater) => {
    setNotes((current) => {
      const nextNotes = typeof updater === "function" ? updater(current) : updater;
      savePlayerNotes(nextNotes);
      return nextNotes;
    });
  }, []);

  const addNote = useCallback(async (input = {}) => {
    const payload = { ...input, linkedPath: normalizePath(input.linkedPath) };
    if (storageMode === "mongo") {
      setError("");
      try {
        const data = await api.createNote(payload);
        const note = data.note;
        setNotes((current) => [note, ...current.filter((item) => item.id !== note.id)]);
        return note;
      } catch (createError) {
        setError(createError.message || "Could not create note.");
        throw createError;
      }
    }
    const note = createPlayerNote(payload);
    persistLocal((current) => [note, ...current]);
    return note;
  }, [persistLocal, storageMode]);

  const updateNote = useCallback(async (id, patch) => {
    const payload = { ...patch };
    if (Object.prototype.hasOwnProperty.call(payload, "linkedPath")) payload.linkedPath = normalizePath(payload.linkedPath);

    if (storageMode === "mongo") {
      setError("");
      try {
        const data = await api.updateNote(id, payload);
        setNotes((current) => current.map((note) => note.id === id ? data.note : note));
        return data.note;
      } catch (updateError) {
        setError(updateError.message || "Could not update note.");
        throw updateError;
      }
    }

    let saved = null;
    persistLocal((current) => current.map((note) => {
      if (note.id !== id) return note;
      saved = { ...note, ...payload, updatedAt: now() };
      return saved;
    }));
    return saved;
  }, [persistLocal, storageMode]);

  const deleteNote = useCallback(async (id) => {
    if (storageMode === "mongo") {
      setError("");
      try {
        await api.deleteNote(id);
        setNotes((current) => current.filter((note) => note.id !== id));
        return;
      } catch (deleteError) {
        setError(deleteError.message || "Could not delete note.");
        throw deleteError;
      }
    }
    persistLocal((current) => current.filter((note) => note.id !== id));
  }, [persistLocal, storageMode]);

  return { notes, setNotes: persistLocal, addNote, updateNote, deleteNote, reloadNotes: loadRemote, storageMode, busy, error };
}

export function notesForPage(notes = [], pagePath = "") {
  const normalized = normalizePath(pagePath);
  return notes.filter((note) => normalizePath(note.linkedPath) === normalized);
}
