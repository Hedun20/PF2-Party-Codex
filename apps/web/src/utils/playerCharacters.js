import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

const CHARACTERS_KEY = "pf2-player-characters:v1";

const defaultCharacter = {
  name: "New character",
  playerName: "",
  ancestry: "",
  heritage: "",
  background: "",
  className: "",
  level: 1,
  alignment: "",
  attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  defenses: { ac: 10, hp: 10, maxHp: 10, perception: 0, fortitude: 0, reflex: 0, will: 0 },
  skillIds: [],
  featIds: [],
  publicSummary: "",
  privateNotes: "",
  buildNotes: "",
  gmNotes: "",
  inventoryText: "",
  linkedArticles: [],
  isVisibleToParty: false,
  isSharedWithGm: true
};

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) || fallback;
  } catch {
    return fallback;
  }
}

function uid() {
  return `char-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

export function characterToLegacyShape(character = {}) {
  if (!character.identity && !character.stats) return character;
  const identity = character.identity || {};
  const stats = character.stats || {};
  const saves = stats.saves || {};
  const text = character.text || {};
  const links = character.links || {};
  const visibility = character.visibility || {};
  const inventory = character.inventory || {};
  return {
    id: character.id,
    campaignId: character.campaignId,
    ownerUserId: character.ownerUserId,
    source: character.source || {},
    rawCharacter: character,
    name: identity.name || "New character",
    playerName: character.playerName || "",
    ancestry: identity.ancestry || "",
    heritage: identity.heritage || "",
    background: identity.background || "",
    className: identity.className || "",
    level: identity.level || 1,
    alignment: identity.alignment || "",
    attributes: stats.abilities || defaultCharacter.attributes,
    defenses: {
      ac: stats.armorClass ?? 10,
      hp: stats.currentHp ?? 10,
      maxHp: stats.maxHp ?? 10,
      perception: stats.perception ?? 0,
      fortitude: saves.fortitude ?? 0,
      reflex: saves.reflex ?? 0,
      will: saves.will ?? 0
    },
    skillIds: Array.isArray(stats.skills) ? stats.skills.map((skill) => skill.id || skill.name).filter(Boolean) : [],
    featIds: Array.isArray(character.progression?.feats) ? character.progression.feats.map((feat) => feat.id || feat.name).filter(Boolean) : [],
    attacks: character.combat?.attacks || [],
    spells: character.magic?.spells || [],
    publicSummary: text.publicSummary || "",
    privateNotes: text.privateNotes || "",
    buildNotes: text.buildNotes || "",
    gmNotes: text.gmNotes || "",
    inventoryText: inventory.text || "",
    linkedArticles: links.linkedEntryIds || [],
    isVisibleToParty: Boolean(visibility.visibleToParty),
    isSharedWithGm: visibility.sharedWithGm !== false,
    createdAt: character.createdAt,
    updatedAt: character.updatedAt
  };
}

export function loadPlayerCharacters() {
  if (typeof localStorage === "undefined") return [];
  const characters = safeParse(localStorage.getItem(CHARACTERS_KEY), []);
  return Array.isArray(characters) ? characters : [];
}

export function savePlayerCharacters(characters = []) {
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
  const [storageMode, setStorageMode] = useState("browser");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadRemote = useCallback(async () => {
    if (!api.getToken()) {
      setStorageMode("browser");
      setCharacters(loadPlayerCharacters());
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api.characters("mine");
      setCharacters((data.characters || []).map(characterToLegacyShape));
      setStorageMode("mongo");
    } catch (loadError) {
      setStorageMode("browser");
      setError(loadError.message || "Characters API unavailable; using browser fallback.");
      setCharacters(loadPlayerCharacters());
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    loadRemote();
  }, [loadRemote]);

  useEffect(() => {
    const sync = () => {
      if (storageMode === "browser") setCharacters(loadPlayerCharacters());
    };
    window.addEventListener("storage", sync);
    window.addEventListener("pf2-player-characters:changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("pf2-player-characters:changed", sync);
    };
  }, [storageMode]);

  const persistLocal = useCallback((next) => {
    setCharacters(next);
    savePlayerCharacters(next);
  }, []);

  const addCharacter = useCallback(async (seed = {}) => {
    if (storageMode === "mongo") {
      const data = await api.createCharacter(seed);
      const character = characterToLegacyShape(data.character);
      setCharacters((current) => [character, ...current]);
      return character;
    }
    const character = createPlayerCharacter(seed);
    persistLocal([character, ...characters]);
    return character;
  }, [characters, persistLocal, storageMode]);

  const updateCharacter = useCallback(async (id, patch) => {
    if (storageMode === "mongo") {
      const data = await api.updateCharacter(id, patch);
      const character = characterToLegacyShape(data.character);
      setCharacters((current) => current.map((item) => item.id === id ? character : item));
      return character;
    }
    const next = characters.map((character) => character.id === id ? { ...character, ...patch, updatedAt: now() } : character);
    persistLocal(next);
    return next.find((character) => character.id === id);
  }, [characters, persistLocal, storageMode]);

  const deleteCharacter = useCallback(async (id) => {
    if (storageMode === "mongo") {
      await api.deleteCharacter(id);
      setCharacters((current) => current.filter((character) => character.id !== id));
      return;
    }
    persistLocal(characters.filter((character) => character.id !== id));
  }, [characters, persistLocal, storageMode]);

  const importCharacter = useCallback(async ({ adapter = "pathbuilder", rawImport, originalFilename = "" }) => {
    const commit = await api.characterImportCommit(adapter, { rawImport, originalFilename });
    const character = characterToLegacyShape(commit.character);
    setCharacters((current) => [character, ...current]);
    setStorageMode("mongo");
    return { ...commit, character };
  }, []);

  const dryRunImport = useCallback(async ({ adapter = "pathbuilder", rawImport, originalFilename = "" }) => {
    return api.characterImportDryRun(adapter, { rawImport, originalFilename });
  }, []);

  const publicCharacters = useMemo(() => characters.filter((character) => character.isVisibleToParty), [characters]);

  return { characters, publicCharacters, addCharacter, updateCharacter, deleteCharacter, importCharacter, dryRunImport, reloadCharacters: loadRemote, storageMode, busy, error };
}
