import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Eye, EyeOff, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import CodexButton from "../components/ui/CodexButton.jsx";
import { api } from "../api/client.js";
import { usePlayerCharacters } from "../utils/playerCharacters.js";
import { labelCategory } from "../utils/labels.js";

const attributes = [["str", "STR"], ["dex", "DEX"], ["con", "CON"], ["int", "INT"], ["wis", "WIS"], ["cha", "CHA"]];

const emptyOptions = {
  meta: { sourceLabel: "PF2e options" },
  ancestries: [],
  heritages: [],
  backgrounds: [],
  classes: [],
  skills: [],
  feats: [],
  alignments: [],
  attributeOptions: [8, 10, 12, 14, 16, 18],
  levels: Array.from({ length: 20 }, (_, index) => index + 1)
};

function pageLabel(page) {
  return `${page.title} - ${labelCategory(page.category)}`;
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionName(options = [], id = "") {
  return options.find((item) => item.id === id)?.name || id;
}

function shortClass(character, options) {
  const ancestry = optionName(options.ancestries, character.ancestry);
  const className = optionName(options.classes, character.className);
  return [ancestry, className].filter(Boolean).join(" - ") || "Class not selected";
}

function SelectField({ label, value, onChange, options = [], placeholder = "Select", disabled = false }) {
  return (
    <label>{label}
      <select value={value || ""} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        <option value="">{placeholder}</option>
        {options.map((item) => <option key={item.id ?? item} value={item.id ?? item}>{item.name ?? item}</option>)}
      </select>
    </label>
  );
}

function MultiSelectField({ label, values = [], onChange, options = [] }) {
  return (
    <label>{label}
      <select value="" onChange={(event) => {
        const value = event.target.value;
        if (!value) return;
        if (!values.includes(value)) onChange([...values, value]);
      }}>
        <option value="">Add</option>
        {options.filter((item) => !values.includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
  );
}

function ChipList({ values = [], options = [], onRemove }) {
  if (!values.length) return <p className="character-muted-line">Nothing selected yet.</p>;
  return (
    <div className="character-chip-list">
      {values.map((value) => (
        <button key={value} type="button" onClick={() => onRemove(value)} title="Remove">
          {optionName(options, value)} x
        </button>
      ))}
    </div>
  );
}

export default function CharactersPage({ pages = [] }) {
  const { characters, publicCharacters, addCharacter, updateCharacter, deleteCharacter } = usePlayerCharacters();
  const [selectedId, setSelectedId] = useState(characters[0]?.id || "");
  const [options, setOptions] = useState(emptyOptions);
  const [optionsSource, setOptionsSource] = useState("auto");
  const [optionsError, setOptionsError] = useState("");
  const [optionsBusy, setOptionsBusy] = useState(false);
  const selected = characters.find((character) => character.id === selectedId) || characters[0] || null;
  const sortedPages = useMemo(() => [...pages].sort((a, b) => a.title.localeCompare(b.title)), [pages]);

  useEffect(() => {
    setOptionsBusy(true);
    setOptionsError("");
    api.pf2Options(optionsSource)
      .then((data) => setOptions({ ...emptyOptions, ...data }))
      .catch((error) => setOptionsError(error.message))
      .finally(() => setOptionsBusy(false));
  }, [optionsSource]);

  useEffect(() => {
    if (!selectedId && characters[0]?.id) setSelectedId(characters[0].id);
  }, [characters, selectedId]);

  const heritageOptions = useMemo(() => {
    if (!selected?.ancestry) return options.heritages;
    return options.heritages.filter((heritage) => !heritage.ancestry || heritage.ancestry === selected.ancestry);
  }, [options.heritages, selected?.ancestry]);

  const featOptions = useMemo(() => {
    const level = Number(selected?.level || 1);
    return options.feats.filter((feat) => Number(feat.level || 1) <= level && (!feat.ancestry || feat.ancestry === selected?.ancestry));
  }, [options.feats, selected?.level, selected?.ancestry]);

  function createCharacter() {
    const character = addCharacter({ name: "New character" });
    setSelectedId(character.id);
  }

  function patchField(field, value) {
    updateCharacter(selected.id, { [field]: value });
  }

  function patchNested(group, key, value) {
    updateCharacter(selected.id, { [group]: { ...selected[group], [key]: value } });
  }

  function toggleLinkedArticle(path) {
    const current = selected.linkedArticles || [];
    const next = current.includes(path) ? current.filter((item) => item !== path) : [...current, path];
    updateCharacter(selected.id, { linkedArticles: next });
  }

  function removeSelected() {
    const next = characters.find((character) => character.id !== selected.id);
    deleteCharacter(selected.id);
    setSelectedId(next?.id || "");
  }

  return (
    <div className="page-stack characters-page">
      <header className="list-header characters-header">
        <span className="kicker">Player Workspace</span>
        <h1>Characters</h1>
        <p>PF2e builder uses API-backed options: ancestry, heritage, background, class, feats and skills are selected from data instead of typed by hand.</p>
      </header>

      <div className={`status-message pf2-source-strip ${options.meta?.fallback ? "warning-message" : ""}`}>
        <span>PF2 source: {options.meta?.sourceLabel || "PF2e options"}{optionsBusy ? " - loading..." : ""}</span>
        <div>
          <button type="button" className={optionsSource === "auto" ? "active" : ""} onClick={() => setOptionsSource("auto")}>Auto</button>
          <button type="button" className={optionsSource === "foundry" ? "active" : ""} onClick={() => setOptionsSource("foundry")}>Foundry</button>
          <button type="button" className={optionsSource === "local" ? "active" : ""} onClick={() => setOptionsSource("local")}>Local</button>
        </div>
      </div>
      {optionsError && <div className="status-message danger-message">PF2 API: {optionsError}</div>}

      <section className="characters-layout">
        <aside className="character-list-panel">
          <div className="notes-list-head">
            <div>
              <span className="kicker">Party roster</span>
              <h2>{characters.length} characters</h2>
            </div>
            <button type="button" className="notes-icon-action" onClick={createCharacter} title="New character"><Plus size={18} /></button>
          </div>
          <div className="character-list">
            {characters.map((character) => (
              <button key={character.id} type="button" className={selected?.id === character.id ? "is-active" : ""} onClick={() => setSelectedId(character.id)}>
                <strong>{character.name || "Unnamed"}</strong>
                <span>{shortClass(character, options)} - level {character.level || 1}</span>
                <small>{character.isVisibleToParty ? "visible to party" : "private draft"}</small>
              </button>
            ))}
            {!characters.length && <p className="empty-copy">No characters yet.</p>}
          </div>
          {publicCharacters.length > 0 && (
            <div className="party-visible-box">
              <span className="kicker">Visible to party</span>
              {publicCharacters.map((character) => <strong key={character.id}>{character.name}</strong>)}
            </div>
          )}
        </aside>

        <section className="character-sheet-panel">
          {selected ? (
            <>
              <div className="character-sheet-head">
                <UserRound size={28} />
                <div>
                  <span className="kicker">{options.meta?.sourceLabel || "PF2e options"}</span>
                  <input value={selected.name} onChange={(event) => patchField("name", event.target.value)} />
                </div>
                <button type="button" onClick={removeSelected} title="Delete character"><Trash2 size={18} /></button>
              </div>

              <div className="character-privacy-row">
                <button type="button" className={selected.isSharedWithGm ? "active" : ""} onClick={() => patchField("isSharedWithGm", !selected.isSharedWithGm)}>
                  <ShieldCheck size={16} /> {selected.isSharedWithGm ? "GM can view sheet" : "Hidden from GM"}
                </button>
                <button type="button" className={selected.isVisibleToParty ? "active" : ""} onClick={() => patchField("isVisibleToParty", !selected.isVisibleToParty)}>
                  {selected.isVisibleToParty ? <Eye size={16} /> : <EyeOff size={16} />} {selected.isVisibleToParty ? "Party summary visible" : "Hidden from party"}
                </button>
              </div>

              <div className="character-field-grid">
                <label>Player<input value={selected.playerName} onChange={(event) => patchField("playerName", event.target.value)} /></label>
                <SelectField label="Class" value={selected.className} onChange={(value) => patchField("className", value)} options={options.classes} />
                <SelectField label="Level" value={selected.level} onChange={(value) => patchField("level", numberValue(value, 1))} options={options.levels} />
                <SelectField label="Ancestry" value={selected.ancestry} onChange={(value) => updateCharacter(selected.id, { ancestry: value, heritage: "" })} options={options.ancestries} />
                <SelectField label="Heritage" value={selected.heritage} onChange={(value) => patchField("heritage", value)} options={heritageOptions} disabled={!selected.ancestry} />
                <SelectField label="Background" value={selected.background} onChange={(value) => patchField("background", value)} options={options.backgrounds} />
                <SelectField label="Alignment" value={selected.alignment} onChange={(value) => patchField("alignment", value)} options={options.alignments} />
              </div>

              <div className="character-score-grid">
                {attributes.map(([key, label]) => (
                  <SelectField key={key} label={label} value={selected.attributes?.[key] ?? 10} onChange={(value) => patchNested("attributes", key, numberValue(value, 10))} options={options.attributeOptions} />
                ))}
              </div>

              <div className="character-field-grid compact">
                <label>AC<input type="number" value={selected.defenses?.ac ?? 10} onChange={(event) => patchNested("defenses", "ac", numberValue(event.target.value, 10))} /></label>
                <label>HP<input type="number" value={selected.defenses?.hp ?? 10} onChange={(event) => patchNested("defenses", "hp", numberValue(event.target.value, 10))} /></label>
                <label>Max HP<input type="number" value={selected.defenses?.maxHp ?? 10} onChange={(event) => patchNested("defenses", "maxHp", numberValue(event.target.value, 10))} /></label>
                <label>Perception<input type="number" value={selected.defenses?.perception ?? 0} onChange={(event) => patchNested("defenses", "perception", numberValue(event.target.value, 0))} /></label>
                <label>Fort<input type="number" value={selected.defenses?.fortitude ?? 0} onChange={(event) => patchNested("defenses", "fortitude", numberValue(event.target.value, 0))} /></label>
                <label>Ref<input type="number" value={selected.defenses?.reflex ?? 0} onChange={(event) => patchNested("defenses", "reflex", numberValue(event.target.value, 0))} /></label>
                <label>Will<input type="number" value={selected.defenses?.will ?? 0} onChange={(event) => patchNested("defenses", "will", numberValue(event.target.value, 0))} /></label>
              </div>

              <section className="character-picker-panel">
                <div>
                  <span className="kicker">PF2 API picks</span>
                  <h2>Skills and feats</h2>
                </div>
                <div className="character-picker-grid">
                  <div>
                    <MultiSelectField label="Skills" values={selected.skillIds || []} onChange={(value) => patchField("skillIds", value)} options={options.skills} />
                    <ChipList values={selected.skillIds || []} options={options.skills} onRemove={(value) => patchField("skillIds", (selected.skillIds || []).filter((item) => item !== value))} />
                  </div>
                  <div>
                    <MultiSelectField label="Feats" values={selected.featIds || []} onChange={(value) => patchField("featIds", value)} options={featOptions} />
                    <ChipList values={selected.featIds || []} options={options.feats} onRemove={(value) => patchField("featIds", (selected.featIds || []).filter((item) => item !== value))} />
                  </div>
                </div>
              </section>

              <div className="character-notes-grid">
                <label className="character-text-field">Party summary<textarea value={selected.publicSummary} onChange={(event) => patchField("publicSummary", event.target.value)} placeholder="What other players know about this character..." /></label>
                <label className="character-text-field">Private notes<textarea value={selected.privateNotes} onChange={(event) => patchField("privateNotes", event.target.value)} placeholder="Secrets, personal goal, build draft..." /></label>
                <label className="character-text-field">Inventory<textarea value={selected.inventoryText || ""} onChange={(event) => patchField("inventoryText", event.target.value)} placeholder="Weapons, armor, potions, important items..." /></label>
              </div>

              <section className="character-links-panel">
                <div>
                  <span className="kicker">Linked articles</span>
                  <h2>Where this character appeared</h2>
                </div>
                <div className="character-link-list">
                  {sortedPages.slice(0, 80).map((page) => (
                    <button key={page.path} type="button" className={(selected.linkedArticles || []).includes(page.path) ? "active" : ""} onClick={() => toggleLinkedArticle(page.path)}>
                      <BookOpen size={14} /> {pageLabel(page)}
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="notes-empty-editor character-empty-state">
              <UserRound size={38} />
              <h2>Create the first character</h2>
              <p>The builder loads classes, ancestry, background, skills and feats through the PF2 API layer.</p>
              <CodexButton type="button" onClick={createCharacter}><Plus size={16} /> New character</CodexButton>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
