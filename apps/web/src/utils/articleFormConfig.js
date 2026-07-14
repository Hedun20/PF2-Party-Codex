const WORLD_THEME_OPTIONS = [
  ["midgard", "Мидгард · классическое фэнтези"],
  ["fire", "Огненный мир"],
  ["ice", "Ледяной мир"],
  ["magic", "Магический мир"],
  ["paradise", "Райский мир"],
  ["hell", "Адский мир"],
  ["death", "Мир смерти"]
];

const field = (key, label, type = "text", extra = {}) => ({ key, label, type, ...extra });

export const ARTICLE_TYPE_CONFIG = [
  {
    value: "world",
    label: "Мир",
    category: "worlds",
    description: "Корневой контейнер сеттинга, темы и атмосферы.",
    fields: [
      field("theme", "Визуальная тема", "select", { options: WORLD_THEME_OPTIONS, defaultValue: "midgard" }),
      field("tone", "Жанр и тон", "text", { placeholder: "Тёмное фэнтези, героическое приключение" }),
      field("cosmology", "Космология", "textarea"),
      field("magicRules", "Правила магии", "textarea"),
      field("conflicts", "Главные конфликты", "textarea")
    ]
  },
  {
    value: "country",
    label: "Страна",
    category: "countries",
    description: "Государство внутри выбранного мира.",
    fields: [
      field("capital", "Столица"),
      field("ruler", "Правитель или власть"),
      field("population", "Население"),
      field("languages", "Языки", "list"),
      field("factions", "Фракции", "list"),
      field("laws", "Законы и конфликты", "textarea")
    ]
  },
  {
    value: "city",
    label: "Город",
    category: "cities",
    description: "Поселение, привязанное к миру и стране.",
    fields: [
      field("region", "Регион"),
      field("population", "Население"),
      field("ruler", "Правитель"),
      field("districts", "Районы", "list"),
      field("factions", "Фракции", "list"),
      field("cityNotes", "Слухи, сервисы и опасности", "textarea")
    ]
  },
  {
    value: "location",
    label: "Локация",
    category: "locations",
    description: "Конкретное место: храм, таверна, башня или подземелье.",
    fields: [
      field("locationType", "Тип локации", "text", { placeholder: "Храм, порт, руины, подземелье" }),
      field("owner", "Владелец или фракция"),
      field("areas", "Важные зоны и комнаты", "textarea"),
      field("loot", "Находки и награды", "textarea")
    ]
  },
  {
    value: "npc",
    label: "NPC",
    category: "npcs",
    description: "Союзник, свидетель, правитель или другой персонаж мастера.",
    fields: [
      field("role", "Роль", "text", { placeholder: "Капитан стражи, информатор" }),
      field("ancestry", "Народ / ancestry"),
      field("faction", "Фракция"),
      field("location", "Основная локация"),
      field("attitude", "Отношение к партии"),
      field("status", "Статус", "select", { options: [["alive", "Жив"], ["missing", "Пропал"], ["hidden", "Скрывается"], ["dead", "Мёртв"]], defaultValue: "alive" }),
      field("motivation", "Мотивация", "textarea"),
      field("isCombatant", "Боевой NPC", "checkbox", { defaultValue: false }),
      field("level", "Уровень", "number"),
      field("ac", "Класс доспеха", "number"),
      field("hp", "Хиты", "number")
    ]
  },
  {
    value: "pc",
    label: "Персонаж игрока",
    category: "characters",
    description: "Архивная статья о герое; полноценный лист хранится в Characters.",
    fields: [
      field("playerName", "Игрок"),
      field("ancestry", "Народ / ancestry"),
      field("heritage", "Наследие"),
      field("background", "Предыстория"),
      field("className", "Класс"),
      field("level", "Уровень", "number", { defaultValue: 1 }),
      field("alignment", "Мировоззрение"),
      field("characterRole", "Роль в группе", "text", { placeholder: "Фронтлайн, контроль, поддержка" })
    ]
  },
  {
    value: "enemy",
    label: "Враг",
    category: "enemies",
    description: "Существо или противник с боевым минимумом для GM.",
    fields: [
      field("level", "Уровень", "number"),
      field("rarity", "Редкость", "select", { options: [["common", "Common"], ["uncommon", "Uncommon"], ["rare", "Rare"], ["unique", "Unique"]], defaultValue: "common" }),
      field("creatureType", "Тип существа"),
      field("traits", "Traits", "list"),
      field("size", "Размер"),
      field("threat", "Роль / угроза"),
      field("ac", "AC", "number"),
      field("hp", "HP", "number"),
      field("saves", "Спасброски"),
      field("perception", "Восприятие"),
      field("speed", "Скорость"),
      field("attacks", "Атаки", "textarea"),
      field("abilities", "Способности", "textarea"),
      field("weaknesses", "Слабости", "textarea"),
      field("resistances", "Сопротивления", "textarea"),
      field("tactics", "Тактика", "textarea"),
      field("loot", "Добыча", "textarea")
    ]
  },
  {
    value: "quest",
    label: "Квест",
    category: "quests",
    description: "Цель, этапы, ставки и награды приключения.",
    fields: [
      field("status", "Статус", "select", { options: [["idea", "Идея"], ["active", "Активен"], ["completed", "Завершён"], ["failed", "Провален"], ["hidden", "Скрыт"]], defaultValue: "active" }),
      field("giver", "Квестодатель"),
      field("location", "Локация"),
      field("objective", "Цель", "textarea"),
      field("steps", "Этапы", "textarea"),
      field("stakes", "Ставки и последствия", "textarea"),
      field("rewards", "Награды", "textarea")
    ]
  },
  {
    value: "session",
    label: "Сессия",
    category: "sessions",
    description: "Подготовка, recap и незакрытые сюжетные крючки.",
    fields: [
      field("sessionDate", "Дата", "date"),
      field("sessionNumber", "Номер сессии", "number"),
      field("participants", "Участники", "list"),
      field("recap", "Recap", "textarea"),
      field("decisions", "Решения игроков", "textarea"),
      field("unresolvedHooks", "Незакрытые hooks", "textarea"),
      field("nextHooks", "Подготовка следующей сессии", "textarea")
    ]
  },
  {
    value: "lore",
    label: "Лор",
    category: "lore",
    description: "История, фракция, религия, артефакт или легенда.",
    fields: [
      field("subtype", "Подтип", "select", { options: [["general", "Общее"], ["god", "Божество"], ["faction", "Фракция"], ["cult", "Культ"], ["artifact", "Артефакт"], ["magic", "Магия"], ["history", "История"], ["prophecy", "Пророчество"], ["plane", "План"]], defaultValue: "general" }),
      field("timelineYear", "Год / эпоха"),
      field("publicLegend", "Легенда для игроков", "textarea")
    ]
  },
  {
    value: "timelineEvent",
    label: "Событие timeline",
    category: "timeline",
    description: "Датированное событие истории кампании.",
    fields: [
      field("year", "Год или дата", "text", { placeholder: "-421, 12 Эрастуса, 3-я Эпоха" }),
      field("era", "Эра"),
      field("importance", "Важность", "select", { options: [["minor", "Небольшое"], ["major", "Важное"], ["legendary", "Легендарное"]], defaultValue: "major" }),
      field("linkedPages", "Связанные страницы", "list")
    ]
  },
  {
    value: "map",
    label: "Карта",
    category: "maps",
    description: "Архивная карточка карты и её контекста.",
    fields: [
      field("mapImage", "Изображение карты", "text", { placeholder: "images/maps/noctgard.webp или https://..." }),
      field("mapRegion", "Регион"),
      field("mapScale", "Масштаб"),
      field("mapNotes", "Что отмечено на карте", "textarea")
    ]
  }
];

const TYPE_CONFIG_BY_VALUE = new Map(ARTICLE_TYPE_CONFIG.map((item) => [item.value, item]));
const ALL_TYPE_FIELD_KEYS = new Set(ARTICLE_TYPE_CONFIG.flatMap((item) => item.fields.map((itemField) => itemField.key)));
const LIST_FIELD_KEYS = new Set(ARTICLE_TYPE_CONFIG.flatMap((item) => item.fields.filter((itemField) => itemField.type === "list").map((itemField) => itemField.key)));
const NUMBER_FIELD_KEYS = new Set(ARTICLE_TYPE_CONFIG.flatMap((item) => item.fields.filter((itemField) => itemField.type === "number").map((itemField) => itemField.key)));

export const articleTypes = ARTICLE_TYPE_CONFIG.map(({ value, label }) => [value, label]);
export const categoryByType = Object.fromEntries(ARTICLE_TYPE_CONFIG.map(({ value, category }) => [value, category]));

export function articleTypeConfig(type = "lore") {
  return TYPE_CONFIG_BY_VALUE.get(type) || TYPE_CONFIG_BY_VALUE.get("lore");
}

export function normalizeArticleType(type = "lore") {
  return TYPE_CONFIG_BY_VALUE.has(type) ? type : "lore";
}

export function visibleLocationFields(type = "lore") {
  return {
    world: type !== "world",
    country: !["world", "country"].includes(type),
    city: !["world", "country", "city"].includes(type)
  };
}

function defaultsForType(type) {
  return Object.fromEntries(articleTypeConfig(type).fields
    .filter((itemField) => itemField.defaultValue !== undefined)
    .map((itemField) => [itemField.key, itemField.defaultValue]));
}

export function buildArticleForm({ initialType = "lore", initialTitle = "", initialWorld = "" } = {}) {
  const type = normalizeArticleType(initialType);
  return {
    type,
    name: initialTitle,
    title: initialTitle,
    visibility: "public",
    category: categoryByType[type],
    world: type === "world" ? "" : initialWorld,
    country: "",
    city: "",
    summary: "",
    publicNotes: "",
    gmSecrets: "",
    tags: "",
    related: "",
    ...defaultsForType(type)
  };
}

export function changeArticleTypeForm(current = {}, nextType = "lore") {
  const type = normalizeArticleType(nextType);
  const cleaned = Object.fromEntries(Object.entries(current).filter(([key]) => !ALL_TYPE_FIELD_KEYS.has(key)));
  return {
    ...cleaned,
    type,
    category: categoryByType[type],
    world: type === "world" ? "" : current.world || "",
    country: ["world", "country"].includes(type) ? "" : current.country || "",
    city: ["world", "country", "city"].includes(type) ? "" : current.city || "",
    ...defaultsForType(type)
  };
}

export function splitArticleList(value = "") {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value || "").split(/[;,\n]/).map((item) => item.trim()).filter(Boolean);
}

export function validateArticleForm(form = {}) {
  const errors = [];
  const title = String(form.name || form.title || "").trim();
  if (!title) errors.push("Введите название материала.");
  if (form.type === "country" && !form.world) errors.push("Для страны сначала выберите мир.");
  if (form.type === "city" && !form.world) errors.push("Для города сначала выберите мир.");
  if (form.type === "city" && !form.country) errors.push("Для города выберите страну.");
  return errors;
}

export function buildArticlePayload(form = {}) {
  const type = normalizeArticleType(form.type);
  const config = articleTypeConfig(type);
  const title = String(form.name || form.title || "").trim();
  const payload = {
    type,
    category: config.category,
    name: title,
    title,
    visibility: form.visibility || "public",
    summary: String(form.summary || "").trim(),
    publicNotes: String(form.publicNotes || "").trim(),
    gmSecrets: String(form.gmSecrets || "").trim(),
    tags: splitArticleList(form.tags),
    related: splitArticleList(form.related)
  };

  const locationFields = visibleLocationFields(type);
  if (locationFields.world && form.world) payload.world = form.world;
  if (locationFields.country && form.country) payload.country = form.country;
  if (locationFields.city && form.city) payload.city = form.city;

  for (const itemField of config.fields) {
    const value = form[itemField.key];
    if (itemField.type === "checkbox") {
      payload[itemField.key] = Boolean(value);
      continue;
    }
    if (LIST_FIELD_KEYS.has(itemField.key)) {
      const list = splitArticleList(value);
      if (list.length) payload[itemField.key] = list;
      continue;
    }
    if (NUMBER_FIELD_KEYS.has(itemField.key)) {
      if (value !== "" && value !== undefined && value !== null) payload[itemField.key] = Number(value);
      continue;
    }
    if (value !== "" && value !== undefined && value !== null) payload[itemField.key] = String(value).trim();
  }
  return payload;
}
