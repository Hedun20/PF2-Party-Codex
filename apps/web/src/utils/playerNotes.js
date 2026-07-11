import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client.js";

function normalizePath(value = "") {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
  }
}

export function usePlayerNotes() {
  const [notes, setNotes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadRemote = useCallback(async () => {
    if (!api.getToken()) {
      setNotes([]);
      setError("Sign in to access campaign notes.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api.notes("mine");
      setNotes(Array.isArray(data.notes) ? data.notes : []);
    } catch (loadError) {
      setNotes([]);
      setError(loadError.message || "Campaign notes are unavailable.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    loadRemote();
  }, [loadRemote]);

  const addNote = useCallback(async (input = {}) => {
    setError("");
    try {
      const payload = { ...input, linkedPath: normalizePath(input.linkedPath) };
      const data = await api.createNote(payload);
      const note = data.note;
      setNotes((current) => [note, ...current.filter((item) => item.id !== note.id)]);
      return note;
    } catch (createError) {
      setError(createError.message || "Could not create note.");
      throw createError;
    }
  }, []);

  const updateNote = useCallback(async (id, patch) => {
    setError("");
    try {
      const payload = { ...patch };
      if (Object.prototype.hasOwnProperty.call(payload, "linkedPath")) payload.linkedPath = normalizePath(payload.linkedPath);
      const data = await api.updateNote(id, payload);
      setNotes((current) => current.map((note) => note.id === id ? data.note : note));
      return data.note;
    } catch (updateError) {
      setError(updateError.message || "Could not update note.");
      throw updateError;
    }
  }, []);

  const deleteNote = useCallback(async (id) => {
    setError("");
    try {
      await api.deleteNote(id);
      setNotes((current) => current.filter((note) => note.id !== id));
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete note.");
      throw deleteError;
    }
  }, []);

  return {
    notes,
    setNotes,
    addNote,
    updateNote,
    deleteNote,
    reloadNotes: loadRemote,
    storageMode: "mongo",
    busy,
    error
  };
}

export function notesForPage(notes = [], pagePath = "") {
  const normalized = normalizePath(pagePath);
  return notes.filter((note) => normalizePath(note.linkedPath) === normalized);
}
