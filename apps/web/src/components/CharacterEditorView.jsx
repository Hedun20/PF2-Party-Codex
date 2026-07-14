import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import CodexButton from "./ui/CodexButton.jsx";
import {
  ABILITY_OPTIONS,
  PROFICIENCY_RANKS,
  calculateSkillModifier,
  numeric,
  withCalculatedModifier
} from "../utils/characterMath.js";

const TABS = [
  ["identity", "Основное"],
  ["stats", "Характеристики"],
  ["skills", "Навыки"],
  ["combat", "Бой"],
  ["feats", "Способности"],
  ["magic", "Магия"],
  ["inventory", "Снаряжение"],
  ["notes", "Заметки"]
];

const FALLBACK_SKILLS = [
  ["acrobatics", "Акробатика", "dex"], ["arcana", "Аркана", "int"], ["athletics", "Атлетика", "str"],
  ["crafting", "Ремесло", "int"], ["deception", "Обман", "cha"], ["diplomacy", "Дипломатия", "cha"],
  ["intimidation", "Запугивание", "cha"], ["medicine", "Медицина", "wis"], ["nature", "Природа", "wis"],
  ["occultism", "Оккультизм", "int"], ["performance", "Выступление", "cha"], ["religion", "Религия", "wis"],
  ["society", "Общество", "int"], ["stealth", "Скрытность", "dex"], ["survival", "Выживание", "wis"],
  ["thievery", "Воровство", "dex"]
].map(([id, name, ability]) => ({ id, name, ability }));

const RANK_ALIASES = {
  "необучен": "untrained", untrained: "untrained",
  "обучен": "trained", trained: "trained",
  "эксперт": "expert", expert: "expert",
  "мастер": "master", master: "master",
  "легенда": "legendary", legendary: "legendary"
};

function id() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function itemName(item) {
  return typeof item === "string" ? item : item?.name || item?.label || "";
}

function normalizedRank(value = "") {
  return RANK_ALIASES[String(value).trim().toLowerCase()] || "trained";
}

function abilityForSkill(value = "", options = FALLBACK_SKILLS) {
  const needle = String(value).trim().toLowerCase();
  return options.find((item) => item.id === needle || item.name.toLowerCase() === needle)?.ability || "int";
}

function normalizeSkill(skill, options) {
  const name = itemName(skill) || "Новый навык";
  const option = options.find((item) => item.id === skill?.id || item.name.toLowerCase() === name.toLowerCase());
  return {
    rowId: skill?.rowId || id(),
    id: skill?.id || option?.id || name.toLowerCase().replace(/\s+/g, "-"),
    name,
    ability: skill?.ability || option?.ability || abilityForSkill(name, options),
    rank: normalizedRank(skill?.rank),
    calculationMode: skill?.calculationMode || "manual",
    itemBonus: numeric(skill?.itemBonus),
    otherBonus: numeric(skill?.otherBonus),
    manualModifier: numeric(skill?.manualModifier ?? skill?.modifier),
    modifier: numeric(skill?.modifier)
  };
}

function normalizeAttack(item) {
  return {
    rowId: item?.rowId || id(),
    name: itemName(item),
    category: item?.category || item?.type || "weapon",
    bonus: numeric(item?.bonus),
    damage: item?.damage || "",
    damageType: item?.damageType || "slashing",
    traits: list(item?.traits).join(", "),
    description: item?.description || ""
  };
}

function normalizeFeat(item) {
  return {
    rowId: item?.rowId || id(),
    catalogId: item?.catalogId || item?.id || "custom",
    name: itemName(item),
    type: item?.type || "class",
    level: item?.level ?? "",
    actions: item?.actions || item?.actionCost || "",
    formula: item?.formula || item?.roll || "",
    description: item?.description || ""
  };
}

function normalizeSpell(item) {
  return {
    rowId: item?.rowId || id(),
    name: itemName(item),
    level: item?.level ?? "",
    tradition: item?.tradition || "occult",
    rollType: item?.rollType || "effect",
    modifier: numeric(item?.modifier),
    formula: item?.formula || item?.roll || item?.damage || "",
    description: item?.description || ""
  };
}

function normalizeInventoryItem(item, type = "gear") {
  return {
    rowId: item?.rowId || id(),
    name: itemName(item),
    type: item?.type || type,
    quantity: numeric(item?.quantity, 1),
    level: item?.level ?? "",
    state: item?.state || item?.equipped || "carried",
    source: item?.source || "custom",
    description: item?.description || ""
  };
}

function formFromCharacter(character = null, skillOptions = FALLBACK_SKILLS) {
  const identity = character?.identity || {};
  const stats = character?.stats || {};
  const saves = stats.saves || {};
  const abilities = stats.abilities || {};
  const progression = character?.progression || {};
  const inventory = character?.inventory || {};
  const text = character?.text || {};
  return {
    identity: {
      name: identity.name || "",
      ancestry: identity.ancestry || "",
      heritage: identity.heritage || "",
      background: identity.background || "",
      className: identity.className || "",
      level: numeric(identity.level, 1),
      alignment: identity.alignment || "",
      deity: identity.deity || "",
      languages: list(identity.languages).join(", ")
    },
    visuals: { portraitUrl: character?.visuals?.portraitUrl || character?.visuals?.portrait || character?.visuals?.icon || "" },
    stats: {
      currentHp: numeric(stats.currentHp ?? stats.hp, 10), maxHp: numeric(stats.maxHp, 10), armorClass: numeric(stats.armorClass, 10),
      speed: numeric(stats.speed, 25), perception: numeric(stats.perception),
      fortitude: numeric(saves.fortitude), reflex: numeric(saves.reflex), will: numeric(saves.will),
      str: numeric(abilities.str), dex: numeric(abilities.dex), con: numeric(abilities.con), int: numeric(abilities.int), wis: numeric(abilities.wis), cha: numeric(abilities.cha)
    },
    calculationMode: stats.calculationMode || "auto",
    skills: list(stats.skills).map((item) => normalizeSkill(item, skillOptions)),
    attacks: list(character?.combat?.attacks).map(normalizeAttack),
    feats: [...list(progression.feats), ...list(progression.classFeatures), ...list(progression.ancestryFeatures)].map(normalizeFeat),
    spells: list(character?.magic?.spells).map(normalizeSpell),
    inventory: [
      ...list(inventory.weapons).map((item) => normalizeInventoryItem(item, "weapon")),
      ...list(inventory.armor).map((item) => normalizeInventoryItem(item, "armor")),
      ...list(inventory.worn).map((item) => normalizeInventoryItem(item, item?.type || "gear")),
      ...list(inventory.consumables).map((item) => normalizeInventoryItem(item, "consumable")),
      ...list(inventory.treasure).map((item) => normalizeInventoryItem(item, "treasure"))
    ],
    text: {
      publicSummary: text.publicSummary || "", privateNotes: text.privateNotes || "", buildNotes: text.buildNotes || "", gmNotes: text.gmNotes || ""
    },
    visibility: {
      visibleToParty: Boolean(character?.visibility?.visibleToParty),
      sharedWithGm: character?.visibility?.sharedWithGm !== false
    }
  };
}

function Field({ label, children, className = "" }) {
  return <label className={`character-builder-field ${className}`.trim()}><span>{label}</span>{children}</label>;
}

function RowHeader({ title, subtitle, onRemove }) {
  return (
    <header className="character-builder-row__header">
      <div><strong>{title || "Новая запись"}</strong>{subtitle ? <span>{subtitle}</span> : null}</div>
      <button type="button" onClick={onRemove} aria-label="Удалить запись"><Trash2 size={16} /></button>
    </header>
  );
}

function AddButton({ children, onClick }) {
  return <button type="button" className="character-builder-add" onClick={onClick}><Plus size={16} /> {children}</button>;
}

export default function CharacterEditorView({ character = null, onCancel, onSaved }) {
  const editing = Boolean(character?.id);
  const [tab, setTab] = useState("identity");
  const [options, setOptions] = useState({ ancestries: [], backgrounds: [], classes: [], feats: [], skills: FALLBACK_SKILLS });
  const [form, setForm] = useState(() => formFromCharacter(character));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.pf2Options("auto").then((data) => {
      if (!active) return;
      const skills = list(data.skills).length
        ? data.skills.map((item) => ({ ...item, ability: abilityForSkill(item.id || item.name, FALLBACK_SKILLS) }))
        : FALLBACK_SKILLS;
      setOptions({
        ancestries: list(data.ancestries), backgrounds: list(data.backgrounds), classes: list(data.classes), feats: list(data.feats), skills
      });
      setForm((current) => ({ ...current, skills: current.skills.map((item) => normalizeSkill(item, skills)) }));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => setForm(formFromCharacter(character, options.skills)), [character?.id]);

  const context = useMemo(() => ({
    level: form.identity.level,
    abilities: { str: form.stats.str, dex: form.stats.dex, con: form.stats.con, int: form.stats.int, wis: form.stats.wis, cha: form.stats.cha }
  }), [form.identity.level, form.stats]);

  function setIdentity(key, value) { setForm((current) => ({ ...current, identity: { ...current.identity, [key]: value } })); }
  function setStat(key, value) { setForm((current) => ({ ...current, stats: { ...current.stats, [key]: value } })); }
  function setText(key, value) { setForm((current) => ({ ...current, text: { ...current.text, [key]: value } })); }
  function updateList(key, rowId, patch) { setForm((current) => ({ ...current, [key]: current[key].map((row) => row.rowId === rowId ? { ...row, ...patch } : row) })); }
  function removeList(key, rowId) { setForm((current) => ({ ...current, [key]: current[key].filter((row) => row.rowId !== rowId) })); }
  function addList(key, row) { setForm((current) => ({ ...current, [key]: [...current[key], row] })); }

  function inventoryPayload() {
    const groups = { weapons: [], armor: [], worn: [], consumables: [], treasure: [] };
    for (const item of form.inventory) {
      const normalized = { ...item, rowId: undefined, quantity: numeric(item.quantity, 1), traits: list(item.traits) };
      if (item.type === "weapon") groups.weapons.push(normalized);
      else if (item.type === "armor") groups.armor.push(normalized);
      else if (item.type === "consumable") groups.consumables.push(normalized);
      else if (item.type === "treasure") groups.treasure.push(normalized);
      else groups.worn.push(normalized);
    }
    return groups;
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const skills = form.skills.map((skill) => withCalculatedModifier(skill, context)).map(({ rowId, ...skill }) => skill);
    const payload = {
      identity: { ...form.identity, level: numeric(form.identity.level, 1), languages: form.identity.languages.split(",").map((item) => item.trim()).filter(Boolean) },
      visuals: form.visuals,
      stats: {
        currentHp: numeric(form.stats.currentHp), maxHp: numeric(form.stats.maxHp), armorClass: numeric(form.stats.armorClass, 10),
        speed: numeric(form.stats.speed, 25), perception: numeric(form.stats.perception), calculationMode: form.calculationMode,
        saves: { fortitude: numeric(form.stats.fortitude), reflex: numeric(form.stats.reflex), will: numeric(form.stats.will) },
        abilities: { str: numeric(form.stats.str), dex: numeric(form.stats.dex), con: numeric(form.stats.con), int: numeric(form.stats.int), wis: numeric(form.stats.wis), cha: numeric(form.stats.cha) },
        skills
      },
      combat: { attacks: form.attacks.map(({ rowId, traits, ...item }) => ({ ...item, bonus: numeric(item.bonus), traits: String(traits || "").split(",").map((value) => value.trim()).filter(Boolean) })) },
      progression: { feats: form.feats.map(({ rowId, ...item }) => item) },
      magic: { spells: form.spells.map(({ rowId, ...item }) => ({ ...item, modifier: numeric(item.modifier) })) },
      inventory: inventoryPayload(),
      text: form.text,
      visibility: form.visibility
    };

    try {
      let response;
      if (editing) response = await api.updateCharacter(character.id, payload);
      else {
        const created = await api.createCharacter({ name: payload.identity.name || "Новый герой", level: payload.identity.level, isSharedWithGm: true });
        response = await api.updateCharacter(created.character.id, payload);
      }
      await onSaved?.(response.character);
    } catch (saveError) {
      setError(saveError.message || "Не удалось сохранить персонажа.");
    } finally {
      setBusy(false);
    }
  }

  function renderIdentity() {
    return <section className="character-builder-section"><h2>Основная информация</h2><div className="character-builder-grid">
      <Field label="Имя персонажа"><input value={form.identity.name} onChange={(e) => setIdentity("name", e.target.value)} /></Field>
      <Field label="Народ"><select value={form.identity.ancestry} onChange={(e) => setIdentity("ancestry", e.target.value)}><option value="">Выберите народ</option>{form.identity.ancestry && !options.ancestries.some((item) => item.name === form.identity.ancestry) ? <option value={form.identity.ancestry}>{form.identity.ancestry}</option> : null}{options.ancestries.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></Field>
      <Field label="Наследие"><input value={form.identity.heritage} onChange={(e) => setIdentity("heritage", e.target.value)} /></Field>
      <Field label="Класс"><select value={form.identity.className} onChange={(e) => setIdentity("className", e.target.value)}><option value="">Выберите класс</option>{form.identity.className && !options.classes.some((item) => item.name === form.identity.className) ? <option value={form.identity.className}>{form.identity.className}</option> : null}{options.classes.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></Field>
      <Field label="Уровень"><input type="number" min="1" max="20" value={form.identity.level} onChange={(e) => setIdentity("level", e.target.value)} /></Field>
      <Field label="Предыстория"><select value={form.identity.background} onChange={(e) => setIdentity("background", e.target.value)}><option value="">Выберите предысторию</option>{form.identity.background && !options.backgrounds.some((item) => item.name === form.identity.background) ? <option value={form.identity.background}>{form.identity.background}</option> : null}{options.backgrounds.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></Field>
      <Field label="Мировоззрение"><input value={form.identity.alignment} onChange={(e) => setIdentity("alignment", e.target.value)} /></Field>
      <Field label="Божество"><input value={form.identity.deity} onChange={(e) => setIdentity("deity", e.target.value)} /></Field>
      <Field label="Языки через запятую"><input value={form.identity.languages} onChange={(e) => setIdentity("languages", e.target.value)} /></Field>
      <Field label="URL портрета"><input value={form.visuals.portraitUrl} onChange={(e) => setForm((current) => ({ ...current, visuals: { ...current.visuals, portraitUrl: e.target.value } }))} /></Field>
    </div></section>;
  }

  function renderStats() {
    const fields = [["currentHp", "HP сейчас"], ["maxHp", "HP максимум"], ["armorClass", "AC"], ["speed", "Скорость"], ["perception", "Восприятие"], ["fortitude", "Стойкость"], ["reflex", "Реакция"], ["will", "Воля"], ["str", "СИЛ"], ["dex", "ЛОВ"], ["con", "ТЕЛ"], ["int", "ИНТ"], ["wis", "МДР"], ["cha", "ХАР"]];
    return <section className="character-builder-section"><h2>Характеристики и защита</h2><p className="character-builder-help">Характеристики вводятся как текущие модификаторы: например, +4 или 0.</p><div className="character-builder-grid character-builder-grid--stats">{fields.map(([key, label]) => <Field key={key} label={label}><input type="number" value={form.stats[key]} onChange={(e) => setStat(key, e.target.value)} /></Field>)}</div></section>;
  }

  function renderSkills() {
    return <section className="character-builder-section"><header className="character-builder-section__head"><div><h2>Навыки</h2><p>Каждый навык хранится отдельной записью. Можно считать PF2e автоматически или задать итог вручную.</p></div><label className="character-builder-mode"><span>Режим новых навыков</span><select value={form.calculationMode} onChange={(e) => setForm((current) => ({ ...current, calculationMode: e.target.value }))}><option value="auto">PF2e автоматически</option><option value="manual">Ручное значение</option></select></label></header>
      <div className="character-builder-rows">{form.skills.map((skill) => {
        const result = calculateSkillModifier(skill, context);
        return <article key={skill.rowId} className="character-builder-row"><RowHeader title={skill.name} subtitle={`Итог: ${result >= 0 ? "+" : ""}${result}`} onRemove={() => removeList("skills", skill.rowId)} /><div className="character-builder-row-grid">
          <Field label="Навык"><select value={skill.id} onChange={(e) => { const option = options.skills.find((item) => item.id === e.target.value); updateList("skills", skill.rowId, { id: e.target.value, name: option?.name || e.target.value, ability: option?.ability || skill.ability }); }}><option value="">Выберите навык</option>{options.skills.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Характеристика"><select value={skill.ability} onChange={(e) => updateList("skills", skill.rowId, { ability: e.target.value })}>{ABILITY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
          <Field label="Владение"><select value={skill.rank} onChange={(e) => updateList("skills", skill.rowId, { rank: e.target.value })}>{PROFICIENCY_RANKS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
          <Field label="Расчёт"><select value={skill.calculationMode} onChange={(e) => updateList("skills", skill.rowId, { calculationMode: e.target.value })}><option value="auto">PF2e</option><option value="manual">Вручную</option></select></Field>
          {skill.calculationMode === "auto" ? <><Field label="Бонус предмета"><input type="number" value={skill.itemBonus} onChange={(e) => updateList("skills", skill.rowId, { itemBonus: e.target.value })} /></Field><Field label="Прочий бонус"><input type="number" value={skill.otherBonus} onChange={(e) => updateList("skills", skill.rowId, { otherBonus: e.target.value })} /></Field></> : <Field label="Итоговый модификатор"><input type="number" value={skill.manualModifier} onChange={(e) => updateList("skills", skill.rowId, { manualModifier: e.target.value })} /></Field>}
        </div></article>;
      })}</div><AddButton onClick={() => addList("skills", normalizeSkill({ calculationMode: form.calculationMode }, options.skills))}>Добавить навык</AddButton>
    </section>;
  }

  function renderCombat() {
    return <section className="character-builder-section"><h2>Атаки и боевые действия</h2><div className="character-builder-rows">{form.attacks.map((attack) => <article key={attack.rowId} className="character-builder-row"><RowHeader title={attack.name || "Новая атака"} subtitle={attack.damage} onRemove={() => removeList("attacks", attack.rowId)} /><div className="character-builder-row-grid">
      <Field label="Название"><input value={attack.name} onChange={(e) => updateList("attacks", attack.rowId, { name: e.target.value })} /></Field><Field label="Тип"><select value={attack.category} onChange={(e) => updateList("attacks", attack.rowId, { category: e.target.value })}><option value="weapon">Оружие</option><option value="unarmed">Безоружная</option><option value="spell">Заклинание</option><option value="custom">Другая</option></select></Field><Field label="Бонус атаки"><input type="number" value={attack.bonus} onChange={(e) => updateList("attacks", attack.rowId, { bonus: e.target.value })} /></Field><Field label="Формула урона"><input value={attack.damage} placeholder="2d8+6" onChange={(e) => updateList("attacks", attack.rowId, { damage: e.target.value })} /></Field><Field label="Тип урона"><select value={attack.damageType} onChange={(e) => updateList("attacks", attack.rowId, { damageType: e.target.value })}><option value="slashing">Рубящий</option><option value="piercing">Колющий</option><option value="bludgeoning">Дробящий</option><option value="energy">Энергия</option><option value="other">Другой</option></select></Field><Field label="Черты через запятую"><input value={attack.traits} onChange={(e) => updateList("attacks", attack.rowId, { traits: e.target.value })} /></Field>
    </div></article>)}</div><AddButton onClick={() => addList("attacks", normalizeAttack({}))}>Добавить атаку</AddButton></section>;
  }

  function renderFeats() {
    return <section className="character-builder-section"><h2>Способности и фиты</h2><div className="character-builder-rows">{form.feats.map((feat) => <article key={feat.rowId} className="character-builder-row"><RowHeader title={feat.name || "Новая способность"} subtitle={[feat.type, feat.level ? `ур. ${feat.level}` : ""].filter(Boolean).join(" · ")} onRemove={() => removeList("feats", feat.rowId)} /><div className="character-builder-row-grid">
      <Field label="Каталог PF2e"><select value={feat.catalogId} onChange={(e) => { const item = options.feats.find((option) => option.id === e.target.value); updateList("feats", feat.rowId, item ? { catalogId: item.id, name: item.name, type: item.type || feat.type, level: item.level ?? feat.level } : { catalogId: "custom" }); }}><option value="custom">Пользовательская способность</option>{options.feats.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Название"><input value={feat.name} onChange={(e) => updateList("feats", feat.rowId, { name: e.target.value, catalogId: "custom" })} /></Field><Field label="Тип"><select value={feat.type} onChange={(e) => updateList("feats", feat.rowId, { type: e.target.value })}><option value="class">Классовый</option><option value="skill">Навыка</option><option value="general">Общий</option><option value="ancestry">Наследия</option><option value="archetype">Архетип</option><option value="power">Сила</option></select></Field><Field label="Уровень"><input type="number" value={feat.level} onChange={(e) => updateList("feats", feat.rowId, { level: e.target.value })} /></Field><Field label="Действия"><select value={feat.actions} onChange={(e) => updateList("feats", feat.rowId, { actions: e.target.value })}><option value="">Пассивная</option><option value="1">1 действие</option><option value="2">2 действия</option><option value="3">3 действия</option><option value="reaction">Реакция</option><option value="free">Свободное</option></select></Field><Field label="Формула броска"><input value={feat.formula} onChange={(e) => updateList("feats", feat.rowId, { formula: e.target.value })} /></Field><Field label="Описание" className="character-builder-field--wide"><textarea value={feat.description} onChange={(e) => updateList("feats", feat.rowId, { description: e.target.value })} /></Field>
    </div></article>)}</div><AddButton onClick={() => addList("feats", normalizeFeat({}))}>Добавить способность</AddButton></section>;
  }

  function renderMagic() {
    return <section className="character-builder-section"><h2>Заклинания и силы</h2><div className="character-builder-rows">{form.spells.map((spell) => <article key={spell.rowId} className="character-builder-row"><RowHeader title={spell.name || "Новое заклинание"} subtitle={spell.level ? `Ранг ${spell.level}` : spell.tradition} onRemove={() => removeList("spells", spell.rowId)} /><div className="character-builder-row-grid">
      <Field label="Название"><input value={spell.name} onChange={(e) => updateList("spells", spell.rowId, { name: e.target.value })} /></Field><Field label="Ранг"><input type="number" min="0" max="10" value={spell.level} onChange={(e) => updateList("spells", spell.rowId, { level: e.target.value })} /></Field><Field label="Традиция"><select value={spell.tradition} onChange={(e) => updateList("spells", spell.rowId, { tradition: e.target.value })}><option value="arcane">Арканная</option><option value="divine">Сакральная</option><option value="occult">Оккультная</option><option value="primal">Природная</option><option value="focus">Фокусная</option><option value="custom">Другая</option></select></Field><Field label="Тип броска"><select value={spell.rollType} onChange={(e) => updateList("spells", spell.rowId, { rollType: e.target.value })}><option value="effect">Эффект</option><option value="attack">Атака заклинанием</option><option value="damage">Урон</option><option value="save">Спасбросок цели</option></select></Field><Field label="Модификатор"><input type="number" value={spell.modifier} onChange={(e) => updateList("spells", spell.rowId, { modifier: e.target.value })} /></Field><Field label="Формула"><input value={spell.formula} placeholder="4d6+4" onChange={(e) => updateList("spells", spell.rowId, { formula: e.target.value })} /></Field><Field label="Описание" className="character-builder-field--wide"><textarea value={spell.description} onChange={(e) => updateList("spells", spell.rowId, { description: e.target.value })} /></Field>
    </div></article>)}</div><AddButton onClick={() => addList("spells", normalizeSpell({}))}>Добавить заклинание или силу</AddButton></section>;
  }

  function renderInventory() {
    return <section className="character-builder-section"><h2>Снаряжение</h2><div className="character-builder-rows">{form.inventory.map((item) => <article key={item.rowId} className="character-builder-row"><RowHeader title={item.name || "Новый предмет"} subtitle={`${item.type} · ×${item.quantity || 1}`} onRemove={() => removeList("inventory", item.rowId)} /><div className="character-builder-row-grid">
      <Field label="Источник"><select value={item.source} onChange={(e) => updateList("inventory", item.rowId, { source: e.target.value })}><option value="catalog">Каталог PF2e</option><option value="custom">Пользовательский предмет</option></select></Field><Field label="Тип"><select value={item.type} onChange={(e) => updateList("inventory", item.rowId, { type: e.target.value })}><option value="weapon">Оружие</option><option value="armor">Броня</option><option value="gear">Снаряжение</option><option value="implement">Имплемент</option><option value="consumable">Расходник</option><option value="treasure">Сокровище</option></select></Field><Field label="Название"><input value={item.name} onChange={(e) => updateList("inventory", item.rowId, { name: e.target.value })} /></Field><Field label="Количество"><input type="number" min="1" value={item.quantity} onChange={(e) => updateList("inventory", item.rowId, { quantity: e.target.value })} /></Field><Field label="Уровень"><input type="number" min="0" value={item.level} onChange={(e) => updateList("inventory", item.rowId, { level: e.target.value })} /></Field><Field label="Состояние"><select value={item.state} onChange={(e) => updateList("inventory", item.rowId, { state: e.target.value })}><option value="held">В руках</option><option value="worn">Надето</option><option value="carried">В рюкзаке</option><option value="stowed">Убрано</option></select></Field><Field label="Примечание" className="character-builder-field--wide"><textarea value={item.description} onChange={(e) => updateList("inventory", item.rowId, { description: e.target.value })} /></Field>
    </div></article>)}</div><AddButton onClick={() => addList("inventory", normalizeInventoryItem({}))}>Добавить предмет</AddButton></section>;
  }

  function renderNotes() {
    const fields = [["publicSummary", "Публичное описание"], ["privateNotes", "Личные заметки"], ["buildNotes", "Заметки по билду"], ["gmNotes", "Заметки GM"]];
    return <section className="character-builder-section"><h2>Описание и заметки</h2><div className="character-builder-notes">{fields.map(([key, label]) => <Field key={key} label={label}><textarea value={form.text[key]} onChange={(e) => setText(key, e.target.value)} /></Field>)}</div><div className="character-builder-visibility"><label><input type="checkbox" checked={form.visibility.visibleToParty} onChange={(e) => setForm((current) => ({ ...current, visibility: { ...current.visibility, visibleToParty: e.target.checked } }))} /> Виден всей партии</label><label><input type="checkbox" checked={form.visibility.sharedWithGm} onChange={(e) => setForm((current) => ({ ...current, visibility: { ...current.visibility, sharedWithGm: e.target.checked } }))} /> Доступен мастерам</label></div></section>;
  }

  const content = { identity: renderIdentity, stats: renderStats, skills: renderSkills, combat: renderCombat, feats: renderFeats, magic: renderMagic, inventory: renderInventory, notes: renderNotes }[tab]?.();

  return (
    <form className="character-builder-page page-stack" onSubmit={submit}>
      <header className="character-builder-hero codex-card">
        <button type="button" className="character-builder-back" onClick={onCancel}><ArrowLeft size={17} /> Назад к персонажу</button>
        <div><span className="kicker">{editing ? "Редактор персонажа" : "Новый герой мастера"}</span><h1>{editing ? form.identity.name || "Безымянный персонаж" : "Создание персонажа"}</h1><p>Навыки, атаки, способности, заклинания и предметы редактируются отдельными структурированными карточками.</p></div>
        <CodexButton type="submit" disabled={busy}><Save size={16} /><span>{busy ? "Сохраняю..." : "Сохранить персонажа"}</span></CodexButton>
      </header>
      {error ? <div className="status-message danger-message" role="alert">{error}</div> : null}
      <nav className="character-builder-tabs" aria-label="Разделы редактора">{TABS.map(([value, label]) => <button key={value} type="button" className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{label}</button>)}</nav>
      <div className="character-builder-workspace codex-card">{content}</div>
      <footer className="character-builder-footer"><CodexButton type="button" variant="secondary" onClick={onCancel}>Отмена</CodexButton><CodexButton type="submit" disabled={busy}><Save size={16} /><span>{busy ? "Сохраняю..." : "Сохранить изменения"}</span></CodexButton></footer>
    </form>
  );
}
