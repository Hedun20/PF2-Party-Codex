const localOptions = {
  meta: {
    source: "local-seed",
    sourceLabel: "PF2e local builder seed",
    note: "Fallback data used when the external PF2e data adapter is unavailable."
  },
  ancestries: [
    { id: "human", name: "Human", hp: 8, boosts: ["free", "free"], flaws: [] },
    { id: "elf", name: "Elf", hp: 6, boosts: ["dex", "int", "free"], flaws: ["con"] },
    { id: "dwarf", name: "Dwarf", hp: 10, boosts: ["con", "wis", "free"], flaws: ["cha"] },
    { id: "gnome", name: "Gnome", hp: 8, boosts: ["con", "cha", "free"], flaws: ["str"] },
    { id: "goblin", name: "Goblin", hp: 6, boosts: ["dex", "cha", "free"], flaws: ["wis"] },
    { id: "halfling", name: "Halfling", hp: 6, boosts: ["dex", "wis", "free"], flaws: ["str"] },
    { id: "leshy", name: "Leshy", hp: 8, boosts: ["con", "wis", "free"], flaws: ["int"] },
    { id: "orc", name: "Orc", hp: 10, boosts: ["str", "free"], flaws: [] }
  ],
  heritages: [
    { id: "versatile-human", ancestry: "human", name: "Versatile Human" },
    { id: "skilled-human", ancestry: "human", name: "Skilled Human" },
    { id: "ancient-elf", ancestry: "elf", name: "Ancient Elf" },
    { id: "cavern-elf", ancestry: "elf", name: "Cavern Elf" },
    { id: "rock-dwarf", ancestry: "dwarf", name: "Rock Dwarf" },
    { id: "strong-blooded-dwarf", ancestry: "dwarf", name: "Strong-Blooded Dwarf" },
    { id: "fey-touched-gnome", ancestry: "gnome", name: "Fey-Touched Gnome" },
    { id: "charhide-goblin", ancestry: "goblin", name: "Charhide Goblin" },
    { id: "gutsy-halfling", ancestry: "halfling", name: "Gutsy Halfling" },
    { id: "leaf-leshy", ancestry: "leshy", name: "Leaf Leshy" },
    { id: "hold-scarred-orc", ancestry: "orc", name: "Hold-Scarred Orc" }
  ],
  backgrounds: [
    { id: "acolyte", name: "Acolyte", skills: ["religion"], boosts: ["int", "wis", "free"] },
    { id: "artisan", name: "Artisan", skills: ["crafting"], boosts: ["str", "int", "free"] },
    { id: "criminal", name: "Criminal", skills: ["stealth"], boosts: ["dex", "int", "free"] },
    { id: "detective", name: "Detective", skills: ["society"], boosts: ["int", "wis", "free"] },
    { id: "field-medic", name: "Field Medic", skills: ["medicine"], boosts: ["con", "wis", "free"] },
    { id: "guard", name: "Guard", skills: ["intimidation"], boosts: ["str", "cha", "free"] },
    { id: "merchant", name: "Merchant", skills: ["diplomacy"], boosts: ["int", "cha", "free"] },
    { id: "noble", name: "Noble", skills: ["society"], boosts: ["int", "cha", "free"] },
    { id: "sailor", name: "Sailor", skills: ["athletics"], boosts: ["str", "dex", "free"] },
    { id: "scholar", name: "Scholar", skills: ["arcana"], boosts: ["int", "wis", "free"] }
  ],
  classes: [
    { id: "alchemist", name: "Alchemist", keyAbility: ["int"], hp: 8, tradition: "prepared items" },
    { id: "barbarian", name: "Barbarian", keyAbility: ["str"], hp: 12, tradition: "martial" },
    { id: "bard", name: "Bard", keyAbility: ["cha"], hp: 8, tradition: "occult" },
    { id: "champion", name: "Champion", keyAbility: ["str", "dex"], hp: 10, tradition: "divine martial" },
    { id: "cleric", name: "Cleric", keyAbility: ["wis"], hp: 8, tradition: "divine" },
    { id: "druid", name: "Druid", keyAbility: ["wis"], hp: 8, tradition: "primal" },
    { id: "fighter", name: "Fighter", keyAbility: ["str", "dex"], hp: 10, tradition: "martial" },
    { id: "investigator", name: "Investigator", keyAbility: ["int"], hp: 8, tradition: "skill" },
    { id: "kineticist", name: "Kineticist", keyAbility: ["con"], hp: 8, tradition: "elemental" },
    { id: "magus", name: "Magus", keyAbility: ["str", "dex"], hp: 8, tradition: "arcane martial" },
    { id: "monk", name: "Monk", keyAbility: ["str", "dex"], hp: 10, tradition: "martial" },
    { id: "oracle", name: "Oracle", keyAbility: ["cha"], hp: 8, tradition: "divine" },
    { id: "psychic", name: "Psychic", keyAbility: ["int", "cha"], hp: 6, tradition: "occult" },
    { id: "ranger", name: "Ranger", keyAbility: ["str", "dex"], hp: 10, tradition: "martial" },
    { id: "rogue", name: "Rogue", keyAbility: ["dex", "other"], hp: 8, tradition: "skill" },
    { id: "sorcerer", name: "Sorcerer", keyAbility: ["cha"], hp: 6, tradition: "spellcaster" },
    { id: "swashbuckler", name: "Swashbuckler", keyAbility: ["dex"], hp: 10, tradition: "martial" },
    { id: "thaumaturge", name: "Thaumaturge", keyAbility: ["cha"], hp: 8, tradition: "esoterica" },
    { id: "witch", name: "Witch", keyAbility: ["int"], hp: 6, tradition: "patron spellcaster" },
    { id: "wizard", name: "Wizard", keyAbility: ["int"], hp: 6, tradition: "arcane" }
  ],
  skills: [
    "acrobatics", "arcana", "athletics", "crafting", "deception", "diplomacy", "intimidation", "medicine", "nature", "occultism", "performance", "religion", "society", "stealth", "survival", "thievery"
  ].map((id) => ({ id, name: id.replace(/(^|-)\w/g, (m) => m.toUpperCase()) })),
  feats: [
    { id: "diehard", name: "Diehard", type: "general", level: 1 },
    { id: "fleet", name: "Fleet", type: "general", level: 1 },
    { id: "toughness", name: "Toughness", type: "general", level: 1 },
    { id: "battle-medicine", name: "Battle Medicine", type: "skill", level: 1, skill: "medicine" },
    { id: "cat-fall", name: "Cat Fall", type: "skill", level: 1, skill: "acrobatics" },
    { id: "quick-jump", name: "Quick Jump", type: "skill", level: 1, skill: "athletics" },
    { id: "assurance", name: "Assurance", type: "skill", level: 1 },
    { id: "natural-ambition", name: "Natural Ambition", type: "ancestry", level: 1, ancestry: "human" },
    { id: "nimble-elf", name: "Nimble Elf", type: "ancestry", level: 1, ancestry: "elf" },
    { id: "unburdened-iron", name: "Unburdened Iron", type: "ancestry", level: 1, ancestry: "dwarf" }
  ],
  alignments: ["LG", "NG", "CG", "LN", "N", "CN", "LE", "NE", "CE"].map((id) => ({ id, name: id })),
  attributeOptions: [8, 10, 12, 14, 16, 18],
  levels: Array.from({ length: 20 }, (_, index) => index + 1)
};

const FOUNDRY_BRANCHES = ["master", "v14-dev", "main"];
const FOUNDRY_DIRS = {
  classes: "packs/classes",
  ancestries: "packs/ancestries",
  heritages: "packs/heritages",
  backgrounds: "packs/backgrounds",
  feats: "packs/feats"
};
const MAX_REMOTE_FEATS = Number(process.env.PF2_REMOTE_FEAT_LIMIT || 240);
const CACHE_MS = 6 * 60 * 60 * 1000;
let foundryCache = null;
const foundryTreeCache = new Map();

function slug(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function timeoutSignal(ms = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

async function fetchJson(url, timeout = 12000) {
  const { signal, done } = timeoutSignal(timeout);
  try {
    const response = await fetch(url, {
      signal,
      headers: { "Accept": "application/vnd.github+json, application/json", "User-Agent": "pf2-party-codex-local" }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json();
  } finally {
    done();
  }
}

async function fetchTree(branch) {
  if (foundryTreeCache.has(branch)) return foundryTreeCache.get(branch);
  const url = `https://api.github.com/repos/foundryvtt/pf2e/git/trees/${branch}?recursive=1`;
  const data = await fetchJson(url, 16000);
  const tree = Array.isArray(data.tree) ? data.tree : [];
  foundryTreeCache.set(branch, tree);
  return tree;
}

async function fetchDirectory(branch, dir, limit = Infinity) {
  const tree = await fetchTree(branch);
  return tree
    .filter((item) => item.type === "blob")
    .filter((item) => item.path.startsWith(`${dir}/`))
    .filter((item) => item.path.endsWith(".json") && !item.path.endsWith("/_folders.json"))
    .slice(0, limit)
    .map((item) => ({
      name: item.path.split("/").pop(),
      path: item.path,
      download_url: `https://raw.githubusercontent.com/foundryvtt/pf2e/${branch}/${item.path}`
    }));
}

function firstNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizePackItem(doc, pack) {
  const system = doc.system || {};
  const name = doc.name || system.name || doc.title;
  const id = slug(doc._id || doc.slug || system.slug || name);
  if (!id || !name) return null;

  const base = {
    id,
    name,
    sourceId: doc._id || id,
    pack,
    level: firstNumber(system.level?.value, system.level, doc.level) || 1,
    type: doc.type || system.featType?.value || pack.replace(/s$/, "")
  };

  if (pack === "classes") {
    return {
      ...base,
      hp: firstNumber(system.hp, system.hp?.value, system.hitPoints, system.hitPoints?.value),
      keyAbility: Object.keys(system.keyAbility?.value || system.keyAbility || {}).length
        ? Object.keys(system.keyAbility?.value || system.keyAbility || {})
        : [],
      tradition: system.tradition?.value || system.tradition || ""
    };
  }

  if (pack === "ancestries") {
    return {
      ...base,
      hp: firstNumber(system.hp, system.hp?.value, system.hitPoints, system.hitPoints?.value),
      boosts: system.boosts || system.abilityBoosts || [],
      flaws: system.flaws || system.abilityFlaws || []
    };
  }

  if (pack === "heritages") {
    return {
      ...base,
      ancestry: slug(system.ancestry?.slug || system.ancestry?.name || system.ancestry?.value || doc.ancestry || "")
    };
  }

  if (pack === "backgrounds") {
    return {
      ...base,
      skills: Object.keys(system.trainedSkills?.value || system.trainedSkills || {}).map(slug),
      boosts: system.boosts || system.abilityBoosts || []
    };
  }

  if (pack === "feats") {
    return {
      ...base,
      type: system.category || system.featType?.value || doc.type || "feat",
      skill: slug(system.skill || system.skill?.value || ""),
      ancestry: slug(system.ancestry?.slug || system.ancestry?.name || "")
    };
  }

  return base;
}

async function fetchPack(branch, pack, limit = Infinity) {
  const files = await fetchDirectory(branch, FOUNDRY_DIRS[pack], limit);
  const chosen = files.slice(0, limit);
  const docs = await Promise.allSettled(chosen.map((item) => fetchJson(item.download_url, 12000)));
  return docs
    .filter((result) => result.status === "fulfilled")
    .map((result) => normalizePackItem(result.value, pack))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function mergeOptions(remote, branch) {
  return {
    ...localOptions,
    ...remote,
    skills: localOptions.skills,
    alignments: localOptions.alignments,
    attributeOptions: localOptions.attributeOptions,
    levels: localOptions.levels,
    meta: {
      source: "foundry-pf2e",
      sourceLabel: `Foundry PF2e packs (${branch})`,
      repository: "https://github.com/foundryvtt/pf2e",
      cachedAt: new Date().toISOString(),
      fallback: false
    }
  };
}

async function fetchFoundryOptions() {
  if (foundryCache && Date.now() - foundryCache.cachedAt < CACHE_MS) return foundryCache.data;

  let lastError = null;
  for (const branch of FOUNDRY_BRANCHES) {
    try {
      const [classes, ancestries, heritages, backgrounds, feats] = await Promise.all([
        fetchPack(branch, "classes"),
        fetchPack(branch, "ancestries"),
        fetchPack(branch, "heritages"),
        fetchPack(branch, "backgrounds"),
        fetchPack(branch, "feats", MAX_REMOTE_FEATS)
      ]);

      if (!classes.length || !ancestries.length || !backgrounds.length) {
        throw new Error("Foundry packs returned incomplete builder data.");
      }

      const data = mergeOptions({ classes, ancestries, heritages, backgrounds, feats }, branch);
      foundryCache = { cachedAt: Date.now(), data };
      return data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Foundry PF2e data source is unavailable.");
}

export async function getPf2Options({ source = process.env.PF2_DATA_SOURCE || "auto" } = {}) {
  if (source === "local") return localOptions;
  if (source === "foundry" || source === "auto") {
    try {
      return await fetchFoundryOptions();
    } catch (error) {
      if (source === "foundry") throw error;
      return {
        ...localOptions,
        meta: {
          ...localOptions.meta,
          source: "local-seed",
          sourceLabel: "PF2e local builder seed (Foundry unavailable)",
          fallback: true,
          error: error.message
        }
      };
    }
  }
  return localOptions;
}
