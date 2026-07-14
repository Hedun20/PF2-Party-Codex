import { useEffect, useMemo, useState } from "react";
import {
  Backpack,
  BookOpenText,
  BrainCircuit,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Swords,
  UserRound,
  X
} from "lucide-react";
import { api } from "../api/client.js";
import RollToast from "../components/RollToast.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";
import { extractDiceFormula, rollCheck, rollFormula } from "../utils/diceRoller.js";

function valueOrDash(value) {
  return value === undefined || value === null || value === "" ? "—" : value;
}

function characterName(character = {}) {
  return character.identity?.name || character.name || "Безымянный персонаж";
}

function characterSubtitle(character = {}) {
  const identity = character.identity || character;
  return [identity.ancestry, identity.heritage, identity.className, identity.level ? `${identity.level} уровень` : ""]
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

function listOf(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function displayModifier(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return valueOrDash(value);
  return number > 0 ? `+${number}` : String(number);
}

function itemName(item) {
  if (typeof item === "string") return item;
  return item?.name || item?.label || item?.id || "Без названия";
}

function itemMeta(item) {
  if (!item || typeof item === "string") return "";
  const parts = [];
  if (item.level !== undefined && item.level !== "") parts.push(`ур. ${item.level}`);
  if (item.type) parts.push(item.type);
  if (item.rank) parts.push(item.rank);
  if (item.modifier !== undefined && item.modifier !== "") parts.push(displayModifier(item.modifier));
  if (item.bonus !== undefined && item.bonus !== "") parts.push(`атака ${displayModifier(item.bonus)}`);
  if (item.damage) parts.push(item.damage);
  if (item.quantity && Number(item.quantity) > 1) parts.push(`×${item.quantity}`);
  if (Array.isArray(item.traits) && item.traits.length) parts.push(item.traits.join(", "));
  return parts.filter(Boolean).join(" · ");
}

function initials(value = "") {
  return String(value).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "PC";
}

function portraitSource(visuals = {}) {
  const candidate = visuals.portraitUrl || visuals.portrait || visuals.icon || "";
  return /^(?:https?:|data:|\/)/.test(candidate) ? candidate : "";
}

function canManageCharacters(session) {
  return ["owner", "gm"].includes(String(session?.activeMembership?.role || "").toLowerCase());
}

function CharacterCard({ character, selected, onSelect }) {
  const visibility = character.visibility || {};
  return (
    <button type="button" className={selected ? "character-roster-card is-active" : "character-roster-card"} onClick={onSelect}>
      <span className="character-roster-avatar">{initials(characterName(character))}</span>
      <span className="character-roster-copy">
        <strong>{characterName(character)}</strong>
        <span>{characterSubtitle(character) || "Данные персонажа не заполнены"}</span>
        <small>{visibility.visibleToParty ? "Виден партии" : "Личный"} · {visibility.sharedWithGm === false ? "Не открыт GM" : "Открыт GM"}</small>
      </span>
    </button>
  );
}

function TextBlock({ label, value, privateBlock = false }) {
  if (!value) return null;
  return (
    <article className={privateBlock ? "character-text-card character-text-card--private" : "character-text-card"}>
      <span className="kicker">{label}</span>
      <p>{value}</p>
    </article>
  );
}

function Metric({ label, value, prominent = false, onRoll = null, rollHint = "" }) {
  const className = `${prominent ? "character-metric character-metric--prominent" : "character-metric"}${onRoll ? " character-roll-control" : ""}`;
  const body = <><span>{label}</span><strong>{valueOrDash(value)}</strong>{rollHint ? <small>{rollHint}</small> : null}</>;
  return onRoll
    ? <button type="button" className={className} onClick={onRoll} title={`Бросить ${label}`}>{body}</button>
    : <div className={className}>{body}</div>;
}

function CollectionSection({ title, icon: Icon, items, emptyText, rollKind = "", onRoll }) {
  const values = listOf(items);

  function rollItem(item) {
    if (rollKind === "attack") return onRoll?.(rollCheck(`${itemName(item)} · атака`, item?.bonus));
    if (rollKind === "skill") return onRoll?.(rollCheck(itemName(item), item?.modifier));
    const formula = extractDiceFormula(item?.formula || item?.roll || item?.damage || "");
    return formula ? onRoll?.(rollFormula(formula, { label: itemName(item) })) : null;
  }

  return (
    <section className="character-dossier-section">
      <header><Icon size={19} /><h3>{title}</h3><span>{values.length}</span></header>
      {values.length ? (
        <div className="character-item-grid">
          {values.map((item, index) => {
            const damageFormula = rollKind === "attack" ? extractDiceFormula(item?.damage || "") : "";
            const hasPrimaryRoll = rollKind === "attack" || rollKind === "skill" || extractDiceFormula(item?.formula || item?.roll || item?.damage || "");
            return (
              <article key={`${itemName(item)}-${index}`} className={hasPrimaryRoll ? "character-item-card character-item-card--rollable" : "character-item-card"}>
                <strong>{itemName(item)}</strong>
                {itemMeta(item) ? <span>{itemMeta(item)}</span> : null}
                {item?.description ? <p>{item.description}</p> : null}
                {hasPrimaryRoll ? (
                  <div className="character-item-roll-actions">
                    <button type="button" onClick={() => rollItem(item)}>{rollKind === "attack" ? "Бросок атаки" : "Бросить"}</button>
                    {damageFormula ? <button type="button" onClick={() => onRoll?.(rollFormula(damageFormula, { label: `${itemName(item)} · урон` }))}>Урон</button> : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : <p className="character-section-empty">{emptyText}</p>}
    </section>
  );
}

function lineValue(items, formatter) {
  return listOf(items).map(formatter).filter(Boolean).join("\n");
}

function characterToForm(character = null) {
  const identity = character?.identity || {};
  const stats = character?.stats || {};
  const saves = stats.saves || {};
  const abilities = stats.abilities || {};
  const text = character?.text || {};
  return {
    name: identity.name || "",
    ancestry: identity.ancestry || "",
    heritage: identity.heritage || "",
    background: identity.background || "",
    className: identity.className || "",
    level: identity.level ?? 1,
    alignment: identity.alignment || "",
    deity: identity.deity || "",
    languages: listOf(identity.languages).join(", "),
    portraitUrl: character?.visuals?.portraitUrl || character?.visuals?.portrait || character?.visuals?.icon || "",
    currentHp: stats.currentHp ?? stats.hp ?? 10,
    maxHp: stats.maxHp ?? 10,
    armorClass: stats.armorClass ?? 10,
    speed: stats.speed ?? 25,
    perception: stats.perception ?? 0,
    fortitude: saves.fortitude ?? 0,
    reflex: saves.reflex ?? 0,
    will: saves.will ?? 0,
    str: abilities.str ?? 0,
    dex: abilities.dex ?? 0,
    con: abilities.con ?? 0,
    int: abilities.int ?? 0,
    wis: abilities.wis ?? 0,
    cha: abilities.cha ?? 0,
    attacks: lineValue(character?.combat?.attacks, (item) => `${itemName(item)} | ${item?.bonus ?? ""} | ${item?.damage ?? ""} | ${listOf(item?.traits).join(", ")}`),
    skills: lineValue(stats.skills, (item) => `${itemName(item)} | ${item?.rank ?? ""} | ${item?.modifier ?? ""}`),
    feats: lineValue([...(character?.progression?.feats || []), ...(character?.progression?.classFeatures || []), ...(character?.progression?.ancestryFeatures || [])], (item) => itemName(item)),
    spells: lineValue(character?.magic?.spells, (item) => `${itemName(item)} | ${item?.level ?? ""} | ${item?.formula || item?.roll || item?.damage || ""} | ${item?.description || ""}`),
    inventory: lineValue([...(character?.inventory?.weapons || []), ...(character?.inventory?.armor || []), ...(character?.inventory?.worn || []), ...(character?.inventory?.consumables || []), ...(character?.inventory?.treasure || [])], (item) => `${itemName(item)} | ${item?.quantity ?? 1} | ${item?.level ?? ""}`),
    publicSummary: text.publicSummary || "",
    privateNotes: text.privateNotes || "",
    buildNotes: text.buildNotes || "",
    gmNotes: text.gmNotes || "",
    visibleToParty: Boolean(character?.visibility?.visibleToParty),
    sharedWithGm: character?.visibility?.sharedWithGm !== false
  };
}

function parseLines(value, mapper) {
  return String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => mapper(line.split("|").map((part) => part.trim()))).filter((item) => item?.name);
}

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function CharacterEditor({ character, onCancel, onSaved }) {
  const [form, setForm] = useState(() => characterToForm(character));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const editing = Boolean(character?.id);

  useEffect(() => setForm(characterToForm(character)), [character?.id]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      identity: {
        name: form.name.trim() || "Новый герой",
        ancestry: form.ancestry.trim(),
        heritage: form.heritage.trim(),
        background: form.background.trim(),
        className: form.className.trim(),
        level: numeric(form.level, 1),
        alignment: form.alignment.trim(),
        deity: form.deity.trim(),
        languages: form.languages.split(",").map((item) => item.trim()).filter(Boolean)
      },
      visuals: { portraitUrl: form.portraitUrl.trim() },
      stats: {
        currentHp: numeric(form.currentHp, 0),
        maxHp: numeric(form.maxHp, 0),
        armorClass: numeric(form.armorClass, 10),
        speed: numeric(form.speed, 25),
        perception: numeric(form.perception, 0),
        saves: { fortitude: numeric(form.fortitude), reflex: numeric(form.reflex), will: numeric(form.will) },
        abilities: { str: numeric(form.str), dex: numeric(form.dex), con: numeric(form.con), int: numeric(form.int), wis: numeric(form.wis), cha: numeric(form.cha) },
        skills: parseLines(form.skills, ([name, rank, modifier]) => ({ name, rank, modifier: numeric(modifier) }))
      },
      combat: {
        attacks: parseLines(form.attacks, ([name, bonus, damage, traits]) => ({ name, bonus: numeric(bonus), damage, traits: String(traits || "").split(",").map((item) => item.trim()).filter(Boolean) }))
      },
      magic: {
        spells: parseLines(form.spells, ([name, level, formula, description]) => ({ name, level, formula, description }))
      },
      progression: {
        feats: parseLines(form.feats, ([name]) => ({ name }))
      },
      inventory: {
        worn: parseLines(form.inventory, ([name, quantity, level]) => ({ name, quantity: numeric(quantity, 1), level }))
      },
      text: {
        publicSummary: form.publicSummary,
        privateNotes: form.privateNotes,
        buildNotes: form.buildNotes,
        gmNotes: form.gmNotes
      },
      visibility: { visibleToParty: form.visibleToParty, sharedWithGm: form.sharedWithGm }
    };

    try {
      let saved;
      if (editing) {
        saved = await api.updateCharacter(character.id, payload);
      } else {
        const created = await api.createCharacter({
          name: payload.identity.name,
          ancestry: payload.identity.ancestry,
          heritage: payload.identity.heritage,
          className: payload.identity.className,
          level: payload.identity.level,
          isSharedWithGm: true
        });
        saved = await api.updateCharacter(created.character.id, payload);
      }
      await onSaved(saved.character);
    } catch (saveError) {
      setError(saveError.message || "Не удалось сохранить персонажа.");
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    ["name", "Имя"], ["ancestry", "Наследие / народ"], ["heritage", "Происхождение"], ["className", "Класс"],
    ["level", "Уровень", "number"], ["background", "Предыстория"], ["alignment", "Мировоззрение"], ["deity", "Божество"],
    ["languages", "Языки через запятую"], ["portraitUrl", "URL портрета"]
  ];

  const statsFields = [
    ["currentHp", "HP сейчас"], ["maxHp", "HP максимум"], ["armorClass", "AC"], ["speed", "Скорость"], ["perception", "Восприятие"],
    ["fortitude", "Стойкость"], ["reflex", "Реакция"], ["will", "Воля"], ["str", "СИЛ"], ["dex", "ЛОВ"], ["con", "ТЕЛ"], ["int", "ИНТ"], ["wis", "МДР"], ["cha", "ХАР"]
  ];

  return (
    <form className="character-editor codex-card" onSubmit={submit}>
      <header className="character-editor__head">
        <div><span className="kicker">{editing ? "Редактирование героя" : "Новый герой мастера"}</span><h2>{editing ? characterName(character) : "Создать тестового персонажа"}</h2></div>
        <button type="button" onClick={onCancel} aria-label="Закрыть редактор"><X size={18} /></button>
      </header>
      {error ? <div className="status-message danger-message" role="alert">{error}</div> : null}

      <section className="character-editor__section">
        <h3>Личность</h3>
        <div className="character-editor__grid">
          {fields.map(([key, label, type = "text"]) => <label key={key}><span>{label}</span><input type={type} value={form[key]} onChange={(event) => setField(key, event.target.value)} /></label>)}
        </div>
      </section>

      <section className="character-editor__section">
        <h3>Боевые показатели и характеристики</h3>
        <div className="character-editor__grid character-editor__grid--stats">
          {statsFields.map(([key, label]) => <label key={key}><span>{label}</span><input type="number" value={form[key]} onChange={(event) => setField(key, event.target.value)} /></label>)}
        </div>
      </section>

      <section className="character-editor__section character-editor__grid character-editor__grid--textareas">
        <label><span>Атаки: название | бонус | урон | traits</span><textarea value={form.attacks} onChange={(event) => setField("attacks", event.target.value)} placeholder="Бастард-меч | +15 | 2d8+6 | рубящее, versatile" /></label>
        <label><span>Навыки: название | ранг | модификатор</span><textarea value={form.skills} onChange={(event) => setField("skills", event.target.value)} placeholder="Запугивание | Мастер | +16" /></label>
        <label><span>Способности и фиты: по одному в строке</span><textarea value={form.feats} onChange={(event) => setField("feats", event.target.value)} /></label>
        <label><span>Заклинания: название | уровень | формула | описание</span><textarea value={form.spells} onChange={(event) => setField("spells", event.target.value)} placeholder="Телекинетический снаряд | 3 | 4d6+4 | психический импульс" /></label>
        <label><span>Снаряжение: название | количество | уровень</span><textarea value={form.inventory} onChange={(event) => setField("inventory", event.target.value)} /></label>
        <label><span>Публичное описание</span><textarea value={form.publicSummary} onChange={(event) => setField("publicSummary", event.target.value)} /></label>
        <label><span>Личные заметки</span><textarea value={form.privateNotes} onChange={(event) => setField("privateNotes", event.target.value)} /></label>
        <label><span>Заметки по билду</span><textarea value={form.buildNotes} onChange={(event) => setField("buildNotes", event.target.value)} /></label>
        <label><span>Заметки GM</span><textarea value={form.gmNotes} onChange={(event) => setField("gmNotes", event.target.value)} /></label>
      </section>

      <div className="character-editor__visibility">
        <label><input type="checkbox" checked={form.visibleToParty} onChange={(event) => setField("visibleToParty", event.target.checked)} /> Видим всей партии</label>
        <label><input type="checkbox" checked={form.sharedWithGm} onChange={(event) => setField("sharedWithGm", event.target.checked)} /> Доступен мастерам</label>
      </div>

      <footer className="character-editor__actions">
        <CodexButton type="button" variant="secondary" onClick={onCancel}>Отмена</CodexButton>
        <CodexButton type="submit" disabled={busy}><Save size={16} /><span>{busy ? "Сохраняю..." : "Сохранить героя"}</span></CodexButton>
      </footer>
    </form>
  );
}

export default function CharactersPage({ session = null, canManage = false }) {
  const manager = canManage || canManageCharacters(session);
  const [state, setState] = useState({ loading: true, error: "", characters: [] });
  const [selectedId, setSelectedId] = useState("");
  const [editorMode, setEditorMode] = useState("");
  const [roll, setRoll] = useState(null);

  async function loadCharacters(preferredId = "") {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api.characters(manager ? "campaign" : "mine");
      const characters = Array.isArray(data.characters) ? data.characters : [];
      setState({ loading: false, error: "", characters });
      if (preferredId && characters.some((character) => character.id === preferredId)) setSelectedId(preferredId);
    } catch (error) {
      setState({ loading: false, error: error.message || "Не удалось загрузить персонажей.", characters: [] });
    }
  }

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: "", characters: [] });
    api.characters(manager ? "campaign" : "mine")
      .then((data) => {
        if (!active) return;
        setState({ loading: false, error: "", characters: Array.isArray(data.characters) ? data.characters : [] });
      })
      .catch((error) => {
        if (!active) return;
        setState({ loading: false, error: error.message || "Не удалось загрузить персонажей.", characters: [] });
      });
    return () => { active = false; };
  }, [manager]);

  useEffect(() => {
    if (!selectedId && state.characters[0]?.id) setSelectedId(state.characters[0].id);
    if (selectedId && !state.characters.some((character) => character.id === selectedId)) setSelectedId(state.characters[0]?.id || "");
  }, [selectedId, state.characters]);

  const selected = useMemo(() => state.characters.find((character) => character.id === selectedId) || state.characters[0] || null, [selectedId, state.characters]);
  const identity = selected?.identity || {};
  const visuals = selected?.visuals || {};
  const stats = selected?.stats || {};
  const saves = stats.saves || {};
  const text = selected?.text || {};
  const abilities = stats.abilities || {};
  const combat = selected?.combat || {};
  const magic = selected?.magic || {};
  const progression = selected?.progression || {};
  const inventory = selected?.inventory || {};
  const hp = firstNumber(stats.currentHp, stats.hp);
  const maxHp = firstNumber(stats.maxHp);
  const portrait = portraitSource(visuals);
  const feats = [...listOf(progression.feats), ...listOf(progression.classFeatures), ...listOf(progression.ancestryFeatures)];
  const inventoryItems = [...listOf(inventory.weapons), ...listOf(inventory.armor), ...listOf(inventory.worn), ...listOf(inventory.consumables), ...listOf(inventory.treasure)];

  async function handleSaved(character) {
    setEditorMode("");
    await loadCharacters(character?.id || "");
  }

  return (
    <div className="page-stack characters-page character-dossier-page">
      <header className="list-header characters-header article-page-header">
        <div>
          <span className="kicker">{manager ? "Campaign Character Lab" : "Player Workspace"}</span>
          <h1>{manager ? "Персонажи кампании" : "Мой персонаж"}</h1>
          <p>{manager ? "Мастер может создавать тестовых героев, редактировать доступные листы и сразу проверять броски прямо в досье." : "Player-safe досье героя: личность, боевые показатели, способности, снаряжение и заметки, которые backend разрешил показать текущему пользователю."}</p>
        </div>
        {manager ? (
          <div className="editor-actions character-header-actions">
            <CodexButton type="button" variant="secondary" onClick={() => setEditorMode("create")}><Plus size={16} /><span>Создать героя</span></CodexButton>
            <CodexButton type="button" onClick={() => selected && setEditorMode("edit")} disabled={!selected}><Pencil size={16} /><span>Редактировать</span></CodexButton>
          </div>
        ) : null}
      </header>

      {editorMode ? <CharacterEditor character={editorMode === "edit" ? selected : null} onCancel={() => setEditorMode("")} onSaved={handleSaved} /> : null}
      {state.loading ? <div className="status-message success-message"><span>Загружаю персонажей кампании...</span></div> : null}
      {state.error ? <div className="status-message danger-message" role="alert"><span>{state.error}</span></div> : null}

      <section className="characters-layout character-dossier-layout">
        <aside className="character-list-panel character-roster-panel">
          <div className="notes-list-head"><div><span className="kicker">{manager ? "Доступные герои" : "Мои герои"}</span><h2>{state.characters.length}</h2></div></div>
          <div className="character-list">
            {state.characters.map((character) => <CharacterCard key={character.id} character={character} selected={selected?.id === character.id} onSelect={() => setSelectedId(character.id)} />)}
            {!state.loading && !state.error && !state.characters.length ? <p className="empty-copy">{manager ? "В кампании пока нет персонажей. Создай тестового героя кнопкой выше." : "В этой кампании пока нет назначенного вам персонажа."}</p> : null}
          </div>
        </aside>

        <section className="character-sheet-panel character-dossier-sheet">
          {selected ? (
            <>
              <header className="character-dossier-hero" style={visuals.colorTheme ? { "--character-accent": visuals.colorTheme === "obsidian-gold" ? "#e3b65f" : undefined } : undefined}>
                <div className="character-dossier-portrait">{portrait ? <img src={portrait} alt={`Портрет персонажа ${characterName(selected)}`} /> : <span>{initials(characterName(selected))}</span>}</div>
                <div className="character-dossier-title">
                  <span className="kicker">Character dossier</span><h2>{characterName(selected)}</h2><p>{characterSubtitle(selected) || "Основные данные персонажа не заполнены."}</p>
                  <div className="character-identity-chips">{identity.background ? <span>{identity.background}</span> : null}{identity.alignment ? <span>{identity.alignment}</span> : null}{identity.deity ? <span>{identity.deity}</span> : null}{listOf(identity.languages).map((language) => <span key={language}>{language}</span>)}</div>
                </div>
                <div className="character-dossier-vitals">
                  <Metric label="AC" value={stats.armorClass} prominent />
                  <Metric label="HP" value={hp === null ? "—" : `${hp}${maxHp === null ? "" : ` / ${maxHp}`}`} prominent />
                  <Metric label="Скорость" value={stats.speed !== undefined ? `${stats.speed} фт.` : "—"} />
                  <Metric label="Восприятие" value={displayModifier(stats.perception)} onRoll={() => setRoll(rollCheck("Восприятие", stats.perception))} rollHint="d20" />
                </div>
              </header>

              <section className="character-core-grid">
                <article className="character-core-card"><span className="kicker">Спасброски</span><div className="character-save-row">
                  <Metric label="Стойкость" value={displayModifier(saves.fortitude)} onRoll={() => setRoll(rollCheck("Стойкость", saves.fortitude))} rollHint="d20" />
                  <Metric label="Реакция" value={displayModifier(saves.reflex)} onRoll={() => setRoll(rollCheck("Реакция", saves.reflex))} rollHint="d20" />
                  <Metric label="Воля" value={displayModifier(saves.will)} onRoll={() => setRoll(rollCheck("Воля", saves.will))} rollHint="d20" />
                </div></article>
                <article className="character-core-card"><span className="kicker">Характеристики</span><div className="character-ability-row">
                  {[["str", "СИЛ"], ["dex", "ЛОВ"], ["con", "ТЕЛ"], ["int", "ИНТ"], ["wis", "МДР"], ["cha", "ХАР"]].map(([key, label]) => <Metric key={key} label={label} value={displayModifier(abilities[key])} onRoll={() => setRoll(rollCheck(label, abilities[key]))} rollHint="d20" />)}
                </div></article>
              </section>

              <CollectionSection title="Атаки и боевые действия" icon={Swords} items={combat.attacks} emptyText="Атаки пока не импортированы." rollKind="attack" onRoll={setRoll} />
              <CollectionSection title="Навыки" icon={BrainCircuit} items={stats.skills} emptyText="Навыки пока не импортированы." rollKind="skill" onRoll={setRoll} />
              <CollectionSection title="Способности и фиты" icon={BookOpenText} items={feats} emptyText="Фиты и классовые способности пока не импортированы." />
              <CollectionSection title="Заклинания и силы" icon={Sparkles} items={magic.spells} emptyText="Заклинания или силы пока не добавлены." rollKind="formula" onRoll={setRoll} />
              <CollectionSection title="Снаряжение" icon={Backpack} items={inventoryItems} emptyText="Предметы пока не импортированы." />
              {inventory.text ? <TextBlock label="Инвентарь · заметка" value={inventory.text} /> : null}

              <section className="character-readonly-blocks character-notes-grid">
                <TextBlock label="Публичное описание" value={text.publicSummary} />
                <TextBlock label="Личные заметки" value={text.privateNotes} privateBlock />
                <TextBlock label="Заметки по билду" value={text.buildNotes} privateBlock />
                <TextBlock label="Заметки GM" value={text.gmNotes} privateBlock />
              </section>

              <div className="status-message success-message character-safety-note"><ShieldCheck size={16} /><span>Лист показывает только поля, возвращённые backend для текущей membership. Броски выполняются локально и не раскрывают закрытые поля другим участникам.</span></div>
            </>
          ) : (
            <div className="notes-empty-editor character-empty-state"><UserRound size={38} /><h2>Персонаж ещё не добавлен</h2><p>{manager ? "Создай тестового героя и проверь его лист прямо в режиме мастера." : "После назначения персонажа вашему аккаунту его безопасное досье появится здесь."}</p>{manager ? <CodexButton type="button" onClick={() => setEditorMode("create")}><Plus size={16} /><span>Создать героя</span></CodexButton> : null}</div>
          )}
        </section>
      </section>
      <RollToast roll={roll} onDismiss={() => setRoll(null)} />
    </div>
  );
}
