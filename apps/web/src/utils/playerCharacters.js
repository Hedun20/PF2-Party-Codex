import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

const defaultCharacter = {
  attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  defenses: { ac: 10, hp: 10, maxHp: 10, perception: 0, fortitude: 0, reflex: 0, will: 0 }
};

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

export function usePlayerCharacters() {
  const [characters, setCharacters] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadRemote = useCallback(async () => {
    if (!api.getToken()) {
      setCharacters([]);
      setError("Sign in to access campaign characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api.characters("mine");
      setCharacters((data.characters || []).map(characterToLegacyShape));
    } catch (loadError) {
      setCharacters([]);
      setError(loadError.message || "Campaign characters are unavailable.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    loadRemote();
  }, [loadRemote]);

  const addCharacter = useCallback(async (seed = {}) => {
    setError("");
    try {
      const data = await api.createCharacter(seed);
      const character = characterToLegacyShape(data.character);
      setCharacters((current) => [character, ...current.filter((item) => item.id !== character.id)]);
      return character;
    } catch (createError) {
      setError(createError.message || "Could not create character.");
      throw createError;
    }
  }, []);

  const updateCharacter = useCallback(async (id, patch) => {
    setError("");
    try {
      const data = await api.updateCharacter(id, patch);
      const character = characterToLegacyShape(data.character);
      setCharacters((current) => current.map((item) => item.id === id ? character : item));
      return character;
    } catch (updateError) {
      setError(updateError.message || "Could not update character.");
      throw updateError;
    }
  }, []);

  const deleteCharacter = useCallback(async (id) => {
    setError("");
    try {
      await api.deleteCharacter(id);
      setCharacters((current) => current.filter((character) => character.id !== id));
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete character.");
      throw deleteError;
    }
  }, []);

  const importCharacter = useCallback(async ({ adapter = "pathbuilder", rawImport, originalFilename = "" }) => {
    const commit = await api.characterImportCommit(adapter, { rawImport, originalFilename });
    const character = characterToLegacyShape(commit.character);
    setCharacters((current) => [character, ...current.filter((item) => item.id !== character.id)]);
    return { ...commit, character };
  }, []);

  const dryRunImport = useCallback(async ({ adapter = "pathbuilder", rawImport, originalFilename = "" }) => {
    return api.characterImportDryRun(adapter, { rawImport, originalFilename });
  }, []);

  const publicCharacters = useMemo(() => characters.filter((character) => character.isVisibleToParty), [characters]);

  return {
    characters,
    publicCharacters,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    importCharacter,
    dryRunImport,
    reloadCharacters: loadRemote,
    storageMode: "mongo",
    busy,
    error
  };
}
