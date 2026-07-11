import { useMemo, useState } from "react";
import { BookOpenText, Eye, FileCode2, Save, Sparkles, Wand2 } from "lucide-react";
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

const GM_SECTION_PATTERN = /^##\s+GM Secrets\s*$/gim;
const NEXT_H2_PATTERN = /^##\s+/gm;

function splitStructuredContent(content = "") {
  let text = String(content || "").trim();
  if (!text) return { publicNotes: "", gmSecrets: "" };

  GM_SECTION_PATTERN.lastIndex = 0;
  const match = GM_SECTION_PATTERN.exec(text);
  if (!match) return { publicNotes: text, gmSecrets: "" };

  const sectionStart = match.index;
  const bodyStart = match.index + match[0].length;
  NEXT_H2_PATTERN.lastIndex = bodyStart;
  const next = NEXT_H2_PATTERN.exec(text);
  const sectionEnd = next ? next.index : text.length;

  const before = text.slice(0, sectionStart).trimEnd();
  const gmSecrets = text.slice(bodyStart, sectionEnd).trim();
  const after = text.slice(sectionEnd).trimStart();
  const publicNotes = [before, after].filter(Boolean).join("\n\n").trim();
  return { publicNotes, gmSecrets };
}

function buildStructuredContent({ publicNotes = "", gmSecrets = "" } = {}) {
  const publicText = String(publicNotes || "").trim();
  const secretText = String(gmSecrets || "").trim();
  return [
    publicText,
    secretText ? `## GM Secrets\n${secretText}` : ""
  ].filter(Boolean).join("\n\n").trim() + "\n";
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
    <>
      <Section title="Мир" hint="Мир должен задавать тон, правила и визуальную атмосферу.">
        <Field label="Шаблон мира">
          <select value={fm.theme || "midgard"} onChange={(event) => set("theme", event.target.value)}>
            {WORLD_THEME_OPTIONS.filter((theme) => theme.value !== "archive").map((theme) => <option key={theme.value} value={theme.value}>{theme.label}</option>)}
          </select>
        </Field>
        <TextField label="Жанр / тон" value={fm.tone} onChange={(value) => set("tone", value)} placeholder="dark fantasy, planar, морское приключение" />
        <TextArea label="Космология / план" value={fm.cosmology} onChange={(value) => set("cosmology", value)} />
        <TextArea label="Магические правила" value={fm.magicRules} onChange={(value) => set("magicRules", value)} />
        <TextArea label="Главные конфликты" value={fm.conflicts} onChange={(value) => set("conflicts", value)} />
      </Section>

      <Section title="Живая визуальная атмосфера" hint="Видео/GIF фон пока заморожен. Сейчас мир меняет шаблон, акцент, частицы, затемнение и optional wallpaper.">
        <Field label="Тип фона">
          <select value={fm.backgroundMode || "theme"} onChange={(event) => set("backgroundMode", event.target.value)}>
            <option value="theme">шаблон темы · без своего файла</option>
            <option value="image">картинка / wallpaper</option>
          </select>
        </Field>
        <TextField label="Картинка / wallpaper" value={fm.backgroundImage} onChange={(value) => set("backgroundImage", value)} placeholder="fire/fire-wallpaper.jpg или https://...jpg" />
        <TextField label="Poster / fallback image" value={fm.backgroundPoster} onChange={(value) => set("backgroundPoster", value)} placeholder="fire/fire-poster.jpg" />
        <NumberField label="Яркость фона 0–1" value={fm.backgroundOpacity} onChange={(value) => set("backgroundOpacity", value)} placeholder="0.42" />
        <NumberField label="Затемнение 0–1" value={fm.backgroundDim} onChange={(value) => set("backgroundDim", value)} placeholder="0.58" />
        <NumberField label="Blur px" value={fm.backgroundBlur} onChange={(value) => set("backgroundBlur", value)} placeholder="0" />
      </Section>

      <Section title="Fallback атмосфера" hint="Это запасной тихий фон, если World Sound не задан как YouTube/local/embed. В topbar всё равно будет один общий звук мира.">
        <Field label="Тип атмосферы">
          <select value={fm.ambienceMode || "auto"} onChange={(event) => set("ambienceMode", event.target.value)}>
            <option value="auto">auto · MP3 если есть, иначе мягкий preview</option>
            <option value="file">только MP3/OGG файл</option>
            <option value="synthetic">только мягкий preview</option>
            <option value="off">выключить для этого мира</option>
          </select>
        </Field>
        <TextField label="Файл атмосферы MP3/OGG" value={fm.ambienceAudio} onChange={(value) => set("ambienceAudio", value)} placeholder="fire/fire-ambience.mp3" />
        <TextField label="Название атмосферы" value={fm.ambienceLabel} onChange={(value) => set("ambienceLabel", value)} placeholder="Костёр и далёкий ветер" />
        <Field label="Автовключение атмосферы">
          <select value={String(fm.ambienceAutoplay ?? false)} onChange={(event) => set("ambienceAutoplay", event.target.value === "true")}>
            <option value="false">нет · включать вручную</option>
            <option value="true">да · после первого разрешения звука</option>
          </select>
        </Field>
      </Section>

      <Section title="World Sound" hint="Один звук мира. YouTube — основной сценарий, local MP3/OGG — лучший audio-only, SoundCloud/external embed — экспериментальные источники.">
        <Field label="Тип музыки">
          <select value={fm.musicSource || "off"} onChange={(event) => set("musicSource", event.target.value)}>
            <option value="off">fallback ambience / выключено</option>
            <option value="youtube">YouTube / YouTube Music link</option>
            <option value="local">local MP3/OGG</option>
            <option value="soundcloud">SoundCloud</option>
            <option value="embed">External embed URL</option>
          </select>
        </Field>
        <TextField label="Music URL" value={fm.musicUrl} onChange={(value) => set("musicUrl", value)} placeholder="YouTube / SoundCloud / Yandex iframe URL" />
        <TextField label="Local music MP3/OGG" value={fm.musicAudio} onChange={(value) => set("musicAudio", value)} placeholder="fire/fire-theme.mp3" />
        <TextField label="Название музыки" value={fm.musicLabel} onChange={(value) => set("musicLabel", value)} placeholder="Музыка Эльдрана" />
        <Field label="Автовключение local music">
          <select value={String(fm.musicAutoplay ?? false)} onChange={(event) => set("musicAutoplay", event.target.value === "true")}>
            <option value="false">нет · вручную</option>
            <option value="true">да · после первого разрешения звука</option>
          </select>
        </Field>
        <Field label="Loop local music">
          <select value={String(fm.musicLoop ?? true)} onChange={(event) => set("musicLoop", event.target.value === "true")}>
            <option value="true">да · зациклить</option>
            <option value="false">нет · один раз</option>
          </select>
        </Field>
      </Section>

      <Section title="Credits / источники" hint="Эти поля только хранят источник и лицензию. Они не включают фон или музыку сами по себе.">
        <TextField label="Источник/credit фона" value={fm.backgroundCredits} onChange={(value) => set("backgroundCredits", value)} placeholder="Pixabay / Mixkit / iStock licensed / свой файл" />
        <TextField label="URL источника фона" value={fm.backgroundSourceUrl} onChange={(value) => set("backgroundSourceUrl", value)} placeholder="https://..." />
        <TextField label="Источник/credit атмосферы" value={fm.ambienceCredits} onChange={(value) => set("ambienceCredits", value)} placeholder="Freesound CC0 / Pixabay / свой файл" />
        <TextField label="URL источника атмосферы" value={fm.ambienceSourceUrl} onChange={(value) => set("ambienceSourceUrl", value)} placeholder="https://..." />
        <TextField label="Credit музыки" value={fm.musicCredits} onChange={(value) => set("musicCredits", value)} placeholder="YouTube / YouTube Audio Library / автор / свой файл" />
      </Section>
    </>
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
    ...(type === "world" ? { theme: "midgard", backgroundMode: "theme", ambienceMode: "auto", ambienceAutoplay: false, musicSource: "off", musicDisplay: "compact", musicAutoplay: false, musicLoop: true } : {}),
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
    if (type === "world") { patch.world = ""; patch.country = ""; patch.city = ""; patch.theme = fm.theme || "midgard"; patch.backgroundMode = fm.backgroundMode || "theme"; patch.ambienceMode = fm.ambienceMode || "auto"; patch.ambienceAutoplay = fm.ambienceAutoplay ?? false; patch.musicSource = fm.musicSource || "off"; patch.musicDisplay = fm.musicDisplay || "compact"; patch.musicAutoplay = fm.musicAutoplay ?? false; patch.musicLoop = fm.musicLoop ?? true; }
    if (type === "country") { patch.country = ""; patch.city = ""; }
    if (type === "city") patch.city = "";
    onFrontmatterChange?.({ ...fm, ...patch });
  };

  function appendContentBlock(text) {
    const currentText = String(content || "").trimEnd();
    const separator = currentText ? "\n\n" : "";
    onContentChange?.(`${currentText}${separator}${text}`);
    setTab("text");
  }

  const structuredStory = useMemo(() => splitStructuredContent(content), [content]);

  function updateStructuredStory(patch) {
    onContentChange?.(buildStructuredContent({ ...structuredStory, ...patch }));
  }

  function appendGmSecretsBlock() {
    const currentSecrets = String(structuredStory.gmSecrets || "").trimEnd();
    const separator = currentSecrets ? "\n" : "";
    updateStructuredStory({ gmSecrets: `${currentSecrets}${separator}- Секрет GM: что скрыто, кто знает правду и когда это раскрыть.` });
    setTab("text");
  }

  function relatedPageByTitle(title) {
    return relationOptions.find((page) => page.title === title);
  }

  function removeRelated(title) {
    set("related", asArray(fm.related).filter((item) => item !== title));
  }

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
        <button type="button" className={tab === "visual" ? "active" : ""} onClick={() => setTab("visual")}><Wand2 size={16} /> Поля</button>
        <button type="button" className={tab === "text" ? "active" : ""} onClick={() => setTab("text")}><BookOpenText size={16} /> Текст статьи</button>
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
              <span className="field-title">Теги кампании</span>
              <p className="builder-hint">Без свободного ввода: выбирай существующие теги, чтобы не плодить дубликаты.</p>
              <div className="choice-row">
                {tagOptions.length === 0 && <span className="empty-inline-hint">В кампании пока нет тегов.</span>}
                {tagOptions.map((tag) => (
                  <button key={tag} type="button" className={asArray(fm.tags).includes(tag) ? "choice-pill active" : "choice-pill"} onClick={() => toggleArrayValue("tags", tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="controlled-picker controlled-picker--wide compact-editor-note">
              <span className="field-title">Связанные статьи</span>
              <p className="builder-hint">Связи вынесены во вкладку “Текст статьи”, рядом с public/GM блоками. Там они отображаются чипами с удалением.</p>
              <button type="button" className="type-chip" onClick={() => setTab("text")}>Открыть связи</button>
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

          <Section title="Текст статьи" hint="Основной текст вынесен в отдельную вкладку, чтобы не писать большой лор в маленьком textarea.">
            <div className="story-tab-callout">
              <BookOpenText size={22} />
              <div>
                <strong>Открой вкладку “Текст статьи”</strong>
                <p>Там большой редактор, быстрые публичные/секретные блоки и подсказки для безопасного player view.</p>
              </div>
              <button type="button" className="type-chip" onClick={() => setTab("text")}>Открыть текст</button>
            </div>
          </Section>

          <div className="article-editor-save-row">
            <CodexButton type="button" onClick={onSaveStructured}><Save size={16} /> <span>Сохранить визуально</span></CodexButton>
            {mode === "edit" && path && <span>{path}</span>}
          </div>
        </div>
      )}

      {tab === "text" && (
        <div className="article-writing-workspace structured-text-workspace structured-article-builder">
          <div className="visual-editor-section-head">
            <span className="kicker">Структура статьи</span>
            <h2>Public · Secrets · Links</h2>
            <p>Не один огромный placeholder, а три рабочих зоны: что увидят игроки, что знает только GM, и с какими статьями этот материал связан.</p>
          </div>

          <div className="structured-story-grid">
            <label className="codex-field story-main-field structured-public-field">
              Публичные заметки / что видят игроки
              <textarea
                className="story-textarea structured-textarea"
                rows={18}
                value={structuredStory.publicNotes}
                onChange={(event) => updateStructuredStory({ publicNotes: event.target.value })}
                spellCheck="true"
                placeholder="Описание сцены, NPC, места или мира. Это player-safe текст для handout и player view."
              />
              <span>Этот блок должен быть безопасен для игроков. [[Ссылки]] можно оставлять прямо в тексте.</span>
            </label>

            <label className="codex-field gm-secret-field story-gm-field structured-secret-field">
              GM секреты / правда мастера
              <textarea
                className="story-textarea structured-textarea structured-secret-textarea"
                rows={14}
                value={structuredStory.gmSecrets}
                onChange={(event) => updateStructuredStory({ gmSecrets: event.target.value })}
                spellCheck="true"
                placeholder="Скрытые мотивы, ловушки, будущие раскрытия, секреты фракций, настоящая история. Игрокам не показывается."
              />
              <span>При сохранении это останется Markdown-разделом ## GM Secrets и будет вырезаться из player-safe view.</span>
            </label>
          </div>

          <section className="related-articles-workbench">
            <div className="related-articles-head">
              <div>
                <span className="kicker">Связанные статьи</span>
                <h3>Мультивыбор через чипы</h3>
                <p>Эти связи питают backlinks, timeline, карту связей, Maps 2.0 и будущий импорт архива мастера.</p>
              </div>
              <select value="" onChange={(event) => event.target.value && toggleArrayValue("related", event.target.value)}>
                <option value="">Добавить существующую связь</option>
                {relationOptions.map((page) => <option key={page.path} value={page.title}>{optionLabel(page)}</option>)}
              </select>
            </div>

            <div className="related-chip-cloud">
              {asArray(fm.related).length === 0 && <span className="empty-inline-hint">Связей пока нет. Добавь NPC, город, карту, квест или событие timeline.</span>}
              {asArray(fm.related).map((title) => {
                const page = relatedPageByTitle(title);
                return (
                  <button key={title} type="button" className="related-chip" onClick={() => removeRelated(title)} title="Удалить связь">
                    <span>{page ? labelCategory(page.category) : "Связь"}</span>
                    <strong>{title}</strong>
                    <em aria-hidden="true">×</em>
                  </button>
                );
              })}
            </div>

            <div className="inline-add controlled-create-row related-create-row">
              <select value={linkedDraft.type} onChange={(event) => setLinkedDraft((current) => ({ ...current, type: event.target.value }))}>
                {articleTypes.filter(([value]) => value !== "world").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input value={linkedDraft.title} onChange={(event) => setLinkedDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Создать новую связанную статью" />
              <button type="button" className="type-chip" onClick={createLinkedPage}>Создать и связать</button>
            </div>
          </section>

          <aside className="story-helper-panel structured-story-helper">
            <strong>Быстрые блоки</strong>
            <p>Статья хранится как структурированный контент кампании, а Markdown остаётся совместимым режимом редактирования и обмена.</p>
            <div className="story-helper-actions">
              <button type="button" className="type-chip" onClick={() => updateStructuredStory({ publicNotes: `${String(structuredStory.publicNotes || "").trimEnd()}${structuredStory.publicNotes ? "\n\n" : ""}## Что видят игроки\n\nКороткое описание, которое можно показывать в Handout / Player View.` })}>+ Public section</button>
              <button type="button" className="type-chip" onClick={appendGmSecretsBlock}>+ GM secret</button>
              <button type="button" className="type-chip" onClick={() => updateStructuredStory({ gmSecrets: `${String(structuredStory.gmSecrets || "").trimEnd()}${structuredStory.gmSecrets ? "\n" : ""}- Reveal условие: что должно произойти, чтобы открыть эту правду игрокам.` })}>+ Reveal note</button>
            </div>
            <div className="story-safe-rules">
              <span>Public: безопасно для игроков.</span>
              <span>GM Secrets: скрывается из player view.</span>
              <span>Related: структурные связи в frontmatter.related.</span>
              <span>Markdown tab остаётся для ручной правки.</span>
            </div>
          </aside>

          <div className="article-editor-save-row">
            <CodexButton type="button" onClick={onSaveStructured}><Save size={16} /> <span>Сохранить статью</span></CodexButton>
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
