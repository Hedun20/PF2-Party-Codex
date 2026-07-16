function list(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

function text(value = "") {
  return String(value ?? "").trim();
}

function numberOrBlank(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function systemOf(value = {}) {
  return value.system || value.data?.data || value.data || {};
}

function itemName(value = {}) {
  return text(value.name || value.label || value.slug || value.id);
}

function actionCost(value = {}) {
  const system = systemOf(value);
  const raw = value.actions
    ?? value.actionCost
    ?? value.actionType
    ?? system.actions?.value
    ?? system.actions
    ?? system.actionType?.value
    ?? system.actionType
    ?? system.time?.value
    ?? "";
  const normalized = text(raw).toLowerCase();
  if (["1", "one", "action", "single"].includes(normalized)) return "1";
  if (["2", "two", "double"].includes(normalized)) return "2";
  if (["3", "three", "triple"].includes(normalized)) return "3";
  if (["reaction", "r"].includes(normalized)) return "reaction";
  if (["free", "freeaction", "free-action"].includes(normalized)) return "free";
  return normalized;
}

function description(value = {}) {
  const system = systemOf(value);
  const source = value.description ?? system.description?.value ?? system.description ?? "";
  return text(source).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 5000);
}

function normalizeDefense(value, kind) {
  if (typeof value === "string") {
    const match = value.trim().match(/^(.*?)(?:\s+(\d+))?$/);
    return { name: text(match?.[1] || value), value: numberOrBlank(match?.[2]), kind, description: "" };
  }
  return {
    name: itemName(value) || text(value.type),
    value: numberOrBlank(value.value ?? value.amount ?? value.modifier),
    kind,
    description: description(value) || text(value.source)
  };
}

function normalizeCondition(value) {
  const system = systemOf(value);
  return {
    name: itemName(value) || "condition",
    value: numberOrBlank(value.value ?? value.badge?.value ?? system.value?.value ?? system.value ?? system.badge?.value),
    kind: "condition",
    description: description(value)
  };
}

function rawItems(raw = {}) {
  return list(raw.items || raw.actor?.items || raw.character?.items);
}

function rawBuild(raw = {}) {
  return raw.build || raw.character || raw;
}

function indexedByName(items = []) {
  const index = new Map();
  for (const item of list(items)) {
    const name = itemName(item).toLowerCase();
    if (name && !index.has(name)) index.set(name, item);
  }
  return index;
}

function mergeActionMetadata(items = [], sourceItems = []) {
  const byName = indexedByName(sourceItems);
  return list(items).map((item) => {
    const source = byName.get(itemName(item).toLowerCase()) || {};
    const actions = actionCost(item) || actionCost(source);
    return {
      ...item,
      ...(actions ? { actions } : {}),
      ...(item.description || !description(source) ? {} : { description: description(source) })
    };
  });
}

function enrichAttacks(attacks = [], sourceItems = []) {
  const byName = indexedByName(sourceItems);
  return list(attacks).map((attack) => {
    const source = byName.get(itemName(attack).toLowerCase()) || {};
    const system = systemOf(source);
    const actions = actionCost(attack) || actionCost(source) || "1";
    const proficiencyRank = text(
      attack.proficiencyRank
      || attack.rank
      || source.proficiencyRank
      || source.rank
      || system.proficiency?.rank
      || system.proficiency
      || system.category
      || ""
    );
    return {
      ...attack,
      actions,
      ...(proficiencyRank ? { proficiencyRank } : {}),
      ...(attack.description || !description(source) ? {} : { description: description(source) })
    };
  });
}

function enrichSpells(spells = [], sourceItems = []) {
  const byName = indexedByName(sourceItems);
  return list(spells).map((spell) => {
    const source = byName.get(itemName(spell).toLowerCase()) || {};
    const system = systemOf(source);
    const rank = numberOrBlank(
      spell.rank
      ?? spell.level
      ?? source.rank
      ?? source.level
      ?? source.spellLevel
      ?? system.level?.value
      ?? system.level
    );
    const tradition = text(
      spell.tradition
      || source.tradition
      || list(source.traditions)[0]
      || list(system.traits?.traditions)[0]
      || list(system.traditions)[0]
      || list(system.traits?.value).find((trait) => ["arcane", "divine", "occult", "primal"].includes(text(trait).toLowerCase()))
      || ""
    );
    const preparation = text(
      spell.preparation
      || spell.category
      || source.preparation
      || source.category
      || system.preparation?.mode
      || system.prepared?.value
      || system.location?.value
      || ""
    );
    const actions = actionCost(spell) || actionCost(source);
    return {
      ...spell,
      ...(rank !== "" ? { level: rank } : {}),
      ...(tradition ? { tradition } : {}),
      ...(preparation ? { preparation } : {}),
      ...(actions ? { actions } : {}),
      ...(spell.description || !description(source) ? {} : { description: description(source) })
    };
  });
}

function foundryDefenses(raw = {}) {
  const system = systemOf(raw);
  const attributes = system.attributes || {};
  return {
    resistances: list(attributes.resistances || system.resistances).map((item) => normalizeDefense(item, "resistance")),
    weaknesses: list(attributes.weaknesses || system.weaknesses).map((item) => normalizeDefense(item, "weakness")),
    immunities: list(attributes.immunities || system.immunities).map((item) => normalizeDefense(item, "immunity")),
    conditions: rawItems(raw).filter((item) => item?.type === "condition").map(normalizeCondition)
  };
}

function pathbuilderDefenses(raw = {}) {
  const build = rawBuild(raw);
  return {
    resistances: list(build.resistances).map((item) => normalizeDefense(item, "resistance")),
    weaknesses: list(build.weaknesses).map((item) => normalizeDefense(item, "weakness")),
    immunities: list(build.immunities).map((item) => normalizeDefense(item, "immunity")),
    conditions: list(build.conditions).map(normalizeCondition)
  };
}

function combinePreferExisting(existing = [], fallback = []) {
  return list(existing).length ? list(existing) : list(fallback);
}

export function enrichPf2Character(normalized = {}) {
  const sourceType = text(normalized.source?.type).toLowerCase();
  const raw = normalized.rawImport || {};
  const foundry = sourceType.includes("foundry");
  const sourceItems = foundry ? rawItems(raw) : [
    ...list(rawBuild(raw).feats),
    ...list(rawBuild(raw).classFeats),
    ...list(rawBuild(raw).ancestryFeats),
    ...list(rawBuild(raw).skillFeats),
    ...list(rawBuild(raw).generalFeats),
    ...list(rawBuild(raw).specials),
    ...list(rawBuild(raw).spells),
    ...list(rawBuild(raw).weapons),
    ...list(rawBuild(raw).attacks)
  ];
  const importedDefenses = foundry ? foundryDefenses(raw) : pathbuilderDefenses(raw);
  const combat = normalized.combat || {};
  const magic = normalized.magic || {};
  const progression = normalized.progression || {};

  return {
    ...normalized,
    stats: {
      ...(normalized.stats || {}),
      heroPoints: Number(normalized.stats?.heroPoints ?? systemOf(raw).resources?.heroPoints?.value ?? 0) || 0
    },
    combat: {
      ...combat,
      attacks: enrichAttacks(combat.attacks, sourceItems.filter((item) => !foundry || item?.type === "weapon")),
      resistances: combinePreferExisting(combat.resistances, importedDefenses.resistances),
      weaknesses: combinePreferExisting(combat.weaknesses, importedDefenses.weaknesses),
      immunities: combinePreferExisting(combat.immunities, importedDefenses.immunities),
      conditions: combinePreferExisting(combat.conditions, importedDefenses.conditions)
    },
    magic: {
      ...magic,
      spells: enrichSpells(magic.spells, sourceItems.filter((item) => !foundry || item?.type === "spell"))
    },
    progression: {
      ...progression,
      feats: mergeActionMetadata(progression.feats, sourceItems.filter((item) => !foundry || ["feat", "action"].includes(item?.type))),
      classFeatures: mergeActionMetadata(progression.classFeatures, sourceItems),
      ancestryFeatures: mergeActionMetadata(progression.ancestryFeatures, sourceItems)
    }
  };
}
