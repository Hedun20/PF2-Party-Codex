const FEAT_TYPE_META = {
  class: { order: 10, label: "Классовые способности" },
  archetype: { order: 20, label: "Архетип" },
  ancestry: { order: 30, label: "Наследие и народ" },
  skill: { order: 40, label: "Фиты навыков" },
  general: { order: 50, label: "Общие фиты" },
  power: { order: 60, label: "Силы и особенности" },
  classfeatures: { order: 70, label: "Классовые особенности" },
  ancestryfeatures: { order: 80, label: "Особенности народа" },
  other: { order: 90, label: "Другие способности" }
};

const ACTION_LABELS = {
  "1": "1 действие",
  "2": "2 действия",
  "3": "3 действия",
  reaction: "Реакция",
  free: "Свободное действие",
  passive: "Пассивная"
};

const RANK_LABELS = {
  untrained: "Необучен",
  trained: "Обучен",
  expert: "Эксперт",
  master: "Мастер",
  legendary: "Легенда"
};

const RANK_ALIASES = {
  "необучен": "untrained",
  "необученный": "untrained",
  untrained: "untrained",
  "обучен": "trained",
  "обученный": "trained",
  trained: "trained",
  "эксперт": "expert",
  expert: "expert",
  "мастер": "master",
  master: "master",
  "легенда": "legendary",
  "легендарный": "legendary",
  legendary: "legendary"
};

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function cleanType(value = "") {
  return String(value || "other").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function featTypeMeta(value = "") {
  const type = cleanType(value);
  if (FEAT_TYPE_META[type]) return FEAT_TYPE_META[type];
  if (type.includes("archetype")) return FEAT_TYPE_META.archetype;
  if (type.includes("skill")) return FEAT_TYPE_META.skill;
  if (type.includes("general")) return FEAT_TYPE_META.general;
  if (type.includes("ancestry") || type.includes("heritage")) return FEAT_TYPE_META.ancestry;
  if (type.includes("class") || type.includes("thaumaturge") || type.includes("fighter") || type.includes("wizard")) return FEAT_TYPE_META.class;
  if (type.includes("power") || type.includes("mind")) return FEAT_TYPE_META.power;
  return FEAT_TYPE_META.other;
}

function rankKey(value = "") {
  return RANK_ALIASES[String(value || "").trim().toLowerCase()] || "untrained";
}

export function actionKey(item = {}) {
  const raw = String(item.actions ?? item.actionCost ?? item.actionType ?? "").trim().toLowerCase();
  if (["1", "one", "action", "single"].includes(raw)) return "1";
  if (["2", "two", "double"].includes(raw)) return "2";
  if (["3", "three", "triple"].includes(raw)) return "3";
  if (["reaction", "r"].includes(raw)) return "reaction";
  if (["free", "freeaction", "free-action"].includes(raw)) return "free";
  return "passive";
}

export function actionLabel(item = {}) {
  return ACTION_LABELS[actionKey(item)] || ACTION_LABELS.passive;
}

export function proficiencyLabel(value = "") {
  const key = rankKey(value);
  return RANK_LABELS[key] || value || "";
}

export function characterAbilities(progression = {}) {
  const feats = list(progression.feats).map((item) => ({ ...item, sourceGroup: "feats" }));
  const classFeatures = list(progression.classFeatures).map((item) => ({ ...item, type: item?.type || "classFeatures", sourceGroup: "classFeatures" }));
  const ancestryFeatures = list(progression.ancestryFeatures).map((item) => ({ ...item, type: item?.type || "ancestryFeatures", sourceGroup: "ancestryFeatures" }));
  const all = [...feats, ...classFeatures, ...ancestryFeatures];
  const actions = all.filter((item) => ["1", "2", "3", "free"].includes(actionKey(item)));
  const reactions = all.filter((item) => actionKey(item) === "reaction");
  const passive = all.filter((item) => actionKey(item) === "passive");
  const groups = new Map();

  for (const item of passive) {
    const meta = featTypeMeta(item.type);
    if (!groups.has(meta.label)) groups.set(meta.label, { ...meta, items: [] });
    groups.get(meta.label).items.push(item);
  }

  return {
    all,
    actions,
    reactions,
    passiveGroups: [...groups.values()].sort((left, right) => left.order - right.order)
  };
}

export function spellRankLabel(rank) {
  const number = Number(rank);
  if (!Number.isFinite(number) || number < 0) return "Без ранга";
  if (number === 0) return "Чары";
  return `${number} ранг`;
}

export function spellsByRank(spells = []) {
  const groups = new Map();
  for (const spell of list(spells)) {
    const number = Number(spell?.rank ?? spell?.level);
    const rank = Number.isFinite(number) && number >= 0 ? number : -1;
    if (!groups.has(rank)) groups.set(rank, []);
    groups.get(rank).push(spell);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => right - left)
    .map(([rank, items]) => ({ rank, label: spellRankLabel(rank), items }));
}

function normalizedDefense(item, kind) {
  if (typeof item === "string") return { name: item, kind };
  return {
    ...item,
    name: item?.name || item?.type || item?.label || "Без названия",
    kind
  };
}

export function defensiveCollections(combat = {}) {
  return [
    { key: "resistances", label: "Сопротивления", items: list(combat.resistances).map((item) => normalizedDefense(item, "resistance")) },
    { key: "weaknesses", label: "Слабости", items: list(combat.weaknesses).map((item) => normalizedDefense(item, "weakness")) },
    { key: "immunities", label: "Иммунитеты", items: list(combat.immunities).map((item) => normalizedDefense(item, "immunity")) },
    { key: "conditions", label: "Состояния", items: list(combat.conditions).map((item) => normalizedDefense(item, "condition")) }
  ];
}

export function skillRanks(skills = []) {
  const result = { untrained: 0, trained: 0, expert: 0, master: 0, legendary: 0 };
  for (const skill of list(skills)) result[rankKey(skill?.rank)] += 1;
  return Object.entries(result)
    .filter(([, count]) => count > 0)
    .map(([rank, count]) => ({ rank, label: proficiencyLabel(rank), count }));
}
