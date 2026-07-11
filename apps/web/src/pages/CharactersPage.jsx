import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, UserRound } from "lucide-react";
import { api } from "../api/client.js";

function valueOrDash(value) {
  return value === undefined || value === null || value === "" ? "-" : value;
}

function characterName(character = {}) {
  return character.identity?.name || character.name || "Unnamed character";
}

function characterSubtitle(character = {}) {
  const identity = character.identity || character;
  return [identity.ancestry, identity.heritage, identity.background, identity.className ? `${identity.className}` : "", identity.level ? `Level ${identity.level}` : ""]
    .filter(Boolean)
    .join(" · ");
}

function firstNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function CharacterCard({ character, selected, onSelect }) {
  const visibility = character.visibility || {};
  return (
    <button type="button" className={selected ? "is-active" : ""} onClick={onSelect}>
      <strong>{characterName(character)}</strong>
      <span>{characterSubtitle(character) || "Character identity not filled yet"}</span>
      <small>{visibility.visibleToParty ? "party visible" : "private"} · {visibility.sharedWithGm === false ? "not shared with GM" : "shared with GM"}</small>
    </button>
  );
}

function TextBlock({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <span className="kicker">{label}</span>
      <p>{value}</p>
    </div>
  );
}

export default function CharactersPage() {
  const [state, setState] = useState({ loading: true, error: "", characters: [] });
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: "", characters: [] });
    api.characters("mine")
      .then((data) => {
        if (!active) return;
        setState({ loading: false, error: "", characters: Array.isArray(data.characters) ? data.characters : [] });
      })
      .catch((error) => {
        if (!active) return;
        setState({ loading: false, error: error.message || "Characters API failed.", characters: [] });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId && state.characters[0]?.id) setSelectedId(state.characters[0].id);
    if (selectedId && !state.characters.some((character) => character.id === selectedId)) setSelectedId(state.characters[0]?.id || "");
  }, [selectedId, state.characters]);

  const selected = useMemo(() => state.characters.find((character) => character.id === selectedId) || state.characters[0] || null, [selectedId, state.characters]);
  const identity = selected?.identity || {};
  const stats = selected?.stats || {};
  const saves = stats.saves || {};
  const text = selected?.text || {};
  const abilities = stats.abilities || {};
  const hp = firstNumber(stats.currentHp, stats.hp);
  const maxHp = firstNumber(stats.maxHp);

  return (
    <div className="page-stack characters-page">
      <header className="list-header characters-header">
        <span className="kicker">Player Workspace</span>
        <h1>My Character</h1>
        <p>Read-only character identity and play reference from the campaign Mongo API. Character building and import are intentionally deferred.</p>
      </header>

      {state.loading ? <div className="status-message success-message"><span>Loading characters from Mongo...</span></div> : null}
      {state.error ? <div className="status-message danger-message"><span>{state.error}</span></div> : null}

      <section className="characters-layout">
        <aside className="character-list-panel">
          <div className="notes-list-head">
            <div>
              <span className="kicker">My roster</span>
              <h2>{state.characters.length} characters</h2>
            </div>
          </div>
          <div className="character-list">
            {state.characters.map((character) => (
              <CharacterCard key={character.id} character={character} selected={selected?.id === character.id} onSelect={() => setSelectedId(character.id)} />
            ))}
            {!state.loading && !state.error && !state.characters.length ? <p className="empty-copy">No character has been added to this campaign yet.</p> : null}
          </div>
        </aside>

        <section className="character-sheet-panel">
          {selected ? (
            <>
              <div className="character-sheet-head character-hero-sheet">
                <UserRound size={34} />
                <div>
                  <span className="kicker">Character dossier</span>
                  <h2>{characterName(selected)}</h2>
                  <p>{characterSubtitle(selected) || "No character identity fields returned yet."}</p>
                </div>
              </div>

              <div className="character-field-grid compact">
                <label>Ancestry<input readOnly value={valueOrDash(identity.ancestry)} /></label>
                <label>Heritage<input readOnly value={valueOrDash(identity.heritage)} /></label>
                <label>Background<input readOnly value={valueOrDash(identity.background)} /></label>
                <label>Class<input readOnly value={valueOrDash(identity.className)} /></label>
                <label>Level<input readOnly value={valueOrDash(identity.level)} /></label>
                <label>Speed<input readOnly value={valueOrDash(stats.speed)} /></label>
              </div>

              <div className="character-combat-strip">
                <strong>AC {valueOrDash(stats.armorClass)}</strong>
                <strong>HP {hp === null ? "-" : hp}{maxHp === null ? "" : `/${maxHp}`}</strong>
                <strong>Perception {valueOrDash(stats.perception)}</strong>
                <span>Fort {valueOrDash(saves.fortitude)}</span>
                <span>Ref {valueOrDash(saves.reflex)}</span>
                <span>Will {valueOrDash(saves.will)}</span>
              </div>

              <div className="character-score-grid">
                {[["str", "STR"], ["dex", "DEX"], ["con", "CON"], ["int", "INT"], ["wis", "WIS"], ["cha", "CHA"]].map(([key, label]) => (
                  <label key={key}>{label}<input readOnly value={valueOrDash(abilities[key])} /></label>
                ))}
              </div>

              <section className="character-readonly-blocks">
                <TextBlock label="Public summary" value={text.publicSummary} />
                <TextBlock label="Private notes" value={text.privateNotes} />
                <TextBlock label="Build notes" value={text.buildNotes} />
                <TextBlock label="GM notes" value={text.gmNotes} />
              </section>

              <div className="status-message success-message">
                <ShieldCheck size={16} />
                <span>Only fields returned by the backend are rendered. Raw imports and other players' private fields are not requested here.</span>
              </div>
            </>
          ) : (
            <div className="notes-empty-editor character-empty-state">
              <UserRound size={38} />
              <h2>No character has been added to this campaign yet.</h2>
              <p>Character creation, import, and full PF2e sheet polish are deferred to a future character stage.</p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}