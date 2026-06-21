import { useEffect, useMemo, useState } from "react";
import { Check, Crosshair, MapPin, Shapes, Sparkles, Trash2, Upload } from "lucide-react";
import { api } from "../api/client.js";
import MarkdownImportPanel from "./MarkdownImportPanel.jsx";
import CodexButton from "./ui/CodexButton.jsx";
import { labelCategory } from "../utils/labels.js";
import { colorMapObjectType, labelMapObjectType, mapObjectTypes, pageToMapObjectType } from "../utils/mapTypes.js";
import { articleTypes as types, categoryByType } from "./ArticleVisualEditor.jsx";
import { citiesForContext, countriesForWorld, relationOptionsFromPages, tagOptionsFromPages, uniqueValues } from "../utils/controlledMetadata.js";
import { WORLD_THEME_OPTIONS } from "../theme/worldThemes.js";


const loreSubtypes = [
  ["general", "Общий лор"],
  ["faction", "Фракция"],
  ["cult", "Культ"],
  ["god", "Бог / религия"],
  ["artifact", "Артефакт"],
  ["history", "История"],
  ["prophecy", "Пророчество"],
  ["plane", "План / измерение"],
  ["magic", "Магия"]
];

const loreCategoryBySubtype = {
  general: "lore",
  faction: "lore/factions",
  cult: "lore/cults",
  god: "lore/gods",
  artifact: "lore/artifacts",
  history: "lore/history",
  prophecy: "lore/prophecies",
  plane: "lore/planes",
  magic: "lore/magic"
};

function inferLoreSubtypeFromText(text = "") {
  const lower = text.toLowerCase();
  if (/(фракц|гильд|синдикат|орден|легат|банд|faction|guild|syndicate|order)/i.test(lower)) return "faction";
  if (/(культ|cult)/i.test(lower)) return "cult";
  if (/(бог|религ|церковь|god|religion|church|deity)/i.test(lower)) return "god";
  if (/(артефакт|реликв|artifact|relic)/i.test(lower)) return "artifact";
  if (/(истор|война|битва|эпох|history|war|battle|era)/i.test(lower)) return "history";
  if (/(пророч|prophecy|omen)/i.test(lower)) return "prophecy";
  if (/(план|измерен|plane|realm)/i.test(lower)) return "plane";
  if (/(маг|заклин|magic|arcane)/i.test(lower)) return "magic";
  return "general";
}

function visibleLocationFields(type) {
  return {
    world: type !== "world",
    country: !["world", "country"].includes(type),
    city: !["world", "country", "city"].includes(type)
  };
}

const mediaSlots = [
  ["mapImage", "Карта / план", "Для областей, пинов, городов и локаций"],
  ["avatarImage", "Аватар / портрет", "Для NPC, союзников, важных персонажей"],
  ["tokenImage", "Token врага", "Для боевых NPC и монстров"],
  ["handoutImage", "Handout", "Картинка-подсказка или иллюстрация для игроков"]
];

function optionLabel(page) {
  return `${page.title} · ${labelCategory(page.category)}`;
}

function assetUrl(path = "") {
  if (!path) return "";
  return path.startsWith("/api/assets/") ? path : `/api/assets/${path.replace(/^images\//, "")}`;
}

function createEmptyMapDraft() {
  return {
    shape: "pin",
    type: "location",
    visibility: "public",
    label: "",
    path: "",
    summary: "",
    points: []
  };
}

function compactSummary(text = "") {
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value).split(/[;,\n]/).map((item) => item.trim()).filter(Boolean);
}

export default function QuickEditor({ onSaved, initialTitle = "", initialWorld = "" }) {
  const [metadata, setMetadata] = useState({ pages: [], tags: [], worlds: [], countries: [], cities: [] });
  const [form, setForm] = useState({ type: "lore", loreSubtype: "general", visibility: "public", tags: [], related: [], mapObjects: [], name: initialTitle, world: initialWorld });
  const [mapDraft, setMapDraft] = useState(createEmptyMapDraft);
  const [relatedDraft, setRelatedDraft] = useState({ type: "npc", title: "" });
  const [localPreview, setLocalPreview] = useState({});
  const [message, setMessage] = useState("");
  const [ideaText, setIdeaText] = useState("");

  useEffect(() => {
    api.metadata("gm").then(setMetadata).catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    if (initialTitle) setForm((current) => ({ ...current, name: initialTitle }));
  }, [initialTitle]);

  useEffect(() => {
    if (initialWorld) setForm((current) => ({ ...current, world: current.world || initialWorld }));
  }, [initialWorld]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateDraft = (patch) => setMapDraft((current) => ({ ...current, ...patch }));
  const selectedTypeLabel = useMemo(() => types.find(([value]) => value === form.type)?.[1] || "Статья", [form.type]);
  const allMetadataPages = metadata.pages || [];
  const worlds = metadata.worlds || [];
  const countries = countriesForWorld(allMetadataPages, form.world);
  const cities = citiesForContext(allMetadataPages, { world: form.world, country: form.country });
  const tagOptions = tagOptionsFromPages(allMetadataPages, form.tags || metadata.tags || []);
  const relationOptions = relationOptionsFromPages(allMetadataPages);

  function toggleArray(key, value) {
    setForm((current) => {
      const list = current[key] || [];
      return { ...current, [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] };
    });
  }

  function updateWorld(value) {
    setForm((current) => ({ ...current, world: value, country: "", city: "" }));
  }

  function updateCountry(value) {
    setForm((current) => ({ ...current, country: value, city: "" }));
  }

  async function createRelatedDraft() {
    const title = relatedDraft.title.trim();
    if (!title) {
      setMessage("Введи название связанной статьи, которую нужно создать.");
      return;
    }

    try {
      const payload = {
        type: relatedDraft.type || "lore",
        name: title,
        title,
        visibility: form.visibility || "public",
        world: form.type === "world" ? (form.name || form.title || "") : form.world,
        country: ["world", "country"].includes(relatedDraft.type) ? "" : form.country,
        city: ["world", "country", "city"].includes(relatedDraft.type) ? "" : form.city,
        summary: `Заготовка, созданная из редактора: ${form.name || form.title || "новая статья"}.`,
        related: uniqueValues([form.name || form.title].filter(Boolean))
      };
      const data = await api.createPage(payload);
      const createdTitle = data.page?.title || title;
      setForm((current) => ({
        ...current,
        related: uniqueValues([...(current.related || []), createdTitle])
      }));
      setRelatedDraft({ type: relatedDraft.type || "npc", title: "" });
      setMessage(`Создана связанная статья: ${createdTitle}`);
      onSaved?.();
      api.metadata("gm").then(setMetadata).catch(() => {});
    } catch (error) {
      setMessage(error.message);
    }
  }


  async function uploadMedia(slot, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage(`Загружаю: ${file.name}`);
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview((current) => ({ ...current, [slot]: previewUrl }));
    try {
      const data = new FormData();
      data.append("file", file);
      const uploaded = await api.uploadAsset(data);
      update(slot, uploaded.path);
      setLocalPreview((current) => ({ ...current, [slot]: "" }));
      setMessage(`Файл загружен: ${uploaded.path}`);
    } catch (error) {
      setMessage(`Не удалось загрузить файл: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  }

  function applyImportedDraft(item) {
    const fm = item.frontmatter || {};
    setForm((current) => ({
      ...current,
      ...fm,
      type: item.type || fm.type || current.type || "lore",
      loreSubtype: item.loreSubtype || fm.loreSubtype || fm.subtype || current.loreSubtype || "general",
      category: item.category || fm.category || loreCategoryBySubtype[item.loreSubtype || fm.loreSubtype] || categoryByType[item.type] || current.category,
      name: item.title || fm.name || fm.title || current.name,
      title: item.title || fm.title || fm.name || current.title,
      summary: item.summary || fm.summary || current.summary || "",
      visibility: fm.visibility || current.visibility || "public",
      tags: asArray(fm.tags),
      related: asArray(fm.related),
      publicNotes: item.content || current.publicNotes || ""
    }));
    setMessage("Markdown загружен в форму. Проверь поля и нажми “Создать”. В vault он пока не записан.");
  }

  function syncDraftWithPage(path) {
    const linked = metadata.pages.find((page) => page.path === path);
    if (!linked) {
      updateDraft({ path });
      return;
    }
    const inferredType = pageToMapObjectType(linked);
    setMapDraft((current) => ({
      ...current,
      path,
      type: current.type === "location" ? inferredType : current.type,
      label: current.label || linked.title,
      summary: current.summary || compactSummary(linked.summary || ""),
      visibility: linked.visibility === "gm" || current.type === "secret" ? "gm" : current.visibility
    }));
  }

  function mapClickPosition(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Number((((event.clientX - rect.left) / rect.width) * 100).toFixed(2)),
      y: Number((((event.clientY - rect.top) / rect.height) * 100).toFixed(2))
    };
  }

  function addMapPointOrPin(event) {
    if (!form.mapImage) return;
    const position = mapClickPosition(event);
    if (mapDraft.shape === "area") {
      setMapDraft((current) => ({ ...current, points: [...(current.points || []), position] }));
      return;
    }
    if (!mapDraft.label.trim()) {
      setMessage("Сначала выбери статью или введи название объекта карты.");
      return;
    }
    const object = {
      id: `map-${Date.now()}`,
      shape: "pin",
      type: mapDraft.type,
      label: mapDraft.label.trim(),
      path: mapDraft.path,
      summary: mapDraft.summary,
      visibility: mapDraft.type === "secret" ? "gm" : mapDraft.visibility,
      x: position.x,
      y: position.y,
      color: colorMapObjectType(mapDraft.type)
    };
    update("mapObjects", [...(form.mapObjects || []), object]);
    setMessage(`Пин добавлен: ${object.label}`);
  }

  function saveArea() {
    if (!mapDraft.label.trim()) {
      setMessage("Сначала выбери статью или введи название области.");
      return;
    }
    if ((mapDraft.points || []).length < 3) {
      setMessage("Для области нужно минимум 3 точки на карте.");
      return;
    }
    const object = {
      id: `area-${Date.now()}`,
      shape: "area",
      type: mapDraft.type,
      label: mapDraft.label.trim(),
      path: mapDraft.path,
      summary: mapDraft.summary,
      visibility: mapDraft.type === "secret" ? "gm" : mapDraft.visibility,
      points: mapDraft.points,
      color: colorMapObjectType(mapDraft.type)
    };
    update("mapObjects", [...(form.mapObjects || []), object]);
    setMapDraft(createEmptyMapDraft());
    setMessage(`Область добавлена: ${object.label}`);
  }

  function removeMapObject(id) {
    update("mapObjects", (form.mapObjects || []).filter((object) => object.id !== id));
  }

  function setObjectType(type) {
    updateDraft({ type, visibility: type === "secret" ? "gm" : mapDraft.visibility });
  }


  function inferTypeFromIdea(text) {
    const lower = text.toLowerCase();
    if (/\b(мир|план|измерение|realm|world)\b/.test(lower)) return "world";
    if (/\b(страна|королевство|империя|республика|княжество)\b/.test(lower)) return "country";
    if (/\b(город|порт|столица|деревня|поселение|крепость)\b/.test(lower)) return "city";
    if (/\b(npc|нпс|персонаж|торговец|капитан|жрец|маг|страж|кузнец)\b/.test(lower)) return "npc";
    if (/\b(враг|монстр|существо|нежить|босс|демон|дракон|гоблин)\b/.test(lower)) return "enemy";
    if (/\b(квест|задание|поручение|цель|награда)\b/.test(lower)) return "quest";
    if (/\b(сессия|session|recap|итоги)\b/.test(lower)) return "session";
    if (/\b(локация|таверна|храм|башня|подземелье|лагерь|рынок)\b/.test(lower)) return "location";
    if (/\b(год|эра|событие|timeline|таймлайн)\b/.test(lower)) return "timelineEvent";
    if (inferLoreSubtypeFromText(text) !== "general") return "lore";
    return "lore";
  }

  function extractTagsFromIdea(text) {
    const lower = text.toLowerCase();
    const rules = [
      ["культ", "культ"],
      ["секрет", "секрет"],
      ["страж", "стража"],
      ["торгов", "торговля"],
      ["порт", "порт"],
      ["нежить", "нежить"],
      ["маг", "магия"],
      ["дракон", "драконы"],
      ["опас", "опасность"],
      ["пират", "пираты"]
    ];
    return rules.filter(([needle]) => lower.includes(needle)).map(([, tag]) => tag);
  }

  function findMention(collection, text) {
    const lower = text.toLowerCase();
    return collection.find((page) => page.title && lower.includes(page.title.toLowerCase()))?.title || "";
  }

  function applyIdeaDraft() {
    const text = ideaText.trim();
    if (!text) {
      setMessage("Опиши идею одной строкой — система попробует заполнить основу статьи.");
      return;
    }
    const [rawTitle, ...rest] = text.split(/\s+[—–-]\s+/);
    const title = rawTitle?.trim().slice(0, 90) || form.name || "Новая статья";
    const summary = rest.join(" — ").trim() || text;
    const type = inferTypeFromIdea(text);
    const loreSubtype = type === "lore" ? inferLoreSubtypeFromText(text) : "general";
    const detectedWorld = findMention(metadata.worlds, text);
    const detectedCountry = findMention(metadata.countries, text);
    const detectedCity = findMention(metadata.cities, text);
    const tags = [...new Set([...(form.tags || []), ...extractTagsFromIdea(text)])];

    setForm((current) => ({
      ...current,
      type,
      category: type === "lore" ? loreCategoryBySubtype[loreSubtype] : (categoryByType[type] || current.category),
      loreSubtype,
      name: current.name || title,
      title: current.title || title,
      summary: current.summary || summary,
      publicNotes: current.publicNotes || summary,
      world: current.world || detectedWorld,
      country: current.country || detectedCountry,
      city: current.city || detectedCity,
      tags
    }));
    setMessage("Черновик заполнен из одной строки. Проверь название, тип и нажми “Создать” или открой “Дополнительно”.");
  }

  async function submit(event) {
    event.preventDefault();
    const category = form.category || (form.type === "lore" ? loreCategoryBySubtype[form.loreSubtype || "general"] : categoryByType[form.type]) || "lore";
    const page = await api.createPage({
      ...form,
      category,
      tags: form.tags || [],
      related: form.related || [],
      mapObjects: form.mapObjects || []
    });
    setMessage(`Сохранено: ${page.page.path}`);
    onSaved?.();
    api.metadata("gm").then(setMetadata).catch(() => {});
  }

  return (
    <form className="editor-form builder-form quick-create-shell" onSubmit={submit}>
      <section className="builder-section quick-create-panel">
        <div className="quick-create-copy">
          <span className="kicker">{initialWorld ? `Мир: ${initialWorld}` : "Быстрое создание"}</span>
          <h2>{selectedTypeLabel}</h2>
          <p>Сначала только минимум: тип, название, место и краткое описание. Всё тяжёлое спрятано ниже, чтобы мастер не заполнял налоговую декларацию на каждого гоблина.</p>
        </div>
        <div className="type-grid compact-type-grid">
          {types.map(([value, label]) => (
            <button key={value} type="button" className={form.type === value ? "type-chip active" : "type-chip"} onClick={() => setForm((current) => ({ ...current, type: value, loreSubtype: value === "lore" ? (current.loreSubtype || "general") : "general", category: value === "lore" ? loreCategoryBySubtype[current.loreSubtype || "general"] : (categoryByType[value] || current.category), world: value === "world" ? "" : current.world, country: ["world", "country"].includes(value) ? "" : current.country, city: ["world", "country", "city"].includes(value) ? "" : current.city }))}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="builder-section idea-capture-panel">
        <div>
          <span className="kicker">Авто-черновик</span>
          <h2>Одна строка вместо десяти полей</h2>
          <p>Напиши идею как мастеру удобно: “Капитан Варос — командир стражи, скрывает сделку с культом”. Система предложит тип, название, summary, теги и привязки к уже существующим мирам/городам.</p>
        </div>
        <div className="idea-capture-controls">
          <textarea value={ideaText} onChange={(event) => setIdeaText(event.target.value)} placeholder="Например: Терен-Далерей — северный торговый порт, через который идут основные морские поставки" />
          <CodexButton type="button" onClick={applyIdeaDraft}><Sparkles size={16} /> Разобрать идею</CodexButton>
        </div>
      </section>

      <section className="builder-section create-flow-section">
        <div className="visual-editor-section-head">
          <span className="kicker">Основное</span>
          <h2>Название, тип и видимость</h2>
          <p>Поля ниже меняются по типу статьи. Мир не выбирает мир, страна выбирает мир, город выбирает страну, а лор получает подтип.</p>
        </div>
        <div className="codex-field-grid codex-field-grid--four">
          <label className="codex-field">Название<input value={form.name || ""} onChange={(event) => update("name", event.target.value)} placeholder="Например: Капитан Варос" /></label>
          {form.type === "lore" && (
            <label className="codex-field">Подтип лора<select value={form.loreSubtype || "general"} onChange={(event) => {
              const loreSubtype = event.target.value;
              setForm((current) => ({ ...current, loreSubtype, category: loreCategoryBySubtype[loreSubtype] || "lore" }));
            }}>
              {loreSubtypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
          )}
          <label className="codex-field">Видимость<select value={form.visibility} onChange={(event) => update("visibility", event.target.value)}>
            <option value="public">public · видно игрокам</option>
            <option value="gm">gm · только мастеру</option>
            <option value="draft">draft · черновик</option>
          </select></label>
          <label className="codex-field">Системная категория<select value={form.category || (form.type === "lore" ? loreCategoryBySubtype[form.loreSubtype || "general"] : categoryByType[form.type])} disabled>
            {[...new Set([...Object.values(categoryByType), ...Object.values(loreCategoryBySubtype)])].map((category) => <option key={category} value={category}>{labelCategory(category)}</option>)}
          </select></label>
        </div>
        <div className="codex-field-grid codex-field-grid--four">
          {visibleLocationFields(form.type).world && <label className="codex-field">Мир<select value={form.world || ""} onChange={(event) => updateWorld(event.target.value)}>
            <option value="">Без привязки к миру</option>
            {worlds.map((page) => <option key={page.path} value={page.title}>{page.title}</option>)}
          </select></label>}
          {visibleLocationFields(form.type).country && <label className="codex-field">Страна<select value={form.country || ""} onChange={(event) => updateCountry(event.target.value)}>
            <option value="">Без привязки к стране</option>
            {countries.map((page) => <option key={page.path} value={page.title}>{page.title}</option>)}
          </select></label>}
          {visibleLocationFields(form.type).city && <label className="codex-field">Город<select value={form.city || ""} onChange={(event) => update("city", event.target.value)}>
            <option value="">Без привязки к городу</option>
            {cities.map((page) => <option key={page.path} value={page.title}>{page.title}</option>)}
          </select></label>}
        </div>
        {form.type === "world" && (
          <div className="codex-field-grid codex-field-grid--four world-theme-editor-row">
            <label className="codex-field">Шаблон мира<select value={form.theme || "midgard"} onChange={(event) => update("theme", event.target.value)}>
              {WORLD_THEME_OPTIONS.filter((theme) => theme.value !== "archive").map((theme) => <option key={theme.value} value={theme.value}>{theme.label}</option>)}
            </select></label>
            <label className="codex-field">Кинематографичный фон<input value={form.backgroundVideo || ""} onChange={(event) => update("backgroundVideo", event.target.value)} placeholder="fire/fire-loop.webm" /></label>
            <label className="codex-field">Poster / fallback<input value={form.backgroundPoster || ""} onChange={(event) => update("backgroundPoster", event.target.value)} placeholder="fire/fire-poster.jpg" /></label>
            <label className="codex-field">Звук атмосферы<input value={form.ambienceAudio || ""} onChange={(event) => update("ambienceAudio", event.target.value)} placeholder="fire/fire-ambience.mp3" /></label>
          </div>
        )}
        <label className="codex-field">Краткое описание<textarea value={form.summary || ""} onChange={(event) => update("summary", event.target.value)} placeholder="1–3 строки: кто/что это и зачем мастеру помнить." /></label>
        <label className="codex-field gm-secret-field">
          GM-секреты
          <textarea value={form.gmSecrets || ""} onChange={(event) => update("gmSecrets", event.target.value)} placeholder="Секретная информация для мастера. Игроки не увидят этот блок в player mode." />
          <span>Сохранится как раздел GM Secrets и будет скрыто от игроков.</span>
        </label>
      </section>

      <details className="advanced-editor-details import-details">
        <summary><Sparkles size={16} /> Импортировать MD / Obsidian</summary>
        <MarkdownImportPanel onImported={onSaved} onUseAsDraft={applyImportedDraft} />
      </details>

      <details className="advanced-editor-details">
        <summary>Дополнительно: теги, связи, медиа, карты, GM-секреты</summary>

        <section className="builder-section two-col">
          <div>
            <span className="field-title">Теги из vault</span>
            <p className="builder-hint">Теги больше не вводятся руками: выбирай только существующие, чтобы не плодить дубликаты.</p>
            <div className="choice-row">
              {tagOptions.length === 0 && <span className="empty-inline-hint">В vault пока нет тегов.</span>}
              {tagOptions.map((tag) => (
                <button key={tag} type="button" className={form.tags?.includes(tag) ? "choice-pill active" : "choice-pill"} onClick={() => toggleArray("tags", tag)}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="field-title">Связанные статьи</span>
            <select value="" onChange={(event) => event.target.value && toggleArray("related", event.target.value)}>
              <option value="">Добавить существующую связь</option>
              {relationOptions.map((page) => <option key={page.path} value={page.title}>{optionLabel(page)}</option>)}
            </select>
            <div className="choice-row">
              {(form.related || []).map((title) => <button key={title} type="button" className="choice-pill active" onClick={() => toggleArray("related", title)}>{title}</button>)}
            </div>
            <div className="inline-add controlled-create-row">
              <select value={relatedDraft.type} onChange={(event) => setRelatedDraft((current) => ({ ...current, type: event.target.value }))}>
                {types.filter(([value]) => value !== "world").map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input value={relatedDraft.title} onChange={(event) => setRelatedDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Создать новую связанную статью" />
              <button type="button" className="type-chip" onClick={createRelatedDraft}>Создать и связать</button>
            </div>
          </div>
        </section>

        <section className="builder-section">
          <div className="map-upload-row">
            <div>
              <span className="kicker">Медиа</span>
              <h2>Карта, портрет, token, handout</h2>
            </div>
          </div>
          <div className="media-slot-grid">
            {mediaSlots.map(([slot, label, hint]) => (
              <article key={slot} className="media-slot-card">
                <div>
                  <strong>{label}</strong>
                  <p>{hint}</p>
                </div>
                {(localPreview[slot] || form[slot]) && <img src={localPreview[slot] || assetUrl(form[slot])} alt={label} />}
                <CodexButton as="label" variant="secondary" className="codex-file-button">
                  <Upload size={18} />
                  <span>Загрузить</span>
                  <input type="file" accept="image/png,image/jpg,image/jpeg,image/pjpeg,image/webp,.png,.jpg,.jpeg,.webp" onChange={(event) => uploadMedia(slot, event)} />
                </CodexButton>
                <input value={form[slot] || ""} onChange={(event) => update(slot, event.target.value)} placeholder="Файл в vault/images" />
              </article>
            ))}
          </div>
        </section>

        {form.mapImage && (
          <section className="builder-section map2-editor-section">
            <div className="map-upload-row">
              <div>
                <span className="kicker">Maps 2.0</span>
                <h2>Пины и области</h2>
              </div>
              <div className="map-editor-mode-row">
                <button type="button" className={mapDraft.shape === "pin" ? "type-chip active" : "type-chip"} onClick={() => updateDraft({ shape: "pin", points: [] })}>
                  <MapPin size={16} /> Пин
                </button>
                <button type="button" className={mapDraft.shape === "area" ? "type-chip active" : "type-chip"} onClick={() => updateDraft({ shape: "area", points: [] })}>
                  <Shapes size={16} /> Область
                </button>
              </div>
            </div>

            <div className="pin-tools map2-draft-grid">
              <label>Связанная статья<select value={mapDraft.path} onChange={(event) => syncDraftWithPage(event.target.value)}>
                <option value="">Без ссылки / выбрать статью</option>
                {metadata.pages.map((page) => <option key={page.path} value={page.path}>{optionLabel(page)}</option>)}
              </select></label>
              <label>Название объекта<input value={mapDraft.label} onChange={(event) => updateDraft({ label: event.target.value })} placeholder="Автоматически из статьи или вручную" /></label>
              <label>Тип объекта<select value={mapDraft.type} onChange={(event) => setObjectType(event.target.value)}>
                {mapObjectTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select></label>
              <label>Слой<select value={mapDraft.type === "secret" ? "gm" : mapDraft.visibility} onChange={(event) => updateDraft({ visibility: event.target.value })} disabled={mapDraft.type === "secret"}>
                <option value="public">player-visible</option>
                <option value="gm">GM-only</option>
              </select></label>
            </div>
            <label>Hover-описание<textarea value={mapDraft.summary} onChange={(event) => updateDraft({ summary: event.target.value })} placeholder="Короткая подсказка на hover. Если выбрана статья, подтянется автоматически." /></label>

            <div className="pin-editor map2-create-stage" onClick={addMapPointOrPin}>
              <img
                src={assetUrl(form.mapImage)}
                alt="Карта для расстановки пинов и областей"
                onError={() => setMessage("Карта указана, но браузер не смог открыть файл. Проверь PNG/JPG/WebP и путь в vault/images.")}
              />
              <svg className="map2-editor-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                {(form.mapObjects || []).filter((object) => object.shape === "area").map((object) => (
                  <polygon key={object.id} points={(object.points || []).map((point) => `${point.x},${point.y}`).join(" ")} style={{ "--object-color": object.color || colorMapObjectType(object.type) }} />
                ))}
                {mapDraft.shape === "area" && mapDraft.points.length > 0 && (
                  <polyline points={mapDraft.points.map((point) => `${point.x},${point.y}`).join(" ")} />
                )}
                {mapDraft.points.map((point, index) => <circle key={`${point.x}-${point.y}-${index}`} cx={point.x} cy={point.y} r="0.8" />)}
              </svg>
              {(form.mapObjects || []).filter((object) => object.shape !== "area").map((object) => (
                <button key={object.id} type="button" className="pin-editor-dot map2-editor-dot" style={{ left: `${object.x}%`, top: `${object.y}%`, "--object-color": object.color || colorMapObjectType(object.type) }} onClick={(event) => { event.stopPropagation(); removeMapObject(object.id); }} title="Удалить объект">
                  <Crosshair size={14} />
                  <span>{object.label}</span>
                </button>
              ))}
            </div>

            <div className="map2-editor-actions">
              {mapDraft.shape === "area" && <CodexButton type="button" onClick={saveArea}><Check size={16} /> Сохранить область</CodexButton>}
              {mapDraft.shape === "area" && <button type="button" className="type-chip" onClick={() => updateDraft({ points: [] })}>Сбросить точки</button>}
              <p className="builder-hint">
                Пин: выбери статью и кликни по карте. Область: выбери статью, поставь минимум 3 точки и нажми “Сохранить область”.
              </p>
            </div>

            {(form.mapObjects || []).length > 0 && (
              <div className="map2-editor-list">
                {(form.mapObjects || []).map((object) => (
                  <article key={object.id} style={{ "--object-color": object.color || colorMapObjectType(object.type) }}>
                    <span>{labelMapObjectType(object.type)} · {object.shape === "area" ? "область" : "пин"} · {object.visibility === "gm" ? "GM" : "player"}</span>
                    <strong>{object.label}</strong>
                    <em>{object.path || "без статьи"}</em>
                    <button type="button" className="type-chip" onClick={() => removeMapObject(object.id)}><Trash2 size={15} /> Удалить</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="builder-section">
          <label>Публичные заметки<textarea value={form.publicNotes || ""} onChange={(event) => update("publicNotes", event.target.value)} /></label>
        </section>
      </details>

      <CodexButton type="submit" className="quick-submit" size="lg"><Sparkles size={17} /> <span>Создать Markdown-статью</span></CodexButton>
      {message && <p className="save-message">{message}</p>}
    </form>
  );
}
