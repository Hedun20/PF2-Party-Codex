import { useCallback, useEffect, useMemo, useState } from "react";

export const CHARACTERS_KEY = "pf2-player-characters:v1";

const defaultCharacter = {
  name: "Новый персонаж",
  ancestry: "",
  heritage: "",
  background: "",
  className: "",
  level: 1,
  alignment: "",
  pronouns: "",
  playerName: "",
  campaign: "Основная кампания",
  publicSummary: "",
  privateNotes: "",
  isSharedWithGm: true,
  isVisibleToParty: false,
  attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  defenses: { ac: 10, hp: 10, maxHp: 10, perception: 0, fortitude: 0, reflex: 0, will: 0 },
  skillIds: [],
  featIds: [],
  skillsText: "",
  featsText: "",
  inventoryText: "",
  linkedArticles: []
};

function uid() {
  return `pc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

export function loadPlayerCharacters() {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CHARACTERS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePlayerCharacters(characters) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(CHARACTERS_KEY, JSON.stringify(characters));
  window.dispatchEvent(new CustomEvent("pf2-player-characters:changed", { detail: characters }));
}

export function createPlayerCharacter(seed = {}) {
  const stamp = now();
  return {
    ...defaultCharacter,
    ...seed,
    attributes: { ...defaultCharacter.attributes, ...(seed.attributes || {}) },
    defenses: { ...defaultCharacter.defenses, ...(seed.defenses || {}) },
    linkedArticles: Array.isArray(seed.linkedArticles) ? seed.linkedArticles : [],
    skillIds: Array.isArray(seed.skillIds) ? seed.skillIds : [],
    featIds: Array.isArray(seed.featIds) ? seed.featIds : [],
    id: uid(),
    createdAt: stamp,
    updatedAt: stamp
  };
}

export function usePlayerCharacters() {
  const [characters, setCharacters] = useState(() => loadPlayerCharacters());

  useEffect(() => {
    const sync = () => setCharacters(loadPlayerCharacters());
    window.addEventListener("storage", sync);
    window.addEventListener("pf2-player-characters:changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("pf2-player-characters:changed", sync);
    };
  }, []);

  const persist = useCallback((next) => {
    setCharacters(next);
    savePlayerCharacters(next);
  }, []);

  const addCharacter = useCallback((seed = {}) => {
    const character = createPlayerCharacter(seed);
    persist([character, ...characters]);
    return character;
  }, [characters, persist]);

  const updateCharacter = useCallback((id, patch) => {
    persist(characters.map((character) => character.id === id ? { ...character, ...patch, updatedAt: now() } : character));
  }, [characters, persist]);

  const deleteCharacter = useCallback((id) => {
    persist(characters.filter((character) => character.id !== id));
  }, [characters, persist]);

  const publicCharacters = useMemo(() => characters.filter((character) => character.isVisibleToParty), [characters]);

  return { characters, publicCharacters, addCharacter, updateCharacter, deleteCharacter };
}
