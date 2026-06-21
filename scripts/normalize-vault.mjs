#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

const rootDir = process.cwd();
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const dryRun = !apply || args.includes("--dry-run");
const vaultArgIndex = args.findIndex((arg) => arg === "--vault" || arg === "-v");
const vaultDir = path.resolve(rootDir, vaultArgIndex >= 0 ? args[vaultArgIndex + 1] : "vault");
const backupDir = path.join(rootDir, `.codex-normalize-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`);

const categoryByType = {
  world: "worlds",
  country: "countries",
  city: "cities",
  location: "locations",
  npc: "npcs",
  enemy: "enemies",
  quest: "quests",
  session: "sessions",
  timelineEvent: "timeline",
  map: "maps",
  lore: "lore"
};

const typeByCategory = {
  worlds: "world",
  countries: "country",
  cities: "city",
  locations: "location",
  npcs: "npc",
  characters: "npc",
  enemies: "enemy",
  quests: "quest",
  sessions: "session",
  timeline: "timelineEvent",
  maps: "map"
};

const themeKeywords = [
  ["infernal", /(ад|адск|бездна|демон|infernal|hell|abyss|devil|demon|doom)/i],
  ["fire", /(огонь|огнен|пепел|лава|вулкан|кузн|дракон|fire|flame|ember|ash|lava|volcano)/i],
  ["frost", /(л[её]д|ледян|север|метель|снег|frost|ice|snow|glacier|winter)/i],
  ["arcane", /(маг|астрал|руна|портал|aether|arcane|magic|rune|astral|wizard)/i],
  ["celestial", /(рай|небес|свет|божеств|ангел|celestial|heaven|paradise|angel|divine)/i],
  ["death", /(смерт|мертв|некро|душ|могил|туман|death|dead|undead|necro|grave|soul|ghost)/i],
  ["midgard", /(лес|королев|город|земл|равнин|midgard|forest|kingdom|realm|earth|green)/i]
];

function normalizeVaultPath(value = "") {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function slugify(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function pathWithoutExtension(value = "") {
  return String(value || "").replace(/\.md$/i, "");
}

function pathBasename(value = "") {
  const clean = pathWithoutExtension(normalizeVaultPath(value));
  const parts = clean.split("/").filter(Boolean);
  return parts[parts.length - 1] || clean;
}

function titleFromPath(relativePath = "") {
  return pathBasename(relativePath)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function stripWorldWords(value = "") {
  return String(value || "")
    .replace(/^\s*(мир|world|setting|сеттинг|план|plane)\s+(.+)$/i, "$2")
    .replace(/^\s*(the\s+world\s+of|world\s+of)\s+(.+)$/i, "$2")
    .replace(/^\s*(мир|world|setting|сеттинг|план|plane)[\s:—-]+(.+)$/i, "$2")
    .replace(/^(.+?)[\s:—-]+(мир|world|setting|сеттинг|план|plane)\s*$/i, "$1")
    .trim();
}

function aliasKeys(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return [];
  const candidates = [
    raw,
    pathWithoutExtension(raw),
    pathBasename(raw),
    stripWorldWords(raw),
    stripWorldWords(pathWithoutExtension(raw)),
    stripWorldWords(pathBasename(raw))
  ];
  const slugs = new Set();
  for (const candidate of candidates) {
    const slug = slugify(candidate);
    if (!slug) continue;
    slugs.add(slug);
    const stripped = slug
      .replace(/^(мир|mir|world|setting|сеттинг|plan|plane)-+/i, "")
      .replace(/-+(мир|mir|world|setting|сеттинг|plan|plane)$/i, "");
    if (stripped) slugs.add(stripped);
  }
  return [...slugs];
}

function toArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (!value) return [];
  return String(value).split(/[;,\n]/).map((item) => item.trim()).filter(Boolean);
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function inferType(relativePath, fm = {}) {
  const category = String(fm.category || "").trim();
  const type = String(fm.type || "").trim();
  if (type) return type;
  if (typeByCategory[category]) return typeByCategory[category];
  const firstDir = normalizeVaultPath(relativePath).split("/")[0] || "";
  if (typeByCategory[firstDir]) return typeByCategory[firstDir];
  if (firstDir === "lore") return "lore";
  return "lore";
}

function inferCategory(relativePath, type, fm = {}) {
  if (fm.category) return fm.category;
  if (categoryByType[type]) return categoryByType[type];
  const parts = normalizeVaultPath(relativePath).split("/").filter(Boolean);
  if (parts[0] === "lore" && parts[1]) return parts.slice(0, 2).join("/");
  return parts.length > 1 ? parts[0] : "lore";
}

function inferTheme(entry) {
  const text = [
    entry.title,
    entry.fm.summary,
    entry.fm.tone,
    entry.fm.cosmology,
    toArray(entry.fm.tags).join(" "),
    entry.content
  ].filter(Boolean).join(" ");
  return themeKeywords.find(([, pattern]) => pattern.test(text))?.[0] || "midgard";
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (["node_modules", ".git", "_trash"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...await walk(full));
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) results.push(full);
  }
  return results;
}

function indexByAliases(entries) {
  const map = new Map();
  for (const entry of entries) {
    const values = [entry.title, entry.relativePath, entry.fm.slug, entry.fm.name, entry.fm.title, entry.fm.id];
    for (const value of values) {
      for (const key of aliasKeys(value)) {
        if (!map.has(key)) map.set(key, entry);
      }
    }
  }
  return map;
}

function canonicalTitle(value, aliasMap) {
  if (!value) return "";
  for (const key of aliasKeys(value)) {
    const entry = aliasMap.get(key);
    if (entry?.title) return entry.title;
  }
  return String(value).trim();
}

function shallowEqualJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizeFrontmatter(entry, maps) {
  const fm = { ...entry.fm };
  const changes = [];
  const set = (key, value) => {
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      if (Object.prototype.hasOwnProperty.call(fm, key)) {
        delete fm[key];
        changes.push(`removed ${key}`);
      }
      return;
    }
    if (!shallowEqualJson(fm[key], value)) {
      fm[key] = value;
      changes.push(`${key} -> ${Array.isArray(value) ? `[${value.join(", ")}]` : value}`);
    }
  };

  set("title", entry.title);
  set("name", entry.title);
  set("type", entry.type);
  set("category", entry.category);
  set("visibility", fm.visibility || "public");

  if (fm.tags !== undefined) set("tags", unique(toArray(fm.tags)));
  if (fm.related !== undefined) set("related", unique(toArray(fm.related).map((item) => canonicalTitle(item, maps.all))));

  if (entry.type === "world") {
    set("world", "");
    set("country", "");
    set("city", "");
    set("theme", fm.theme || inferTheme(entry));
    return { frontmatter: fm, changes };
  }

  let world = canonicalTitle(fm.world || fm.setting || fm.realm || fm.plane, maps.worlds);
  let country = canonicalTitle(fm.country, maps.countries);
  let city = canonicalTitle(fm.city, maps.cities);

  const countryEntry = country ? maps.countriesByTitle.get(country) : null;
  const cityEntry = city ? maps.citiesByTitle.get(city) : null;

  if (!world && cityEntry?.normalizedWorld) world = cityEntry.normalizedWorld;
  if (!country && cityEntry?.normalizedCountry) country = cityEntry.normalizedCountry;
  if (!world && countryEntry?.normalizedWorld) world = countryEntry.normalizedWorld;

  if (entry.type === "country") {
    set("world", world);
    set("country", "");
    set("city", "");
    return { frontmatter: fm, changes };
  }

  if (entry.type === "city") {
    set("world", world);
    set("country", country);
    set("city", "");
    return { frontmatter: fm, changes };
  }

  set("world", world);
  set("country", country);
  set("city", city);
  return { frontmatter: fm, changes };
}

async function main() {
  try {
    await fs.access(vaultDir);
  } catch {
    console.error(`Vault folder not found: ${vaultDir}`);
    console.error("Start the app once to create ./vault, or pass a path: npm run vault:normalize -- --vault C:/path/to/vault --dry-run");
    process.exit(1);
  }

  const files = await walk(vaultDir);
  const entries = [];

  for (const fullPath of files) {
    const raw = await fs.readFile(fullPath, "utf8");
    const parsed = matter(raw);
    const relativePath = normalizeVaultPath(path.relative(vaultDir, fullPath));
    const fm = parsed.data || {};
    const title = String(fm.title || fm.name || titleFromPath(relativePath)).trim();
    const type = inferType(relativePath, fm);
    const category = inferCategory(relativePath, type, fm);
    entries.push({ fullPath, relativePath, raw, fm, content: parsed.content || "", title, type, category });
  }

  const worlds = entries.filter((entry) => entry.type === "world" || entry.category === "worlds");
  const countries = entries.filter((entry) => entry.type === "country" || entry.category === "countries");
  const cities = entries.filter((entry) => entry.type === "city" || entry.category === "cities");

  const maps = {
    all: indexByAliases(entries),
    worlds: indexByAliases(worlds),
    countries: indexByAliases(countries),
    cities: indexByAliases(cities),
    countriesByTitle: new Map(),
    citiesByTitle: new Map()
  };

  for (const country of countries) {
    country.normalizedWorld = canonicalTitle(country.fm.world || country.fm.setting || country.fm.realm || country.fm.plane, maps.worlds);
    maps.countriesByTitle.set(country.title, country);
  }
  for (const city of cities) {
    city.normalizedCountry = canonicalTitle(city.fm.country, maps.countries);
    const countryEntry = city.normalizedCountry ? maps.countriesByTitle.get(city.normalizedCountry) : null;
    city.normalizedWorld = canonicalTitle(city.fm.world, maps.worlds) || countryEntry?.normalizedWorld || "";
    maps.citiesByTitle.set(city.title, city);
  }

  const changed = [];
  for (const entry of entries) {
    const result = normalizeFrontmatter(entry, maps);
    if (!result.changes.length) continue;
    changed.push({ entry, ...result });
  }

  console.log(`Vault: ${vaultDir}`);
  console.log(`${dryRun ? "DRY RUN" : "APPLY"}: ${changed.length} file(s) would change.`);
  for (const item of changed) {
    console.log(`\n- ${item.entry.relativePath}`);
    for (const change of item.changes) console.log(`  • ${change}`);
  }

  if (dryRun) {
    console.log("\nNo files were changed. Run `npm run vault:normalize -- --apply` to write changes with backup.");
    return;
  }

  await fs.mkdir(backupDir, { recursive: true });
  for (const item of changed) {
    const backupPath = path.join(backupDir, item.entry.relativePath);
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, item.entry.raw, "utf8");
    const nextRaw = matter.stringify(item.entry.content.trim() + "\n", item.frontmatter);
    await fs.writeFile(item.entry.fullPath, nextRaw.endsWith("\n") ? nextRaw : `${nextRaw}\n`, "utf8");
  }
  console.log(`\nChanged files written. Backup: ${backupDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
