import { isWorldPage, pageAliasSlugs, slugifyWorld, worldAliasSlugs } from "./worldContext.js";

export function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

export function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (!value) return [];
  return String(value).split(/[;,\n]/).map((item) => item.trim()).filter(Boolean);
}

export function sortPagesByTitle(pages = []) {
  return [...pages].sort((a, b) => String(a?.title || "").localeCompare(String(b?.title || ""), "ru"));
}

export function getWorldPages(pages = []) {
  return sortPagesByTitle(pages.filter(isWorldPage));
}

export function getCountryPages(pages = []) {
  return sortPagesByTitle(pages.filter((page) => page?.type === "country" || page?.category === "countries"));
}

export function getCityPages(pages = []) {
  return sortPagesByTitle(pages.filter((page) => page?.type === "city" || page?.category === "cities"));
}

export function pageMatchesValue(page, value) {
  const target = slugifyWorld(value);
  if (!target || !page) return false;
  return pageAliasSlugs(page).has(target);
}

export function worldMatchesValue(world, value) {
  const target = slugifyWorld(value);
  if (!target || !world) return false;
  return worldAliasSlugs(world).has(target);
}

export function findWorldByValue(pages = [], value = "") {
  if (!value) return null;
  return getWorldPages(pages).find((world) => worldMatchesValue(world, value)) || null;
}

export function findCountryByValue(pages = [], value = "") {
  if (!value) return null;
  return getCountryPages(pages).find((country) => pageMatchesValue(country, value)) || null;
}

function valuesFromPage(page, keys = []) {
  const values = [];
  for (const key of keys) {
    values.push(...asArray(page?.[key]));
    values.push(...asArray(page?.frontmatter?.[key]));
  }
  return values;
}

export function pageBelongsToWorldValue(page, worldValue, allPages = []) {
  if (!worldValue) return true;
  const world = findWorldByValue(allPages, worldValue) || { title: worldValue };
  const values = valuesFromPage(page, ["world", "worlds", "setting", "settings", "realm", "realms", "plane", "planes", "parent"]);
  return values.some((value) => worldMatchesValue(world, value));
}

export function pageBelongsToCountryValue(page, countryValue, allPages = []) {
  if (!countryValue) return true;
  const country = findCountryByValue(allPages, countryValue) || { title: countryValue };
  const values = valuesFromPage(page, ["country", "countries", "parent"]);
  return values.some((value) => pageMatchesValue(country, value));
}

export function countriesForWorld(pages = [], worldValue = "") {
  const countries = getCountryPages(pages);
  if (!worldValue) return countries;
  return countries.filter((country) => pageBelongsToWorldValue(country, worldValue, pages));
}

export function citiesForContext(pages = [], { world = "", country = "" } = {}) {
  let cities = getCityPages(pages);
  if (country) {
    cities = cities.filter((city) => pageBelongsToCountryValue(city, country, pages));
  } else if (world) {
    cities = cities.filter((city) => pageBelongsToWorldValue(city, world, pages));
  }
  return cities;
}

export function tagOptionsFromPages(pages = [], selectedTags = []) {
  const fromPages = pages.flatMap((page) => asArray(page?.tags || page?.frontmatter?.tags));
  return uniqueValues([...fromPages, ...asArray(selectedTags)]).sort((a, b) => a.localeCompare(b, "ru"));
}

export function relationOptionsFromPages(pages = [], currentPath = "") {
  return sortPagesByTitle(pages.filter((page) => page?.path && page.path !== currentPath));
}
