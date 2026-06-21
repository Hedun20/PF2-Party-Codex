import { useMemo, useState } from "react";
import { Eye, FileCode2, Save, Sparkles, Wand2 } from "lucide-react";
import MarkdownViewer from "./MarkdownViewer.jsx";
import CodexButton from "./ui/CodexButton.jsx";
import { api } from "../api/client.js";
import { labelCategory } from "../utils/labels.js";
import { asArray, citiesForContext, countriesForWorld, getWorldPages, relationOptionsFromPages, tagOptionsFromPages, uniqueValues } from "../utils/controlledMetadata.js";
import { WORLD_THEME_OPTIONS } from "../theme/worldThemes.js";

export const articleTypes = [
  ["world", "Мир"],
  ["country", "Страна"],
  ["city", "Город"],
  ["location", "Локация"],
  ["npc", "NPC"],
  ["pc", "PC / персонаж игрока"],
  ["enemy", "Враг"],
  ["quest", "Квест"],
  ["session", "Сессия"],
  ["lore", "Лор"],
  ["timelineEvent", "Событие timeline"],
  ["map", "Карта"]
];

export const categoryByType = {
  world: "worlds",
  country: "countries",
  city: "cities",
  npc: "npcs",
  pc: "characters",
  enemy: "enemies",
  quest: "quests",
  session: "sessions",
  location: "locations",
  lore: "lore",
  timelineEvent: "timeline",
  map: "maps"
};

const categories = [...new Set(Object.values(categoryByType))];
const visibilityOptions = [
  ["public", "public · видно игрокам"],
  ["gm", "gm · только мастеру"],
  ["draft", "draft · черновик"]
];

function visibleLocationFields(type) {
  return {
    world: type !== "world",
    country: !["world", "country"].includes(type),
    city: !["world", "country", "city"].includes(type)
  };
}

function optionLabel(page) {
  return `${page.title} · ${labelCategory(page.category)}`;
}

function splitList(value) {
  if (Array.isArray(value)) return value.join(", ");
  return value || "";
}

function toList(value) {
  return String(value || "")
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function Field({ label, children }) {
  return <label>{label}{children}</label>;
}

function TextField({ label, value, onChange, placeholder = "" }) {
  return <Field label={label}><input value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></Field>;
}

function TextArea({ label, value, onChange, placeholder = "" }) {
  return <Field label={label}><textarea value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></Field>;
}

function NumberField({ label, value, onChange, placeholder = "" }) {
  return <Field label={label}><input type="number" value={value ?? ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></Field>;
}

function ListField({ label, value, onChange, placeholder = "Через запятую" }) {
  return <Field label={label}><input value={splitList(value)} onChange={(event) => onChange(toList(event.target.value))} placeholder={placeholder} /></Field>;
}

function Section({ title, hint, children }) {
  return (
    <section className="visual-editor-section">
      <div className="visual-editor-section-head">
        <h2>{title}</h2>
        {hint && <p>{hint}</p>}
      </div>
      <div className="visual-editor-grid">{children}</div>
    </section>
  );
}

function NpcFields({ fm, set }) {
  const isCombatant = Boolean(fm.isCombatant);
  return (
    <>
      <Section title="NPC" hint="Заполняй только то, что реально помогает вести сцену.">
        <TextField label="Роль" value={fm.role} onChange={(value) => set("role", value)} placeholder="капитан стражи, торговец, информатор" />
        <TextField label="Ancestry / народ" value={fm.ancestry} onChange={(value) => set("ancestry", value)} />
        <TextField label="Фракция" value={fm.faction} onChange={(value) => set("faction", value)} />
        <TextField label="Локация" value={fm.location} onChange={(value) => set("location", value)} />
        <TextField label="Отношение к партии" value={fm.attitude} onChange={(value) => set("attitude", value)} placeholder="дружелюбен, подозревает, боится" />
        <TextField label="Статус" value={fm.status} onChange={(value) => set("status", value)} placeholder="жив, пропал, мёртв, скрывается" />
        <TextArea label="Мотивация / секрет" value={fm.motivation} onChange={(value) => set("motivation", value)} />
        <label className="toggle-field"><input type="checkbox" checked={isCombatant} onChange={(event) => set("isCombatant", event.target.checked)} /> Боевой NPC / нужны PF2-поля</label>
      </Section>
      {isCombatant && <CombatFields fm={fm} set={set} title="Боевые поля NPC" />}
    </>
  );
}

function CombatFields({ fm, set, title = "PF2 combat stats" }) {
  return (
    <Section title={title} hint="Это не полноценный statblock, а удобный боевой минимум для мастера.">
      <NumberField label="Level" value={fm.level} onChange={(value) => set("level", value)} />
      <TextField label="Threat / роль" value={fm.threat} onChange={(value) => set("threat", value)} placeholder="solo, elite, minion, hazard" />
      <TextField label="AC" value={fm.ac} onChange={(value) => set("ac", value)} />
      <TextField label="HP" value={fm.hp} onChange={(value) => set("hp", value)} />
      <TextField label="Saves" value={fm.saves} onChange={(value) => set("saves", value)} placeholder="Fort +10, Ref +8, Will +6" />
      <TextField label="Perception" value={fm.perception} onChange={(value) => set("perception", value)} />
      <TextField label="Speed" value={fm.speed} onChange={(value) => set("speed", value)} />
      <TextArea label="Attacks" value={fm.attacks} onChange={(value) => set("attacks", value)} />
      <TextArea label="Abilities" value={fm.abilities} onChange={(value) => set("abilities", value)} />
    </Section>
  );
}

function EnemyFields({ fm, set }) {
  return (
    <>
      <Section title="Враг / существо" hint="PF2-логика: уровень, тип, опасность и боевой минимум должны фильтроваться позже.">
        <NumberField label="Level" value={fm.level} onChange={(value) => set("level", value)} />
        <TextField label="Rarity" value={fm.rarity} onChange={(value) => set("rarity", value)} placeholder="common, uncommon, rare" />
        <TextField label="Creature type" value={fm.creatureType} onChange={(value) => set("creatureType", value)} placeholder="undead, beast, humanoid" />
        <ListField label="Traits" value={fm.traits} onChange={(value) => set("traits", value)} />
        <TextField label="Size" value={fm.size} onChange={(value) => set("size", value)} />
        <TextField label="Threat" value={fm.threat} onChange={(value) => set("threat", value)} />
      </Section>
      <CombatFields fm={fm} set={set} />
      <Section title="Тактика и награды">
        <TextArea label="Weaknesses" value={fm.weaknesses} onChange={(value) => set("weaknesses", value)} />
        <TextArea label="Resistances" value={fm.resistances} onChange={(value) => set("resistances", value)} />
        <TextArea label="Immunities" value={fm.immunities} onChange={(value) => set("immunities", value)} />
        <TextArea label="Tactics" value={fm.tactics} onChange={(value) => set("tactics", value)} />
        <TextArea label="Loot" value={fm.loot} onChange={(value) => set("loot", value)} />
      </Section>
    </>
  );
}

function WorldFields({ fm, set }) {
  return (
    <Section title="Мир" hint="Мир должен задавать тон, правила и визуальную атмосферу.">
      <Field label="Шаблон мира">
        <select value={fm.theme || "midgard"} onChange={(event) => set("theme", event.target.value)}>
          {WORLD_THEME_OPTIONS.filter((theme) => theme.value !== "archive").map((theme) => <option key={theme.value} value={theme.value}>{theme.label}</option>)}
        </select>
      </Field>
      <TextField label="Жанр / тон" value={fm.tone} onChange={(value) => set("tone", value)} placeholder="dark fantasy, planar, морское приключение" />
      <TextField label="Кинематографичный фон WebM/MP4" value={fm.backgroundVideo} onChange={(value) => set("backgroundVideo", value)} placeholder="fire/fire-loop.webm или /world-themes/fire/fire-loop.webm" />
      <TextField label="Poster / fallback image" value={fm.backgroundPoster} onChange={(value) => set("backgroundPoster", value)} placeholder="fire/fire-poster.jpg" />
      <TextField label="Звук атмосферы MP3/OGG" value={fm.ambienceAudio} onChange={(value) => set("ambienceAudio", value)} placeholder="fire/fire-ambience.mp3" />
      <TextField label="Название звука" value={fm.ambienceLabel} onChange={(value) => set("ambienceLabel", value)} placeholder="Треск огня и лава" />
      <TextArea label="Космология / план" value={fm.cosmology} onChange={(value) => set("cosmology", value)} />
      <TextArea label="Магические правила" value={fm.magicRules} onChange={(value) => set("magicRules", value)} />
      <TextArea label="Главные конфликты" value={fm.conflicts} onChange={(value) => set("conflicts", value)} />
    </Section>
  );
}

function CountryFields({ fm, set }) {
  return (
    <Section title="Страна">
      <TextField label="Столица" value={fm.capital} onChange={(value) => set("capital", value)} />
      <TextField label="Правитель / власть" value={fm.ruler} onChange={(value) => set("ruler", value)} />
      <TextField label="Население" value={fm.population} onChange={(value) => set("population", value)} />
      <ListField label="Языки" value={fm.languages} onChange={(value) => set("languages", value)} />
      <ListField label="Фракции" value={fm.factions} onChange={(value) => set("factions", value)} />
      <TextArea label="Законы / конфликты" value={fm.laws} onChange={(value) => set("laws", value)} />
    </Section>
  );
}

function CityFields({ fm, set }) {
  return (
    <Section title="Город">
      <TextField label="Регион" value={fm.region} onChange={(value) => set("region", value)} />
      <TextField label="Население" value={fm.population} onChange={(value) => set("population", value)} />
      <TextField label="Правитель" value={fm.ruler} onChange={(value) => set("ruler", value)} />
      <ListField label="Районы" value={fm.districts} onChange={(value) => set("districts", value)} />
      <ListField label="Фракции" value={fm.factions} onChange={(value) => set("factions", value)} />
      <TextArea label="Слухи / сервисы / опасности" value={fm.cityNotes} onChange={(value) => set("cityNotes", value)} />
    </Section>
  );
}

function LocationFields({ fm, set }) {
  return (
    <Section title="Локация">
      <TextField label="Тип локации" value={fm.locationType} onChange={(value) => set("locationType", value)} placeholder="таверна, храм, башня, порт, подземелье" />
      <TextField label="Владелец / фракция" value={fm.owner} onChange={(value) => set("owner", value)} />
      <TextArea label="Важные зоны / комнаты" value={fm.areas} onChange={(value) => set("areas", value)} />
      <TextArea label="Loot / находки" value={fm.loot} onChange={(value) => set("loot", value)} />
    </Section>
  );
}

function QuestFields({ fm, set }) {
  return (
    <Section title="Квест">
      <TextField label="Статус" value={fm.status} onChange={(value) => set("status", value)} placeholder="idea, active, completed, failed, hidden" />
      <TextField label="Квестодатель" value={fm.giver} onChange={(value) => set("giver", value)} />
      <TextField label="Локация" value={fm.location} onChange={(value) => set("location", value)} />
      <TextArea label="Цель" value={fm.objective} onChange={(value) => set("objective", value)} />
      <TextArea label="Шаги" value={fm.steps} onChange={(value) => set("steps", value)} />
      <TextArea label="Ставки / последствия" value={fm.stakes} onChange={(value) => set("stakes", value)} />
      <TextArea label="Награды" value={fm.rewards} onChange={(value) => set("rewards", value)} />
    </Section>
  );
}

function SessionFields({ fm, set }) {
  return (
    <Section title="Сессия">
      <TextField label="Дата" value={fm.sessionDate} onChange={(value) => set("sessionDate", value)} />
      <TextField label="Номер сессии" value={fm.sessionNumber} onChange={(value) => set("sessionNumber", value)} />
      <ListField label="Участники" value={fm.participants} onChange={(value) => set("participants", value)} />
      <TextArea label="Recap" value={fm.recap} onChange={(value) => set("recap", value)} />
      <TextArea label="Решения игроков" value={fm.decisions} onChange={(value) => set("decisions", value)} />
      <TextArea label="Незакрытые hooks" value={fm.unresolvedHooks} onChange={(value) => set("unresolvedHooks", value)} />
      <TextArea label="Next session hooks" value={fm.nextHooks} onChange={(value) => set("nextHooks", value)} />
    </Section>
  );
}

function LoreFields({ fm, set }) {
  return (
    <Section title="Лор">
      <Field label="Подтип">
        <select value={fm.subtype || "general"} onChange={(event) => set("subtype", event.target.value)}>
          {["general", "god", "faction", "cult", "artifact", "magic", "history", "prophecy", "plane"].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </Field>
      <TextArea label="Легенда для игроков" value={fm.publicLegend} onChange={(value) => set("publicLegend", value)} />
      <TextArea label="Правда GM" value={fm.gmTruth} onChange={(value) => set("gmTruth", value)} />
      <TextField label="Timeline year" value={fm.timelineYear} onChange={(value) => set("timelineYear", value)} />
    </Section>
  );
}

function TimelineFields({ fm, set }) {
  return (
    <Section title="Timeline event">
      <TextField label="Год / дата" value={fm.year} onChange={(value) => set("year", value)} placeholder="-421, 12 Erastus, 3-я Эпоха" />
      <TextField label="Эра" value={fm.era} onChange={(value) => set("era", value)} />
      <TextField label="Важность" value={fm.importance} onChange={(value) => set("importance", value)} placeholder="minor, major, legendary" />
      <ListField label="Связанные страницы" value={fm.linkedPages} onChange={(value) => set("linkedPages", value)} placeholder="Название или путь через запятую" />
    </Section>
  );
}

function TypeSpecificFields({ fm, set }) {
  const type = fm.type || "lore";
  if (type === "world") return <WorldFields fm={fm} set={set} />;
  if (type === "country") return <CountryFields fm={fm} set={set} />;
  if (type === "city") return <CityFields fm={fm} set={set} />;
  if (type === "location") return <LocationFields fm={fm} set={set} />;
  if (type === "npc") return <NpcFields fm={fm} set={set} />;
  if (type === "enemy") return <EnemyFields fm={fm} set={set} />;
  if (type === "quest") return <QuestFields fm={fm} set={set} />;
  if (type === "session") return <SessionFields fm={fm} set={set} />;
  if (type === "timelineEvent") return <TimelineFields fm={fm} set={set} />;
  return <LoreFields fm={fm} set={set} />;
}

export function createFrontmatterDraft({ type = "lore", title = "" } = {}) {
  return {
    title,
    name: title,
    type,
    category: categoryByType[type] || "lore",
    visibility: "public",
    summary: "",
    ...(type === "world" ? { theme: "midgard" } : {}),
    tags: [],
    related: []
  };
}

export default function ArticleVisualEditor({
  frontmatter,
  content,
  raw,
  pages = [],
  mode = "edit",
  path = "",
  onFrontmatterChange,
  onContentChange,
  onRawChange,
  onSaveStructured,
  onSaveRaw,
  onLinkedPageCreated,
  message = ""
}) {
  const [tab, setTab] = useState("visual");
  const [linkedDraft, setLinkedDraft] = useState({ type: "npc", title: "" });
  const [localMessage, setLocalMessage] = useState("");
  const fm = frontmatter || createFrontmatterDraft();
  const currentType = fm.type || "lore";
  const typeLabel = useMemo(() => articleTypes.find(([value]) => value === currentType)?.[1] || "Статья", [currentType]);
  const locationVisibility = visibleLocationFields(currentType);
  const worlds = getWorldPages(pages);
  const countries = countriesForWorld(pages, fm.world);
  const cities = citiesForContext(pages, { world: fm.world, country: fm.country });
  const tagOptions = tagOptionsFromPages(pages, fm.tags || []);
  const relationOptions = relationOptionsFromPages(pages, path);

  const set = (key, value) => onFrontmatterChange?.({ ...fm, [key]: value });
  const setMany = (patch) => onFrontmatterChange?.({ ...fm, ...patch });
  const toggleArrayValue = (key, value) => {
    const list = asArray(fm[key]);
    const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
    set(key, next);
  };
  const updateWorld = (value) => setMany({ world: value, country: "", city: "" });
  const updateCountry = (value) => setMany({ country: value, city: "" });
  const changeType = (type) => {
    const patch = { type, category: categoryByType[type] || fm.category || "lore" };
    if (type === "world") { patch.world = ""; patch.country = ""; patch.city = ""; patch.theme = fm.theme || "midgard"; }
    if (type === "country") { patch.country = ""; patch.city = ""; }
    if (type === "city") patch.city = "";
    onFrontmatterChange?.({ ...fm, ...patch });
  };

  async function createLinkedPage() {
    const title = linkedDraft.title.trim();
    if (!title) {
      setLocalMessage("Введи название новой связанной статьи.");
      return;
    }

    try {
      const payload = {
        type: linkedDraft.type || "lore",
        name: title,
        title,
        visibility: fm.visibility || "public",
        world: currentType === "world" ? (fm.title || fm.name || "") : fm.world,
        country: ["world", "country"].includes(linkedDraft.type) ? "" : fm.country,
        city: ["world", "country", "city"].includes(linkedDraft.type) ? "" : fm.city,
        summary: `Заготовка, созданная из редактора: ${fm.title || fm.name || "статья"}.`,
        related: uniqueValues([fm.title || fm.name].filter(Boolean))
      };
      const data = await api.createPage(payload);
      const createdTitle = data.page?.title || title;
      set("related", uniqueValues([...asArray(fm.related), createdTitle]));
      setLinkedDraft({ type: linkedDraft.type || "npc", title: "" });
      setLocalMessage(`Создана связанная статья: ${createdTitle}`);
      onLinkedPageCreated?.();
    } catch (error) {
      setLocalMessage(error.message);
    }
  }

  return (
    <section className="article-editor-shell">
      <div className="article-editor-tabs" role="tablist">
        <button type="button" className={tab === "visual" ? "active" : ""} onClick={() => setTab("visual")}><Wand2 size={16} /> Визуально</button>
        <button type="button" className={tab === "markdown" ? "active" : ""} onClick={() => setTab("markdown")}><FileCode2 size={16} /> Markdown</button>
        <button type="button" className={tab === "preview" ? "active" : ""} onClick={() => setTab("preview")}><Eye size={16} /> Preview</button>
      </div>

      {tab === "visual" && (
        <div className="visual-editor-body">
          <section className="visual-editor-section editor-automation-note">
            <Sparkles size={28} />
            <div>
              <h2>Визуальный редактор</h2>
              <p>Это слой для мастера: нормальные поля вместо текстового ада. Markdown остаётся доступен во второй вкладке.</p>
            </div>
          </section>

          <Section title={`База: ${typeLabel}`} hint="Минимум полей сверху, детали ниже. Не заполняй лишнее, если оно не помогает игре.">
            <Field label="Тип статьи">
              <select value={currentType} onChange={(event) => changeType(event.target.value)}>
                {articleTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Системная категория">
              <select value={fm.category || categoryByType[currentType] || "lore"} disabled>
                {categories.map((category) => <option key={category} value={category}>{labelCategory(category)}</option>)}
              </select>
            </Field>
            <TextField label="Название" value={fm.name || fm.title} onChange={(value) => onFrontmatterChange?.({ ...fm, name: value, title: value })} />
            <Field label="Видимость">
              <select value={fm.visibility || "public"} onChange={(event) => set("visibility", event.target.value)}>
                {visibilityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            {locationVisibility.world && (
              <Field label="Мир">
                <select value={fm.world || ""} onChange={(event) => updateWorld(event.target.value)}>
                  <option value="">Без привязки к миру</option>
                  {worlds.map((page) => <option key={page.path} value={page.title}>{page.title}</option>)}
                </select>
              </Field>
            )}
            {locationVisibility.country && (
              <Field label="Страна">
                <select value={fm.country || ""} onChange={(event) => updateCountry(event.target.value)}>
                  <option value="">Без привязки к стране</option>
                  {countries.map((page) => <option key={page.path} value={page.title}>{page.title}</option>)}
                </select>
              </Field>
            )}
            {locationVisibility.city && (
              <Field label="Город">
                <select value={fm.city || ""} onChange={(event) => set("city", event.target.value)}>
                  <option value="">Без привязки к городу</option>
                  {cities.map((page) => <option key={page.path} value={page.title}>{page.title}</option>)}
                </select>
              </Field>
            )}
            <div className="controlled-picker">
              <span className="field-title">Теги из vault</span>
              <p className="builder-hint">Без свободного ввода: выбирай существующие теги, чтобы не плодить дубликаты.</p>
              <div className="choice-row">
                {tagOptions.length === 0 && <span className="empty-inline-hint">В vault пока нет тегов.</span>}
                {tagOptions.map((tag) => (
                  <button key={tag} type="button" className={asArray(fm.tags).includes(tag) ? "choice-pill active" : "choice-pill"} onClick={() => toggleArrayValue("tags", tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="controlled-picker controlled-picker--wide">
              <span className="field-title">Связанные статьи</span>
              <select value="" onChange={(event) => event.target.value && toggleArrayValue("related", event.target.value)}>
                <option value="">Добавить существующую связь</option>
                {relationOptions.map((page) => <option key={page.path} value={page.title}>{optionLabel(page)}</option>)}
              </select>
              <div className="choice-row">
                {asArray(fm.related).map((title) => <button key={title} type="button" className="choice-pill active" onClick={() => toggleArrayValue("related", title)}>{title}</button>)}
              </div>
              <div className="inline-add controlled-create-row">
                <select value={linkedDraft.type} onChange={(event) => setLinkedDraft((current) => ({ ...current, type: event.target.value }))}>
                  {articleTypes.filter(([value]) => value !== "world").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input value={linkedDraft.title} onChange={(event) => setLinkedDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Создать новую связанную статью" />
                <button type="button" className="type-chip" onClick={createLinkedPage}>Создать и связать</button>
              </div>
            </div>
            <TextArea label="Краткое описание" value={fm.summary} onChange={(value) => set("summary", value)} />
          </Section>

          <TypeSpecificFields fm={fm} set={set} />

          <details className="advanced-editor-details">
            <summary>Медиа и дополнительные поля</summary>
            <Section title="Медиа">
              <TextField label="Карта / план" value={fm.mapImage} onChange={(value) => set("mapImage", value)} placeholder="images/map.png" />
              <TextField label="Аватар / портрет" value={fm.avatarImage} onChange={(value) => set("avatarImage", value)} placeholder="images/npc.png" />
              <TextField label="Token" value={fm.tokenImage} onChange={(value) => set("tokenImage", value)} placeholder="images/token.webp" />
              <TextField label="Handout" value={fm.handoutImage} onChange={(value) => set("handoutImage", value)} />
            </Section>
          </details>

          <Section title="Текст статьи" hint="Это тело Markdown без frontmatter. Можно писать обычный текст и [[ссылки]].">
            <TextArea label="Основной текст" value={content} onChange={onContentChange} />
          </Section>

          <div className="article-editor-save-row">
            <CodexButton type="button" onClick={onSaveStructured}><Save size={16} /> <span>Сохранить визуально</span></CodexButton>
            {mode === "edit" && path && <span>{path}</span>}
          </div>
        </div>
      )}

      {tab === "markdown" && (
        <div className="raw-editor-panel">
          <textarea value={raw || ""} onChange={(event) => onRawChange?.(event.target.value)} spellCheck="false" aria-label="Markdown статьи" />
          <div className="article-editor-save-row">
            <CodexButton type="button" onClick={onSaveRaw}><Save size={16} /> <span>Сохранить Markdown</span></CodexButton>
            <span>Режим для ручной правки frontmatter, [[links]] и будущих [secret]-блоков.</span>
          </div>
        </div>
      )}

      {tab === "preview" && (
        <section className="markdown-view preview-editor-panel">
          <div className="infobox-preview">
            <span>{labelCategory(fm.category)}</span>
            <strong>{fm.name || fm.title || "Без названия"}</strong>
            <p>{fm.summary || "Описание пока не заполнено."}</p>
            <em>{fm.visibility || "public"}</em>
          </div>
          <MarkdownViewer content={content || ""} pages={pages} />
        </section>
      )}

      {(message || localMessage) && <p className="save-message">{message || localMessage}</p>}
    </section>
  );
}
