import { worldSlug } from "./worldContext.js";

export const SHELL_MODES = {
  dashboard: {
    key: "dashboard",
    label: "Dashboard",
    title: "Campaign overview",
    home: "/"
  },
  archive: {
    key: "archive",
    label: "Архив",
    title: "Campaign preparation and lore archive",
    home: "/archive"
  },
  table: {
    key: "table",
    label: "Игровой стол",
    title: "Live session tools and active table workspace",
    home: "/session-desk"
  },
  management: {
    key: "management",
    label: "Управление",
    title: "Players, access, settings and technical tools",
    home: "/my"
  }
};

export const MANAGEMENT_PATHS = [
  "/campaigns",
  "/my",
  "/players",
  "/profile",
  "/settings",
  "/gm-tools",
  "/health",
  "/foundry",
  "/missing",
  "/player-safety"
];

export const TABLE_PATHS = [
  "/session-desk",
  "/sessions",
  "/dice",
  "/characters"
];

export const SHARED_TOOL_PATHS = [
  "/handouts",
  "/notes",
  "/maps"
];

export const ARCHIVE_PATHS = [
  "/archive",
  "/category",
  "/maps",
  "/timeline",
  "/handouts",
  "/notes",
  "/page",
  "/editor",
  "/edit"
];

function startsWithAny(pathname = "", paths = []) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function modeFromSearch(search = "") {
  const value = new URLSearchParams(search || "").get("mode");
  return ["archive", "table", "management"].includes(value) ? value : "";
}

export function shellModeFromLocation(pathname = "", search = "") {
  const explicitMode = modeFromSearch(search);
  if (explicitMode) return explicitMode;
  return shellModeFromPath(pathname);
}

export function shellModeFromPath(pathname = "") {
  if (!pathname || pathname === "/") return "dashboard";
  if (startsWithAny(pathname, MANAGEMENT_PATHS)) return "management";
  if (startsWithAny(pathname, TABLE_PATHS)) return "table";
  if (/^\/world\/[^/]+\/(session|reveal)/.test(pathname)) return "table";
  return "archive";
}

export function modeMeta(mode = "archive") {
  return SHELL_MODES[mode] || SHELL_MODES.archive;
}

export function modeHome(mode = "archive", canManage = false, activeWorld = null) {
  if (mode === "dashboard") return "/";
  if (mode === "management") return canManage ? scopedPath("/my", activeWorld) : scopedPath("/profile", activeWorld);
  if (mode === "table") return scopedPath("/session-desk", activeWorld);
  return scopedPath("/archive", activeWorld);
}

export function modeLabel(mode = "archive") {
  return modeMeta(mode).label;
}

export function scopeLabel(activeWorld = null) {
  return activeWorld?.title || "Вся кампания";
}

export function scopeKicker(activeWorld = null) {
  return activeWorld ? "World scope" : "Campaign-wide scope";
}

export function worldScopeFromSearch(search = "") {
  const params = new URLSearchParams(search || "");
  return params.get("world") || params.get("scopeWorld") || "";
}

export function normalizeLegacyWorldPath(pathname = "") {
  const worldMatch = pathname.match(/^\/world\/[^/]+(?:\/(.*))?$/);
  if (!worldMatch) return pathname || "/archive";
  const rest = worldMatch[1] || "";
  if (!rest) return "/archive";
  if (rest.startsWith("category/")) return `/${rest}`;
  if (rest === "maps") return "/maps";
  if (rest === "timeline") return "/timeline";
  if (rest === "session") return "/sessions";
  if (rest === "reveal") return "/handouts?mode=table";
  if (rest === "player") return "/player";
  return "/archive";
}

export function scopedPath(path = "/archive", activeWorld = null, extraParams = {}) {
  const target = normalizeLegacyWorldPath(path || "/archive");
  const [pathname, rawSearch = ""] = target.split("?");
  const params = new URLSearchParams(rawSearch);

  if (activeWorld) params.set("world", worldSlug(activeWorld));
  else params.delete("world");

  Object.entries(extraParams || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") params.delete(key);
    else params.set(key, String(value));
  });

  const nextSearch = params.toString();
  return `${pathname || "/"}${nextSearch ? `?${nextSearch}` : ""}`;
}

export function clearScopePath(pathname = "/archive", search = "") {
  const { pathname: normalizedPathname, params } = normalizedLocation(pathname, search);
  params.delete("world");
  params.delete("scopeWorld");
  const nextSearch = params.toString();
  return `${normalizedPathname}${nextSearch ? `?${nextSearch}` : ""}`;
}

export function changeScopePath(pathname = "/archive", search = "", world = null) {
  const { pathname: normalizedPathname, params } = normalizedLocation(pathname, search);
  if (world) params.set("world", worldSlug(world));
  else {
    params.delete("world");
    params.delete("scopeWorld");
  }
  const nextSearch = params.toString();
  return `${normalizedPathname}${nextSearch ? `?${nextSearch}` : ""}`;
}

function normalizedLocation(pathname = "/archive", search = "") {
  const normalizedTarget = normalizeLegacyWorldPath(pathname || "/archive");
  const [normalizedPathname, normalizedSearch = ""] = normalizedTarget.split("?");
  const params = new URLSearchParams(normalizedSearch);
  const currentParams = new URLSearchParams(search || "");

  for (const key of new Set(currentParams.keys())) {
    params.delete(key);
    for (const value of currentParams.getAll(key)) params.append(key, value);
  }

  return { pathname: normalizedPathname || "/archive", params };
}

export function pageToolFromPath(pathname = "") {
  const normalized = normalizeLegacyWorldPath(pathname || "/").split("?")[0];
  if (normalized === "/") return "Dashboard";
  if (normalized.startsWith("/category/")) return normalized.split("/")[2] || "Category";
  if (normalized === "/archive") return "Overview";
  if (normalized === "/session-desk") return "Session Desk";
  if (normalized === "/sessions") return "Sessions";
  if (normalized === "/dice") return "Dice";
  if (normalized === "/notes") return "Notes";
  if (normalized === "/characters") return "Characters";
  if (normalized === "/handouts") return "Handouts";
  if (normalized === "/maps") return "Maps";
  if (normalized === "/timeline") return "Timeline";
  if (normalized === "/players") return "Players";
  if (normalized === "/settings") return "Settings";
  if (normalized === "/profile") return "Profile";
  if (normalized === "/my") return "Workspace";
  return normalized.replace(/^\//, "") || "Tool";
}
