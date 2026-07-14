import { useEffect, useMemo, useState } from "react";
import { Backpack, BookOpenText, BrainCircuit, ShieldCheck, Sparkles, Swords, UserRound } from "lucide-react";
import { api } from "../api/client.js";

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

function Metric({ label, value, prominent = false }) {
  return (
    <div className={prominent ? "character-metric character-metric--prominent" : "character-metric"}>
      <span>{label}</span>
      <strong>{valueOrDash(value)}</strong>
    </div>
  );
}

function CollectionSection({ title, icon: Icon, items, emptyText }) {
  const values = listOf(items);
  return (
    <section className="character-dossier-section">
      <header><Icon size={19} /><h3>{title}</h3><span>{values.length}</span></header>
      {values.length ? (
        <div className="character-item-grid">
          {values.map((item, index) => (
            <article key={`${itemName(item)}-${index}`} className="character-item-card">
              <strong>{itemName(item)}</strong>
              {itemMeta(item) ? <span>{itemMeta(item)}</span> : null}
              {item?.description ? <p>{item.description}</p> : null}
            </article>
          ))}
        </div>
      ) : <p className="character-section-empty">{emptyText}</p>}
    </section>
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
        setState({ loading: false, error: error.message || "Не удалось загрузить персонажей.", characters: [] });
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

  return (
    <div className="page-stack characters-page character-dossier-page">
      <header className="list-header characters-header">
        <span className="kicker">Player Workspace</span>
        <h1>Мой персонаж</h1>
        <p>Player-safe досье героя: личность, боевые показатели, способности, снаряжение и заметки, которые backend разрешил показать текущему пользователю.</p>
      </header>

      {state.loading ? <div className="status-message success-message"><span>Загружаю персонажей кампании...</span></div> : null}
      {state.error ? <div className="status-message danger-message" role="alert"><span>{state.error}</span></div> : null}

      <section className="characters-layout character-dossier-layout">
        <aside className="character-list-panel character-roster-panel">
          <div className="notes-list-head">
            <div>
              <span className="kicker">Мои герои</span>
              <h2>{state.characters.length}</h2>
            </div>
          </div>
          <div className="character-list">
            {state.characters.map((character) => (
              <CharacterCard key={character.id} character={character} selected={selected?.id === character.id} onSelect={() => setSelectedId(character.id)} />
            ))}
            {!state.loading && !state.error && !state.characters.length ? <p className="empty-copy">В этой кампании пока нет назначенного вам персонажа.</p> : null}
          </div>
        </aside>

        <section className="character-sheet-panel character-dossier-sheet">
          {selected ? (
            <>
              <header className="character-dossier-hero" style={visuals.colorTheme ? { "--character-accent": visuals.colorTheme === "obsidian-gold" ? "#e3b65f" : undefined } : undefined}>
                <div className="character-dossier-portrait">
                  {portrait ? <img src={portrait} alt={`Портрет персонажа ${characterName(selected)}`} /> : <span>{initials(characterName(selected))}</span>}
                </div>
                <div className="character-dossier-title">
                  <span className="kicker">Character dossier</span>
                  <h2>{characterName(selected)}</h2>
                  <p>{characterSubtitle(selected) || "Основные данные персонажа не заполнены."}</p>
                  <div className="character-identity-chips">
                    {identity.background ? <span>{identity.background}</span> : null}
                    {identity.alignment ? <span>{identity.alignment}</span> : null}
                    {identity.deity ? <span>{identity.deity}</span> : null}
                    {listOf(identity.languages).map((language) => <span key={language}>{language}</span>)}
                  </div>
                </div>
                <div className="character-dossier-vitals">
                  <Metric label="AC" value={stats.armorClass} prominent />
                  <Metric label="HP" value={hp === null ? "—" : `${hp}${maxHp === null ? "" : ` / ${maxHp}`}`} prominent />
                  <Metric label="Скорость" value={stats.speed !== undefined ? `${stats.speed} фт.` : "—"} />
                  <Metric label="Восприятие" value={displayModifier(stats.perception)} />
                </div>
              </header>

              <section className="character-core-grid">
                <article className="character-core-card">
                  <span className="kicker">Спасброски</span>
                  <div className="character-save-row">
                    <Metric label="Стойкость" value={displayModifier(saves.fortitude)} />
                    <Metric label="Реакция" value={displayModifier(saves.reflex)} />
                    <Metric label="Воля" value={displayModifier(saves.will)} />
                  </div>
                </article>
                <article className="character-core-card">
                  <span className="kicker">Характеристики</span>
                  <div className="character-ability-row">
                    {[["str", "СИЛ"], ["dex", "ЛОВ"], ["con", "ТЕЛ"], ["int", "ИНТ"], ["wis", "МДР"], ["cha", "ХАР"]].map(([key, label]) => (
                      <Metric key={key} label={label} value={displayModifier(abilities[key])} />
                    ))}
                  </div>
                </article>
              </section>

              <CollectionSection title="Атаки и боевые действия" icon={Swords} items={combat.attacks} emptyText="Атаки пока не импортированы." />
              <CollectionSection title="Навыки" icon={BrainCircuit} items={stats.skills} emptyText="Навыки пока не импортированы." />
              <CollectionSection title="Способности и фиты" icon={BookOpenText} items={feats} emptyText="Фиты и классовые способности пока не импортированы." />
              <CollectionSection title="Заклинания и силы" icon={Sparkles} items={magic.spells} emptyText="Заклинания или силы пока не добавлены." />
              <CollectionSection title="Снаряжение" icon={Backpack} items={inventoryItems} emptyText="Предметы пока не импортированы." />
              {inventory.text ? <TextBlock label="Инвентарь · заметка" value={inventory.text} /> : null}

              <section className="character-readonly-blocks character-notes-grid">
                <TextBlock label="Публичное описание" value={text.publicSummary} />
                <TextBlock label="Личные заметки" value={text.privateNotes} privateBlock />
                <TextBlock label="Заметки по билду" value={text.buildNotes} privateBlock />
                <TextBlock label="Заметки GM" value={text.gmNotes} privateBlock />
              </section>

              <div className="status-message success-message character-safety-note">
                <ShieldCheck size={16} />
                <span>Лист показывает только поля, возвращённые backend для текущей membership. Raw import и закрытые данные других игроков сюда не запрашиваются.</span>
              </div>
            </>
          ) : (
            <div className="notes-empty-editor character-empty-state">
              <UserRound size={38} />
              <h2>Персонаж ещё не добавлен</h2>
              <p>После назначения персонажа вашему аккаунту его безопасное досье появится здесь.</p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
