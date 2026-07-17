import { matchPath } from "react-router-dom";

function route(id, pattern, options = {}) {
  return Object.freeze({ id, pattern, scope: "campaign", access: "member", title: id, ...options });
}

export const APP_ROUTES = Object.freeze({
  entry: route("entry", "/", { scope: "system", access: "public", title: "Party Codex", icon: "home", parent: null }),
  login: route("login", "/login", { scope: "public", access: "public", title: "Вход", icon: "login", parent: null }),
  invitation: route("invitation", "/invite/:token", { scope: "public", access: "public", title: "Приглашение", icon: "invitation", parent: "login" }),
  help: route("help", "/help", { scope: "public", access: "public", title: "Справка", icon: "help", parent: null }),

  campaignSelect: route("campaignSelect", "/app/campaigns", { scope: "account", access: "account", title: "Кампании", icon: "campaigns", parent: null, navGroup: "account" }),
  accountProfile: route("accountProfile", "/app/account/profile", { scope: "account", access: "account", title: "Профиль", icon: "profile", parent: "campaignSelect", navGroup: "account" }),
  accountSettings: route("accountSettings", "/app/account/settings", { scope: "account", access: "account", title: "Настройки аккаунта", icon: "settings", parent: "accountProfile", navGroup: "account" }),

  campaignHome: route("campaignHome", "/app/campaigns/:campaignId/home", { title: "Главная кампании", icon: "home", parent: null, navGroup: "campaign" }),
  archive: route("archive", "/app/campaigns/:campaignId/archive", { title: "Архив кампании", icon: "archive", parent: "campaignHome", navGroup: "campaign" }),
  archiveWorld: route("archiveWorld", "/app/campaigns/:campaignId/archive/worlds/:worldSlug", { title: "Мир", icon: "world", parent: "archive" }),
  archiveCategory: route("archiveCategory", "/app/campaigns/:campaignId/archive/:category/*", { title: "Раздел архива", icon: "archive", parent: "archive" }),
  archiveMaps: route("archiveMaps", "/app/campaigns/:campaignId/archive/maps", { title: "Карты", icon: "maps", parent: "archive", navGroup: "archive" }),
  archiveTimeline: route("archiveTimeline", "/app/campaigns/:campaignId/archive/timeline", { title: "Хронология", icon: "timeline", parent: "archive", navGroup: "archive" }),
  archiveHandouts: route("archiveHandouts", "/app/campaigns/:campaignId/archive/handouts", { title: "Материалы", icon: "handouts", parent: "archive", navGroup: "archive" }),
  archiveEntry: route("archiveEntry", "/app/campaigns/:campaignId/archive/entries/:path", { title: "Статья", icon: "entry", parent: "archive" }),
  archiveEntryNew: route("archiveEntryNew", "/app/campaigns/:campaignId/archive/entries/new", { access: "manager", title: "Новая статья", icon: "create", parent: "archive" }),
  archiveEntryEdit: route("archiveEntryEdit", "/app/campaigns/:campaignId/archive/entries/:path/edit", { access: "manager", title: "Редактирование статьи", icon: "edit", parent: "archive" }),

  session: route("session", "/app/campaigns/:campaignId/session", { title: "Игровой стол", icon: "session", parent: "campaignHome", navGroup: "session" }),
  sessionDice: route("sessionDice", "/app/campaigns/:campaignId/session/dice", { title: "Кубики", icon: "dice", parent: "session" }),
  notes: route("notes", "/app/campaigns/:campaignId/notes", { title: "Заметки", icon: "notes", parent: "campaignHome", navGroup: "campaign" }),
  myCharacter: route("myCharacter", "/app/campaigns/:campaignId/my-character", { title: "Мой персонаж", icon: "character", parent: "campaignHome", navGroup: "campaign" }),

  manageSessions: route("manageSessions", "/app/campaigns/:campaignId/manage/sessions", { access: "manager", title: "Управление сессиями", icon: "sessions", parent: "campaignHome", navGroup: "management" }),
  managePlayers: route("managePlayers", "/app/campaigns/:campaignId/manage/players", { access: "manager", title: "Игроки и приглашения", icon: "players", parent: "campaignHome", navGroup: "management" }),
  manageCharacters: route("manageCharacters", "/app/campaigns/:campaignId/manage/characters", { access: "manager", title: "Персонажи кампании", icon: "characters", parent: "campaignHome", navGroup: "management" }),
  manageImports: route("manageImports", "/app/campaigns/:campaignId/manage/imports", { access: "manager", title: "Импорт и экспорт", icon: "imports", parent: "campaignHome", navGroup: "management" }),
  manageArchiveHealth: route("manageArchiveHealth", "/app/campaigns/:campaignId/manage/archive-health", { access: "manager", title: "Состояние архива", icon: "health", parent: "campaignHome", navGroup: "management" }),
  manageMissingLinks: route("manageMissingLinks", "/app/campaigns/:campaignId/manage/archive-health/missing-links", { access: "manager", title: "Отсутствующие связи", icon: "missing", parent: "manageArchiveHealth" }),
  manageVisibility: route("manageVisibility", "/app/campaigns/:campaignId/manage/visibility", { access: "manager", title: "Видимость для игроков", icon: "visibility", parent: "campaignHome", navGroup: "management" }),
  manageTools: route("manageTools", "/app/campaigns/:campaignId/manage/tools", { access: "manager", title: "Инструменты GM", icon: "tools", parent: "campaignHome", navGroup: "management" }),
  manageSettings: route("manageSettings", "/app/campaigns/:campaignId/manage/settings", { access: "manager", title: "Настройки кампании", icon: "settings", parent: "campaignHome", navGroup: "management" }),
  preview: route("preview", "/app/campaigns/:campaignId/preview", { access: "manager", title: "Предпросмотр игрока", icon: "preview", parent: "campaignHome", navGroup: "management" }),

  notFound: route("notFound", "*", { scope: "system", access: "public", title: "Страница не найдена", icon: "missing", parent: null })
});

export const APP_ROUTE_LIST = Object.freeze(Object.values(APP_ROUTES));

const NAVIGATION_GROUPS = Object.freeze([
  { id: "campaign", label: "Кампания", routeIds: ["campaignHome", "archive", "myCharacter", "notes"] },
  { id: "archive", label: "Архив", routeIds: ["archiveMaps", "archiveTimeline", "archiveHandouts"] },
  { id: "session", label: "Игровой стол", routeIds: ["session"] },
  { id: "management", label: "Управление", managerOnly: true, routeIds: ["manageSessions", "managePlayers", "manageCharacters", "manageImports", "manageArchiveHealth", "manageVisibility", "manageSettings", "preview"] },
  { id: "account", label: "Аккаунт", accountOnly: true, routeIds: ["campaignSelect", "accountProfile"] }
]);

function encode(value) {
  return encodeURIComponent(String(value ?? ""));
}

export function buildAppPath(routeId, params = {}) {
  const definition = APP_ROUTES[routeId];
  if (!definition) throw new Error(`Unknown app route: ${routeId}`);
  if (definition.pattern === "*") return "*";

  const wildcardValue = params.wildcard ? String(params.wildcard).replace(/^\/+/, "") : "";
  let result = definition.pattern.replace(/\/:([A-Za-z0-9_]+)(?=\/|$)/g, (match, name) => {
    if (!(name in params) || params[name] === "") throw new Error(`Missing route parameter ${name} for ${routeId}`);
    return `/${encode(params[name])}`;
  });
  result = result.replace(/\/\*$/, wildcardValue ? `/${wildcardValue}` : "");
  return result || "/";
}

export function campaignHomePath(campaignId = "") {
  return campaignId ? buildAppPath("campaignHome", { campaignId }) : buildAppPath("campaignSelect");
}

export function campaignIdFromPath(pathname = "") {
  const match = String(pathname).match(/^\/app\/campaigns\/([^/]+)/);
  if (!match) return "";
  try { return decodeURIComponent(match[1]); } catch { return match[1]; }
}

export function replaceCampaignIdInPath(pathname = "", campaignId = "") {
  if (!campaignId) return buildAppPath("campaignSelect");
  if (!/^\/app\/campaigns\/[^/]+/.test(pathname)) return campaignHomePath(campaignId);
  return pathname.replace(/^\/app\/campaigns\/[^/]+/, `/app/campaigns/${encode(campaignId)}`);
}

function routeSpecificity(definition) {
  return definition.pattern.split("/").reduce((score, segment) => {
    if (!segment) return score;
    if (segment === "*") return score - 20;
    if (segment.startsWith(":")) return score + 2;
    return score + 10;
  }, definition.pattern.length / 1000);
}

const ROUTE_MATCH_ORDER = [...APP_ROUTE_LIST]
  .filter((definition) => definition.pattern !== "*")
  .sort((a, b) => routeSpecificity(b) - routeSpecificity(a));

export function routeForPath(pathname = "") {
  for (const definition of ROUTE_MATCH_ORDER) {
    if (definition.pattern === "*") continue;
    const match = matchPath({ path: definition.pattern, end: true }, pathname);
    if (match) return { definition, params: match.params || {} };
  }
  return { definition: APP_ROUTES.notFound, params: {} };
}

export function routeScopeFromPath(pathname = "") {
  return routeForPath(pathname).definition.scope;
}

export function routeTitleFromPath(pathname = "") {
  return routeForPath(pathname).definition.title;
}

export function navigationGroupsFor({ signedIn = false, hasCampaign = false, canManage = false } = {}) {
  if (!signedIn) {
    return [{ id: "public", label: "Доступ", routes: [APP_ROUTES.login, APP_ROUTES.help] }];
  }
  if (!hasCampaign) {
    return [{ id: "account", label: "Аккаунт", routes: [APP_ROUTES.campaignSelect, APP_ROUTES.accountProfile] }];
  }
  return NAVIGATION_GROUPS
    .filter((group) => !group.managerOnly || canManage)
    .filter((group) => !group.accountOnly)
    .map((group) => ({ ...group, routes: group.routeIds.map((id) => APP_ROUTES[id]) }));
}

export function parentPathFor(pathname = "") {
  const { definition, params } = routeForPath(pathname);
  if (!definition.parent) return "";
  const parent = APP_ROUTES[definition.parent];
  if (!parent) return "";
  return buildAppPath(parent.id, { ...params, campaignId: params.campaignId });
}

export function breadcrumbsFor(pathname = "", context = {}) {
  const resolved = routeForPath(pathname);
  const items = [];
  const seen = new Set();
  let current = resolved.definition;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const label = current.id === "campaignHome"
      ? context.campaignName || current.title
      : current.id === "archiveWorld"
        ? context.worldName || current.title
        : current.title;
    let to = "";
    try { to = current.pattern === "*" ? "" : buildAppPath(current.id, { ...resolved.params, campaignId: resolved.params.campaignId }); } catch { to = ""; }
    items.unshift({ id: current.id, label, to });
    current = current.parent ? APP_ROUTES[current.parent] : null;
  }
  return items;
}

export const LEGACY_ROUTE_REDIRECTS = Object.freeze([
  { path: "/campaigns", target: "campaignSelect" },
  { path: "/profile", target: "accountProfile" },
  { path: "/guide", target: "help" },
  { path: "/gm", target: "campaignHome", campaign: true },
  { path: "/player", target: "campaignHome", campaign: true },
  { path: "/archive", target: "archive", campaign: true },
  { path: "/players", target: "managePlayers", campaign: true, manager: true },
  { path: "/world/:worldSlug", target: "archiveWorld", campaign: true, copy: ["worldSlug"] },
  { path: "/world/:worldSlug/category/:category/*", target: "archiveCategory", campaign: true, copy: ["category"], worldQuery: true },
  { path: "/world/:worldSlug/timeline", target: "archiveTimeline", campaign: true, worldQuery: true },
  { path: "/world/:worldSlug/maps", target: "archiveMaps", campaign: true, worldQuery: true },
  { path: "/world/:worldSlug/session", target: "session", campaign: true, worldQuery: true },
  { path: "/world/:worldSlug/reveal", target: "archiveHandouts", campaign: true, worldQuery: true },
  { path: "/world/:worldSlug/player", target: "campaignHome", campaign: true, worldQuery: true },
  { path: "/category/:category/*", target: "archiveCategory", campaign: true, copy: ["category"] },
  { path: "/page/:path", target: "archiveEntry", campaign: true, copy: ["path"] },
  { path: "/editor", target: "archiveEntryNew", campaign: true, manager: true },
  { path: "/edit/:path", target: "archiveEntryEdit", campaign: true, manager: true, copy: ["path"] },
  { path: "/missing", target: "manageMissingLinks", campaign: true, manager: true },
  { path: "/timeline", target: "archiveTimeline", campaign: true },
  { path: "/maps", target: "archiveMaps", campaign: true },
  { path: "/my", target: "campaignHome", campaign: true },
  { path: "/notes", target: "notes", campaign: true },
  { path: "/characters", target: "myCharacter", managerTarget: "manageCharacters", campaign: true },
  { path: "/handouts", target: "archiveHandouts", campaign: true },
  { path: "/sessions", target: "manageSessions", campaign: true, manager: true },
  { path: "/settings", target: "accountProfile", managerTarget: "manageSettings", campaign: true },
  { path: "/gm-tools", target: "manageTools", campaign: true, manager: true },
  { path: "/health", target: "manageArchiveHealth", campaign: true, manager: true },
  { path: "/player-safety", target: "manageVisibility", campaign: true, manager: true },
  { path: "/session-desk", target: "session", campaign: true },
  { path: "/dice", target: "sessionDice", campaign: true },
  { path: "/foundry", target: "manageImports", campaign: true, manager: true }
]);

export function legacyTargetPath(spec, { params = {}, campaignId = "", canManage = false, search = "" } = {}) {
  if (spec.campaign && !campaignId) return buildAppPath("campaignSelect");
  const targetId = spec.managerTarget && canManage ? spec.managerTarget : spec.target;
  if (spec.manager && !canManage) return campaignId ? campaignHomePath(campaignId) : buildAppPath("campaignSelect");
  const targetParams = { campaignId };
  for (const key of spec.copy || []) targetParams[key] = params[key];
  let target = buildAppPath(targetId, targetParams);
  const query = new URLSearchParams(search || "");
  if (spec.worldQuery && params.worldSlug) query.set("world", params.worldSlug);
  const queryString = query.toString();
  return `${target}${queryString ? `?${queryString}` : ""}`;
}
