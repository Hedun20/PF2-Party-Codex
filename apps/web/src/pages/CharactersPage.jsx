import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  Backpack,
  BookOpenText,
  BrainCircuit,
  CircleDot,
  Pencil,
  Plus,
  Shield,
  ShieldCheck,
  Sparkles,
  Swords,
  UserRound,
  Zap
} from "lucide-react";
import { api } from "../api/client.js";
import CharacterAssignmentPanel from "../components/CharacterAssignmentPanel.jsx";
import CharacterEditorView from "../components/CharacterEditorView.jsx";
import RollToast from "../components/RollToast.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";
import { extractDiceFormula, rollCheck, rollFormula } from "../utils/diceRoller.js";
import {
  actionLabel,
  characterAbilities,
  defensiveCollections,
  proficiencyLabel,
  skillRanks,
  spellsByRank
} from "../utils/pf2CharacterPresentation.js";

function valueOrDash(value) {
  return value === undefined || value === null || value === "" ? "—" : value;
}

function characterName(character = {}) {
  return character.identity?.name || character.name || "Безымянный персонаж";
}

function characterSubtitle(character = {}) {
  const identity = character.identity || character;
  return [identity.ancestry, identity.heritage, identity.className, identity.level ? `${identity.level} уровень` : ""].filter(Boolean).join(" · ");
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
  const rank = item.rank ?? item.level;
  if (rank !== undefined && rank !== "" && item.tradition) parts.push(Number(rank) === 0 ? "чары" : `ранг ${rank}`);
  else if (item.level !== undefined && item.level !== "") parts.push(`ур. ${item.level}`);
  if (item.type) parts.push(item.type);
  if (item.tradition) parts.push(item.tradition);
  if (item.actions !== undefined || item.actionCost !== undefined || item.actionType !== undefined) parts.push(actionLabel(item));
  if (item.proficiencyRank) parts.push(proficiencyLabel(item.proficiencyRank));
  if (item.rank && !item.tradition) parts.push(proficiencyLabel(item.rank));
  if (item.modifier !== undefined && item.modifier !== "") parts.push(displayModifier(item.modifier));
  if (item.bonus !== undefined && item.bonus !== "") parts.push(`атака ${displayModifier(item.bonus)}`);
  if (item.damage) parts.push(item.damage);
  if (item.value !== undefined && item.value !== "") parts.push(String(item.value));
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

function CharacterCard({ character, selected, onSelect, manager = false }) {
  const visibility = character.visibility || {};
  const portrait = portraitSource(character.visuals || {});
  const assignment = character.assignment?.displayName || "Не назначен";
  return (
    <button type="button" className={selected ? "character-roster-card is-active" : "character-roster-card"} onClick={onSelect}>
      <span className="character-roster-avatar">{portrait ? <img src={portrait} alt="" /> : initials(characterName(character))}</span>
      <span className="character-roster-copy">
        <strong>{characterName(character)}</strong>
        <span>{characterSubtitle(character) || "Данные персонажа не заполнены"}</span>
        <small>{manager ? `Назначение: ${assignment}` : "Назначен вашему аккаунту"} · {visibility.sharedWithGm === false ? "Не открыт GM" : "Открыт GM"}</small>
      </span>
    </button>
  );
}

function TextBlock({ label, value, privateBlock = false }) {
  if (!value) return null;
  return <article className={privateBlock ? "character-text-card character-text-card--private" : "character-text-card"}><span className="kicker">{label}</span><p>{value}</p></article>;
}

function Metric({ label, value, prominent = false, onRoll = null, rollHint = "" }) {
  const className = `${prominent ? "character-metric character-metric--prominent" : "character-metric"}${onRoll ? " character-roll-control" : ""}`;
  const body = <><span>{label}</span><strong>{valueOrDash(value)}</strong>{rollHint ? <small>{rollHint}</small> : null}</>;
  return onRoll ? <button type="button" className={className} onClick={onRoll} title={`Бросить ${label}`}>{body}</button> : <div className={className}>{body}</div>;
}

function CollectionSection({ title, icon: Icon, items, emptyText, rollKind = "", onRoll, className = "", compact = false }) {
  const values = listOf(items);

  function rollItem(item) {
    if (rollKind === "attack") return onRoll?.(rollCheck(`${itemName(item)} · атака`, item?.bonus));
    if (rollKind === "skill") return onRoll?.(rollCheck(itemName(item), item?.modifier));
    const formula = extractDiceFormula(item?.formula || item?.roll || item?.damage || "");
    return formula ? onRoll?.(rollFormula(formula, { label: itemName(item) })) : null;
  }

  const sectionClassName = ["character-dossier-section", compact ? "character-dossier-section--compact" : "", className].filter(Boolean).join(" ");
  return (
    <section className={sectionClassName}>
      <header><Icon size={19} /><h3>{title}</h3><span>{values.length}</span></header>
      {values.length ? (
        <div className="character-item-grid">
          {values.map((item, index) => {
            const damageFormula = rollKind === "attack" ? extractDiceFormula(item?.damage || "") : "";
            const hasRoll = rollKind === "attack" || rollKind === "skill" || extractDiceFormula(item?.formula || item?.roll || item?.damage || "");
            return (
              <article key={`${itemName(item)}-${index}`} className={hasRoll ? "character-item-card character-item-card--rollable" : "character-item-card"}>
                <strong>{itemName(item)}</strong>
                {itemMeta(item) ? <span>{itemMeta(item)}</span> : null}
                {item?.description ? <p>{item.description}</p> : null}
                {hasRoll ? (
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

export default function CharactersPage({ session = null, canManage = false }) {
  const manager = canManage || canManageCharacters(session);
  const activeCampaignId = session?.activeCampaign?.id || session?.activeMembership?.campaignId || "";
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: "", characters: [] });
  const [roll, setRoll] = useState(null);
  const editTarget = searchParams.get("edit") || "";
  const requestedCharacterId = searchParams.get("character") || "";

  async function loadCharacters(preferredId = "") {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api.characters(manager ? "campaign" : "mine");
      const characters = Array.isArray(data.characters) ? data.characters : [];
      setState({ loading: false, error: "", characters });
      return characters.find((item) => item.id === preferredId) || null;
    } catch (error) {
      setState({ loading: false, error: error.message || "Не удалось загрузить персонажей.", characters: [] });
      return null;
    }
  }

  useEffect(() => { loadCharacters(); }, [manager, activeCampaignId]);

  const selected = useMemo(() => state.characters.find((character) => character.id === requestedCharacterId) || state.characters[0] || null, [requestedCharacterId, state.characters]);
  const editorCharacter = editTarget && editTarget !== "new" ? state.characters.find((character) => character.id === editTarget) || null : null;
  const canEditSelected = Boolean(selected?.permissions?.canEdit || manager);

  function openCreate() { setSearchParams({ edit: "new" }); }
  function openEdit() { if (selected && canEditSelected) setSearchParams({ edit: selected.id }); }
  function closeEditor(characterId = selected?.id || "") { setSearchParams(characterId ? { character: characterId } : {}); }

  async function handleSaved(character) {
    await loadCharacters(character?.id || "");
    closeEditor(character?.id || "");
  }

  if (editTarget) {
    if (state.loading) return <div className="status-message success-message">Загружаю данные персонажа...</div>;
    const allowed = editTarget === "new" ? manager : Boolean(editorCharacter?.permissions?.canEdit || manager);
    if (!allowed || (editTarget !== "new" && !editorCharacter)) return <div className="page-stack"><div className="status-message danger-message">Персонаж не найден или недоступен для редактирования.</div><CodexButton type="button" onClick={() => closeEditor()}>Вернуться к героям</CodexButton></div>;
    return <CharacterEditorView character={editTarget === "new" ? null : editorCharacter} onCancel={() => closeEditor(editorCharacter?.id || "")} onSaved={handleSaved} />;
  }

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
  const abilityGroups = characterAbilities(progression);
  const spellGroups = spellsByRank(magic.spells);
  const defenses = defensiveCollections(combat);
  const proficiencyGroups = skillRanks(stats.skills);
  const inventoryItems = [...listOf(inventory.weapons), ...listOf(inventory.armor), ...listOf(inventory.worn), ...listOf(inventory.consumables), ...listOf(inventory.treasure)];
  const showRoster = manager || state.characters.length > 1;

  return (
    <div className="page-stack characters-page character-dossier-page">
      <header className="list-header characters-header article-page-header">
        <div>
          <span className="kicker">{manager ? "Campaign Character Lab" : "Player Workspace"}</span>
          <h1>{manager ? "Персонажи кампании" : "Мой персонаж"}</h1>
          <p>{manager ? "Управляй составом кампании, назначай героев участникам и проверяй каждого персонажа в чистом игровом представлении." : "Здесь отображаются только персонажи, назначенные вашему аккаунту в активной кампании."}</p>
        </div>
        {manager || canEditSelected ? (
          <div className="editor-actions character-header-actions">
            {manager ? <CodexButton type="button" variant="secondary" onClick={openCreate}><Plus size={16} /><span>Создать героя</span></CodexButton> : null}
            {canEditSelected ? <CodexButton type="button" onClick={openEdit} disabled={!selected}><Pencil size={16} /><span>Редактировать</span></CodexButton> : null}
          </div>
        ) : null}
      </header>

      {state.loading ? <div className="status-message success-message">Загружаю персонажей кампании...</div> : null}
      {state.error ? <div className="status-message danger-message" role="alert">{state.error}</div> : null}

      <section className={showRoster ? "characters-layout character-dossier-layout" : "characters-layout character-dossier-layout character-dossier-layout--single"}>
        {showRoster ? (
          <aside className="character-list-panel character-roster-panel">
            <div className="notes-list-head"><div><span className="kicker">{manager ? "Состав кампании" : "Мои герои"}</span><h2>{state.characters.length}</h2></div></div>
            <div className="character-list">
              {state.characters.map((character) => <CharacterCard key={character.id} character={character} manager={manager} selected={selected?.id === character.id} onSelect={() => setSearchParams({ character: character.id })} />)}
              {!state.loading && !state.error && !state.characters.length ? <p className="empty-copy">{manager ? "В кампании пока нет персонажей." : "В этой кампании пока нет назначенного вам персонажа."}</p> : null}
            </div>
          </aside>
        ) : null}

        <section className="character-sheet-panel character-dossier-sheet">
          {selected ? (
            <>
              <header className="character-dossier-hero" style={visuals.colorTheme ? { "--character-accent": visuals.colorTheme === "obsidian-gold" ? "#e3b65f" : undefined } : undefined}>
                <div className="character-dossier-portrait">{portrait ? <img src={portrait} alt={`Портрет персонажа ${characterName(selected)}`} /> : <span>{initials(characterName(selected))}</span>}</div>
                <div className="character-dossier-title">
                  <span className="kicker">Character dossier</span>
                  <h2>{characterName(selected)}</h2>
                  <p>{characterSubtitle(selected) || "Основные данные персонажа не заполнены."}</p>
                  <div className="character-identity-chips">
                    {manager ? <span>{selected.assignment?.displayName ? `Игрок: ${selected.assignment.displayName}` : "Персонаж не назначен"}</span> : null}
                    {identity.background ? <span>{identity.background}</span> : null}
                    {identity.alignment ? <span>{identity.alignment}</span> : null}
                    {identity.deity ? <span>{identity.deity}</span> : null}
                    {listOf(identity.languages).map((language) => <span key={language}>{language}</span>)}
                  </div>
                </div>
                <div className="character-dossier-vitals">
                  <Metric label="AC" value={stats.armorClass} prominent />
                  <Metric label="HP" value={hp === null ? "—" : `${hp}${maxHp === null ? "" : ` / ${maxHp}`}`} prominent />
                  <Metric label="Временные HP" value={stats.tempHp} />
                  <Metric label="Скорость" value={stats.speed !== undefined ? `${stats.speed} фт.` : "—"} />
                  <Metric label="Восприятие" value={displayModifier(stats.perception)} onRoll={() => setRoll(rollCheck("Восприятие", stats.perception))} rollHint="d20" />
                  <Metric label="Фокус" value={magic.focusPoints} />
                </div>
              </header>

              {manager ? <CharacterAssignmentPanel character={selected} campaignId={activeCampaignId} onAssigned={(character) => loadCharacters(character?.id || selected.id)} /> : null}

              <section className="character-tactical-strip" aria-label="Основные показатели персонажа">
                <article className="character-tactical-group">
                  <span className="kicker">Спасброски</span>
                  <div className="character-save-row">
                    <Metric label="Стойкость" value={displayModifier(saves.fortitude)} onRoll={() => setRoll(rollCheck("Стойкость", saves.fortitude))} rollHint="d20" />
                    <Metric label="Реакция" value={displayModifier(saves.reflex)} onRoll={() => setRoll(rollCheck("Реакция", saves.reflex))} rollHint="d20" />
                    <Metric label="Воля" value={displayModifier(saves.will)} onRoll={() => setRoll(rollCheck("Воля", saves.will))} rollHint="d20" />
                  </div>
                </article>
                <article className="character-tactical-group character-tactical-group--abilities">
                  <span className="kicker">Характеристики</span>
                  <div className="character-ability-row">
                    {[["str", "СИЛ"], ["dex", "ЛОВ"], ["con", "ТЕЛ"], ["int", "ИНТ"], ["wis", "МДР"], ["cha", "ХАР"]].map(([key, label]) => <Metric key={key} label={label} value={displayModifier(abilities[key])} onRoll={() => setRoll(rollCheck(label, abilities[key]))} rollHint="d20" />)}
                  </div>
                </article>
              </section>

              <section className="character-dossier-main">
                <div className="character-dossier-primary" data-character-zone="table-play">
                  <CollectionSection className="character-dossier-section--combat" title="Атаки" icon={Swords} items={combat.attacks} emptyText="Атаки пока не добавлены." rollKind="attack" onRoll={setRoll} />
                  <CollectionSection title="Действия" icon={Activity} items={abilityGroups.actions} emptyText="Активные действия пока не добавлены." rollKind="formula" onRoll={setRoll} />
                  <CollectionSection title="Реакции" icon={Zap} items={abilityGroups.reactions} emptyText="Реакции пока не добавлены." rollKind="formula" onRoll={setRoll} />
                  {spellGroups.map((group) => <CollectionSection key={group.rank} title={`Заклинания · ${group.label}`} icon={Sparkles} items={group.items} emptyText="" rollKind="formula" onRoll={setRoll} />)}
                  {!spellGroups.length ? <CollectionSection title="Заклинания и силы" icon={Sparkles} items={[]} emptyText="Заклинания пока не добавлены." rollKind="formula" onRoll={setRoll} /> : null}
                  <CollectionSection title="Навыки" icon={BrainCircuit} items={stats.skills} emptyText="Навыки пока не добавлены." rollKind="skill" onRoll={setRoll} />
                  {defenses.map((group) => <CollectionSection key={group.key} title={group.label} icon={group.key === "conditions" ? CircleDot : Shield} items={group.items} emptyText={`${group.label} отсутствуют.`} />)}
                </div>

                <aside className="character-dossier-reference" data-character-zone="reference">
                  {abilityGroups.passiveGroups.map((group) => <CollectionSection key={group.label} compact title={group.label} icon={BookOpenText} items={group.items} emptyText="" />)}
                  {!abilityGroups.passiveGroups.length ? <CollectionSection compact title="Пассивные способности" icon={BookOpenText} items={[]} emptyText="Пассивные способности пока не добавлены." /> : null}
                  <CollectionSection compact title="Владение навыками" icon={ShieldCheck} items={proficiencyGroups.map((item) => ({ name: item.label, value: item.count }))} emptyText="Ранги владения пока не указаны." />
                  <CollectionSection compact title="Снаряжение" icon={Backpack} items={inventoryItems} emptyText="Предметы пока не добавлены." />
                  {inventory.text ? <TextBlock label="Инвентарь · заметка" value={inventory.text} /> : null}
                </aside>
              </section>

              <section className="character-story-section">
                <div className="character-story-section__head"><span className="kicker">История и заметки</span><h3>За пределами чисел</h3></div>
                <div className="character-readonly-blocks character-notes-grid">
                  <TextBlock label="Публичное описание" value={text.publicSummary} />
                  <TextBlock label="Личные заметки" value={text.privateNotes} privateBlock />
                  <TextBlock label="Заметки по билду" value={text.buildNotes} privateBlock />
                  <TextBlock label="Заметки GM" value={text.gmNotes} privateBlock />
                </div>
              </section>

              <div className="status-message success-message character-safety-note"><ShieldCheck size={16} /><span>Лист показывает только поля, возвращённые backend для текущей membership. Броски выполняются локально.</span></div>
            </>
          ) : (
            <div className="notes-empty-editor character-empty-state">
              <UserRound size={38} />
              <h2>Персонаж ещё не добавлен</h2>
              <p>{manager ? "Создай героя и назначь его участнику активной кампании." : "После назначения персонажа вашему аккаунту его досье появится здесь."}</p>
              {manager ? <CodexButton type="button" onClick={openCreate}><Plus size={16} /><span>Создать героя</span></CodexButton> : null}
            </div>
          )}
        </section>
      </section>
      <RollToast roll={roll} onDismiss={() => setRoll(null)} />
    </div>
  );
}
