export function slugifyWorld(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function truthyMeta(value) {
  if (value === true) return true;
  return /^(true|yes|1|deleted|archived)$/i.test(String(value || "").trim());
}

export function isWorldPage(page) {
  const path = String(page?.path || "");
  if (!page || path.startsWith("_trash/") || path.startsWith("_examples/") || path.startsWith("_templates/")) return false;
  if (truthyMeta(page.frontmatter?.deleted) || truthyMeta(page.frontmatter?.archived) || truthyMeta(page.deleted) || truthyMeta(page.archived)) return false;
  return page.category === "worlds" || page.type === "world";
}

export function getWorlds(pages = []) {
  const seen = new Set();
  return pages.filter(isWorldPage).filter((world) => {
    const key = slugifyWorld(world.frontmatter?.slug || world.slug || world.title || world.path);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function arrayValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return [String(value)];
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function pathWithoutExtension(value = "") {
  return String(value || "").replace(/\.md$/i, "");
}

function pathBasename(value = "") {
  const clean = pathWithoutExtension(value);
  const parts = clean.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || clean;
}

function stripWorldWords(value = "") {
  return String(value || "")
    .replace(/^\s*(мир|world|setting|сеттинг|план|plane)\s+(.+)$/i, "$2")
    .replace(/^\s*(the\s+world\s+of|world\s+of)\s+(.+)$/i, "$2")
    .replace(/^\s*(мир|world|setting|сеттинг|план|plane)[\s:—-]+(.+)$/i, "$2")
    .replace(/^(.+?)[\s:—-]+(мир|world|setting|сеттинг|план|plane)\s*$/i, "$1")
    .trim();
}

function addSlugAliases(set, value) {
  const raw = String(value || "").trim();
  if (!raw) return;

  const candidates = unique([
    raw,
    pathWithoutExtension(raw),
    pathBasename(raw),
    stripWorldWords(raw),
    stripWorldWords(pathWithoutExtension(raw)),
    stripWorldWords(pathBasename(raw))
  ]);

  for (const candidate of candidates) {
    const slug = slugifyWorld(candidate);
    if (!slug) continue;
    set.add(slug);

    const strippedSlug = slug
      .replace(/^(мир|mir|world|setting|сеттинг|plan|plane)-+/i, "")
      .replace(/-+(мир|mir|world|setting|сеттинг|plan|plane)$/i, "");
    if (strippedSlug && strippedSlug !== slug) set.add(strippedSlug);
  }
}

export function pageAliasSlugs(page) {
  const aliases = new Set();
  if (!page) return aliases;

  [
    page.title,
    page.path,
    pathWithoutExtension(page.path),
    pathBasename(page.path),
    page.slug,
    page.frontmatter?.slug,
    page.frontmatter?.name,
    page.frontmatter?.title,
    page.frontmatter?.id
  ].forEach((value) => addSlugAliases(aliases, value));

  return aliases;
}

export function worldAliasSlugs(world) {
  return pageAliasSlugs(world);
}

export function worldSlug(page) {
  const preferred = page?.frontmatter?.slug || page?.slug || page?.title || page?.path || "world";
  return slugifyWorld(preferred) || [...worldAliasSlugs(page)][0] || "world";
}

export function worldRoute(page) {
  return `/world/${encodeURIComponent(worldSlug(page))}`;
}

export function resolveWorldBySlug(pages = [], slug = "") {
  const wanted = slugifyWorld(decodeURIComponent(slug || ""));
  if (!wanted) return null;
  return getWorlds(pages).find((world) => worldAliasSlugs(world).has(wanted)) || null;
}

function valuesFromPage(page, keys = []) {
  const values = [];
  for (const key of keys) {
    values.push(...arrayValue(page?.[key]));
    values.push(...arrayValue(page?.frontmatter?.[key]));
  }
  return values;
}

function matchesWorldValue(value, world) {
  const target = slugifyWorld(value);
  if (!target || !world) return false;
  return worldAliasSlugs(world).has(target);
}

function matchesPageValue(value, page) {
  const target = slugifyWorld(value);
  if (!target || !page) return false;
  return pageAliasSlugs(page).has(target);
}

const DIRECT_WORLD_KEYS = [
  "world",
  "worlds",
  "setting",
  "settings",
  "realm",
  "realms",
  "plane",
  "planes"
];

const RELATION_KEYS = [
  "parent",
  "country",
  "countries",
  "city",
  "cities",
  "location",
  "locations",
  "region",
  "regions",
  "area",
  "areas",
  "mapFor",
  "related",
  "relatedPages"
];

function directlyBelongsToWorld(page, world) {
  if (!page || !world) return false;
  if (page.path === world.path) return true;

  const directValues = [
    ...valuesFromPage(page, DIRECT_WORLD_KEYS),
    ...valuesFromPage(page, ["parent"])
  ];

  return directValues.some((value) => matchesWorldValue(value, world));
}

function referencesOwnedPage(page, ownedPages = []) {
  const relationValues = valuesFromPage(page, RELATION_KEYS);
  if (!relationValues.length) return false;
  return ownedPages.some((owned) => relationValues.some((value) => matchesPageValue(value, owned)));
}

function hasContextMetadata(page) {
  return valuesFromPage(page, [...DIRECT_WORLD_KEYS, ...RELATION_KEYS]).length > 0;
}

export function belongsToWorld(page, world, pages = null) {
  if (!page || !world) return false;
  if (directlyBelongsToWorld(page, world)) return true;
  if (!Array.isArray(pages)) return false;
  return getWorldOwnedPages(pages, world).some((owned) => owned.path === page.path);
}

export function isSharedArchivePage(page) {
  if (!page || isWorldPage(page)) return false;
  return !hasContextMetadata(page);
}

export function getWorldOwnedPages(pages = [], world) {
  if (!world) return [];

  const owned = new Map();
  const addOwned = (page) => {
    if (page?.path && !owned.has(page.path)) {
      owned.set(page.path, page);
      return true;
    }
    return false;
  };

  for (const page of pages) {
    if (directlyBelongsToWorld(page, world)) addOwned(page);
  }

  let changed = true;
  while (changed) {
    changed = false;
    const ownedPages = [...owned.values()];
    for (const page of pages) {
      if (owned.has(page.path)) continue;
      if (referencesOwnedPage(page, ownedPages)) {
        changed = addOwned(page) || changed;
      }
    }
  }

  return [...owned.values()];
}

export function getSharedArchivePages(pages = []) {
  return pages.filter(isSharedArchivePage);
}

export function resolveWorldForPage(pages = [], pathOrPage = "") {
  if (!Array.isArray(pages) || !pathOrPage) return null;

  const page = typeof pathOrPage === "string"
    ? pages.find((item) => item.path === pathOrPage || item.title === pathOrPage || slugifyWorld(item.path) === slugifyWorld(pathOrPage) || slugifyWorld(item.title) === slugifyWorld(pathOrPage))
    : pathOrPage;

  if (!page) return null;
  if (isWorldPage(page)) return page;

  return getWorlds(pages).find((world) => getWorldOwnedPages(pages, world).some((owned) => owned.path === page.path)) || null;
}

export function getWorldSearchPages(pages = [], world) {
  if (!world) return pages;
  const owned = getWorldOwnedPages(pages, world);
  const shared = getSharedArchivePages(pages);
  const seen = new Set();
  return [...owned, ...shared].filter((page) => {
    if (seen.has(page.path)) return false;
    seen.add(page.path);
    return true;
  });
}

export function worldLabel(world) {
  return world?.title || "Архив";
}
