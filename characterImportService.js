import crypto from "crypto";

const PARSER_VERSION = "character-import-v1";
const MAX_JSON_BYTES = Number(process.env.CHARACTER_IMPORT_MAX_BYTES || 5 * 1024 * 1024);

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function clean(value = "", max = 5000) {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, max);
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hashRaw(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function readJsonPayload(payload = {}) {
  if (payload.rawImport && typeof payload.rawImport === "object") return payload.rawImport;
  if (payload.json && typeof payload.json === "object") return payload.json;
  if (typeof payload.json === "string") return JSON.parse(payload.json);
  if (typeof payload.rawJson === "string") return JSON.parse(payload.rawJson);
  return payload;
}

function validateRaw(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    const error = new Error("Character import expects a JSON object.");
    error.status = 400;
    throw error;
  }
  const bytes = Buffer.byteLength(JSON.stringify(raw), "utf8");
  if (bytes > MAX_JSON_BYTES) {
    const error = new Error(`Character JSON is too large. Maximum size is ${Math.round(MAX_JSON_BYTES / 1024 / 1024)} MB.`);
    error.status = 413;
    throw error;
  }
  return bytes;
}

function abilityValue(source, key) {
  const value = source?.[key];
  if (typeof value === "number") return value;
  if (value && typeof value === "object") return num(value.value ?? value.mod ?? value.totalModifier, 0);
  return num(value, 0);
}

function pathbuilderFeatList(build = {}) {
  const feats = [];
  for (const key of ["feats", "classFeats", "ancestryFeats", "skillFeats", "generalFeats", "bonusFeats", "specials"]) {
    for (const item of asArray(build[key])) {
      if (!item) continue;
      if (typeof item === "string") feats.push({ name: item });
      else feats.push({ name: clean(item.name || item.feat || item.label || item.id), level: item.level || item.levelTaken || "", type: key });
    }
  }
  return feats.filter((feat) => feat.name);
}

function normalizeAttack(item = {}) {
  return {
    name: clean(item.name || item.weapon || item.label || "Attack"),
    bonus: clean(item.bonus ?? item.attack ?? item.totalModifier ?? ""),
    damage: clean(item.damage ?? item.damageDice ?? item.die ?? ""),
    traits: asArray(item.traits).map((trait) => clean(typeof trait === "string" ? trait : trait?.name)).filter(Boolean),
    actionCost: clean(item.actionCost ?? item.actions ?? "")
  };
}

function normalizeInventoryItem(item = {}) {
  if (typeof item === "string") return { name: item };
  return {
    name: clean(item.name || item.item || item.label || "Item"),
    quantity: num(item.quantity ?? item.qty, 1),
    bulk: clean(item.bulk ?? ""),
    level: item.level ?? ""
  };
}

function normalizePathbuilder(raw, { originalFilename = "" } = {}) {
  const warnings = [];
  const build = raw.build || raw.character || raw;
  if (!raw.build && !raw.character) warnings.push("Pathbuilder JSON wrapper was not detected; parser used root object as character build.");

  const abilities = build.abilities || build.attributes || build.stats || {};
  const defenses = build.defenses || {};
  const saves = build.saves || defenses.saves || {};
  const weapons = asArray(build.weapons || build.attacks).map(normalizeAttack).filter((item) => item.name);
  const armor = asArray(build.armor).map(normalizeInventoryItem).filter((item) => item.name);
  const equipment = asArray(build.equipment || build.items || build.gear).map(normalizeInventoryItem).filter((item) => item.name);
  const skills = asArray(build.skills).map((skill) => typeof skill === "string" ? { name: skill } : {
    name: clean(skill.name || skill.label || skill.id),
    rank: clean(skill.rank || skill.prof || skill.proficiency || ""),
    modifier: num(skill.modifier ?? skill.totalModifier ?? skill.bonus, 0)
  }).filter((skill) => skill.name);

  const normalized = {
    source: {
      type: "pathbuilder-json",
      importedAt: new Date().toISOString(),
      originalFilename,
      rawHash: hashRaw(raw),
      parserVersion: PARSER_VERSION,
      warnings
    },
    identity: {
      name: clean(build.name || build.characterName || raw.name || "Imported character", 240),
      ancestry: clean(build.ancestry || build.race || ""),
      heritage: clean(build.heritage || ""),
      background: clean(build.background || ""),
      className: clean(build.className || build.class || build.classId || ""),
      level: num(build.level, 1),
      alignment: clean(build.alignment || ""),
      deity: clean(build.deity || ""),
      languages: asArray(build.languages).map((item) => clean(item)).filter(Boolean)
    },
    visuals: { portraitAssetId: "", tokenAssetId: "", bannerAssetId: "", colorTheme: "", icon: "" },
    stats: {
      maxHp: num(build.maxHp ?? build.maxHP ?? build.hp ?? defenses.maxHp, 0),
      currentHp: num(build.currentHp ?? build.hp ?? defenses.hp, 0),
      tempHp: num(build.tempHp, 0),
      armorClass: num(build.acTotal ?? build.ac ?? defenses.ac, 10),
      speed: num(build.speed ?? build.speedTotal, 25),
      perception: num(build.perception ?? defenses.perception, 0),
      saves: {
        fortitude: num(saves.fortitude ?? saves.fort ?? defenses.fortitude, 0),
        reflex: num(saves.reflex ?? saves.ref ?? defenses.reflex, 0),
        will: num(saves.will ?? defenses.will, 0)
      },
      abilities: {
        str: abilityValue(abilities, "str"), dex: abilityValue(abilities, "dex"), con: abilityValue(abilities, "con"),
        int: abilityValue(abilities, "int"), wis: abilityValue(abilities, "wis"), cha: abilityValue(abilities, "cha")
      },
      skills
    },
    combat: {
      attacks: weapons,
      defenses: [],
      resistances: asArray(build.resistances).map(clean).filter(Boolean),
      weaknesses: asArray(build.weaknesses).map(clean).filter(Boolean),
      immunities: asArray(build.immunities).map(clean).filter(Boolean)
    },
    magic: {
      traditions: asArray(build.traditions).map(clean).filter(Boolean),
      spellcastingEntries: asArray(build.spellcasting || build.spellcastingEntries),
      focusPoints: num(build.focusPoints, 0),
      spells: asArray(build.spells).map((spell) => typeof spell === "string" ? { name: spell } : { name: clean(spell.name || spell.spell), level: spell.level ?? "" }).filter((spell) => spell.name)
    },
    progression: {
      feats: pathbuilderFeatList(build),
      classFeatures: asArray(build.classFeatures).map((item) => typeof item === "string" ? { name: item } : item),
      ancestryFeatures: asArray(build.ancestryFeatures).map((item) => typeof item === "string" ? { name: item } : item),
      skillIncreases: asArray(build.skillIncreases),
      boosts: asArray(build.boosts)
    },
    inventory: {
      weapons,
      armor,
      worn: equipment,
      consumables: asArray(build.consumables).map(normalizeInventoryItem).filter((item) => item.name),
      treasure: asArray(build.treasure).map(normalizeInventoryItem).filter((item) => item.name),
      bulk: clean(build.bulk || build.totalBulk || "")
    },
    text: { publicSummary: "", privateNotes: "", buildNotes: "", gmNotes: "" },
    links: { linkedEntryIds: [], personalQuestEntryIds: [], knownNpcIds: [], homeLocationId: "" },
    visibility: { visibleToParty: false, sharedWithGm: true },
    rawImport: raw
  };

  if (!normalized.identity.className) warnings.push("Class was not detected in Pathbuilder JSON.");
  if (!normalized.identity.ancestry) warnings.push("Ancestry was not detected in Pathbuilder JSON.");
  return normalized;
}

function foundrySystem(raw = {}) {
  return raw.system || raw.data?.data || raw.data || {};
}

function normalizeFoundryItem(item = {}) {
  const system = foundrySystem(item);
  return {
    name: clean(item.name || "Item"),
    type: clean(item.type || ""),
    level: system.level?.value ?? system.level ?? "",
    quantity: num(system.quantity, 1),
    traits: asArray(system.traits?.value || system.traits).map(clean).filter(Boolean)
  };
}

function normalizeFoundry(raw, { originalFilename = "" } = {}) {
  const warnings = [];
  const system = foundrySystem(raw);
  if (raw.type && raw.type !== "character") warnings.push(`Foundry actor type is ${raw.type}; parser still tried to normalize it as a character.`);
  if (!system || !Object.keys(system).length) warnings.push("Foundry system data was not detected.");

  const details = system.details || {};
  const attributes = system.attributes || {};
  const abilities = system.abilities || {};
  const saves = system.saves || {};
  const skillsObj = system.skills || {};
  const items = asArray(raw.items);
  const weaponItems = items.filter((item) => item.type === "weapon").map((item) => {
    const normalized = normalizeFoundryItem(item);
    const sys = foundrySystem(item);
    return { ...normalized, damage: clean(sys.damage?.dice || sys.damage?.die || ""), bonus: clean(sys.bonus?.value || "") };
  });
  const armorItems = items.filter((item) => item.type === "armor").map(normalizeFoundryItem);
  const spellItems = items.filter((item) => item.type === "spell").map(normalizeFoundryItem);
  const featItems = items.filter((item) => ["feat", "action"].includes(item.type)).map(normalizeFoundryItem);
  const equipmentItems = items.filter((item) => ["equipment", "backpack", "consumable", "treasure"].includes(item.type)).map(normalizeFoundryItem);

  return {
    source: {
      type: "foundry-pf2e-actor-json",
      importedAt: new Date().toISOString(),
      originalFilename,
      rawHash: hashRaw(raw),
      parserVersion: PARSER_VERSION,
      warnings
    },
    identity: {
      name: clean(raw.name || details.publication?.title || "Imported actor", 240),
      ancestry: clean(details.ancestry?.name || details.ancestry || ""),
      heritage: clean(details.heritage?.name || details.heritage || ""),
      background: clean(details.background?.name || details.background || ""),
      className: clean(details.class?.name || details.class || ""),
      level: num(details.level?.value ?? details.level, 1),
      alignment: clean(details.alignment?.value || details.alignment || ""),
      deity: clean(details.deity?.value || details.deity || ""),
      languages: asArray(details.languages?.value || details.languages).map(clean).filter(Boolean)
    },
    visuals: { portraitAssetId: "", tokenAssetId: "", bannerAssetId: "", colorTheme: "", icon: clean(raw.img || "") },
    stats: {
      maxHp: num(attributes.hp?.max, 0),
      currentHp: num(attributes.hp?.value, 0),
      tempHp: num(attributes.hp?.temp, 0),
      armorClass: num(attributes.ac?.value, 10),
      speed: num(attributes.speed?.value, 25),
      perception: num(system.perception?.mod ?? system.perception?.value, 0),
      saves: {
        fortitude: num(saves.fortitude?.value ?? saves.fortitude?.mod, 0),
        reflex: num(saves.reflex?.value ?? saves.reflex?.mod, 0),
        will: num(saves.will?.value ?? saves.will?.mod, 0)
      },
      abilities: {
        str: abilityValue(abilities, "str"), dex: abilityValue(abilities, "dex"), con: abilityValue(abilities, "con"),
        int: abilityValue(abilities, "int"), wis: abilityValue(abilities, "wis"), cha: abilityValue(abilities, "cha")
      },
      skills: Object.entries(skillsObj).map(([key, value]) => ({ name: key, rank: clean(value.rank || value.proficient || ""), modifier: num(value.value ?? value.mod, 0) }))
    },
    combat: { attacks: weaponItems, defenses: [], resistances: [], weaknesses: [], immunities: [] },
    magic: { traditions: [], spellcastingEntries: [], focusPoints: num(system.resources?.focus?.max, 0), spells: spellItems },
    progression: { feats: featItems, classFeatures: [], ancestryFeatures: [], skillIncreases: [], boosts: [] },
    inventory: { weapons: weaponItems, armor: armorItems, worn: equipmentItems, consumables: [], treasure: [], bulk: clean(attributes.bulk?.value || "") },
    text: { publicSummary: clean(details.biography?.public || ""), privateNotes: "", buildNotes: "", gmNotes: clean(details.biography?.gm || "") },
    links: { linkedEntryIds: [], personalQuestEntryIds: [], knownNpcIds: [], homeLocationId: "" },
    visibility: { visibleToParty: false, sharedWithGm: true },
    rawImport: raw
  };
}

export function normalizeManualCharacter(input = {}) {
  return {
    source: { type: "manual", importedAt: "", originalFilename: "", rawHash: "", parserVersion: PARSER_VERSION, warnings: [] },
    identity: {
      name: clean(input.name || input.identity?.name || "New character", 240),
      ancestry: clean(input.ancestry || input.identity?.ancestry || ""),
      heritage: clean(input.heritage || input.identity?.heritage || ""),
      background: clean(input.background || input.identity?.background || ""),
      className: clean(input.className || input.identity?.className || ""),
      level: num(input.level ?? input.identity?.level, 1),
      alignment: clean(input.alignment || input.identity?.alignment || ""),
      deity: clean(input.deity || input.identity?.deity || ""),
      languages: asArray(input.languages || input.identity?.languages).map(clean).filter(Boolean)
    },
    visuals: { portraitAssetId: "", tokenAssetId: "", bannerAssetId: "", colorTheme: "", icon: "", ...(input.visuals || {}) },
    stats: {
      maxHp: num(input.maxHp ?? input.defenses?.maxHp ?? input.stats?.maxHp, 10),
      currentHp: num(input.currentHp ?? input.defenses?.hp ?? input.stats?.currentHp, 10),
      tempHp: 0,
      armorClass: num(input.ac ?? input.defenses?.ac ?? input.stats?.armorClass, 10),
      speed: num(input.speed ?? input.stats?.speed, 25),
      perception: num(input.perception ?? input.defenses?.perception ?? input.stats?.perception, 0),
      saves: {
        fortitude: num(input.defenses?.fortitude ?? input.stats?.saves?.fortitude, 0),
        reflex: num(input.defenses?.reflex ?? input.stats?.saves?.reflex, 0),
        will: num(input.defenses?.will ?? input.stats?.saves?.will, 0)
      },
      abilities: {
        str: num(input.attributes?.str ?? input.stats?.abilities?.str, 10),
        dex: num(input.attributes?.dex ?? input.stats?.abilities?.dex, 10),
        con: num(input.attributes?.con ?? input.stats?.abilities?.con, 10),
        int: num(input.attributes?.int ?? input.stats?.abilities?.int, 10),
        wis: num(input.attributes?.wis ?? input.stats?.abilities?.wis, 10),
        cha: num(input.attributes?.cha ?? input.stats?.abilities?.cha, 10)
      },
      skills: asArray(input.skills || input.stats?.skills)
    },
    combat: { attacks: asArray(input.attacks || input.combat?.attacks), defenses: [], resistances: [], weaknesses: [], immunities: [] },
    magic: { traditions: [], spellcastingEntries: [], focusPoints: 0, spells: [] },
    progression: { feats: asArray(input.feats || input.progression?.feats), classFeatures: [], ancestryFeatures: [], skillIncreases: [], boosts: [] },
    inventory: { weapons: [], armor: [], worn: [], consumables: [], treasure: [], bulk: "", text: clean(input.inventoryText || input.inventory?.text || "") },
    text: {
      publicSummary: clean(input.publicSummary || input.text?.publicSummary || ""),
      privateNotes: clean(input.privateNotes || input.text?.privateNotes || ""),
      buildNotes: clean(input.buildNotes || input.text?.buildNotes || ""),
      gmNotes: clean(input.gmNotes || input.text?.gmNotes || "")
    },
    links: { linkedEntryIds: asArray(input.linkedEntryIds || input.linkedArticles || input.links?.linkedEntryIds).map(clean).filter(Boolean), personalQuestEntryIds: [], knownNpcIds: [], homeLocationId: "" },
    visibility: { visibleToParty: Boolean(input.isVisibleToParty || input.visibility?.visibleToParty), sharedWithGm: input.isSharedWithGm !== false && input.visibility?.sharedWithGm !== false },
    rawImport: {}
  };
}

export function parseCharacterImport({ adapter, payload, originalFilename = "" }) {
  let raw;
  try {
    raw = readJsonPayload(payload);
  } catch {
    const error = new Error("Character JSON could not be parsed.");
    error.status = 400;
    throw error;
  }
  const sizeBytes = validateRaw(raw);
  const normalized = adapter === "foundry-pf2e-actor-json"
    ? normalizeFoundry(raw, { originalFilename })
    : normalizePathbuilder(raw, { originalFilename });

  return {
    ok: true,
    adapter: normalized.source.type,
    parserVersion: PARSER_VERSION,
    sizeBytes,
    preview: {
      name: normalized.identity.name,
      level: normalized.identity.level,
      className: normalized.identity.className,
      ancestry: normalized.identity.ancestry,
      heritage: normalized.identity.heritage,
      warnings: normalized.source.warnings || []
    },
    character: normalized
  };
}
