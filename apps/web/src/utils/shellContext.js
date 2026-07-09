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
  "/my",
  "/players",
  "/profile",
  "/settings",
  "/gm-tools",
  "/health",
  "/foundry",
  "/missing",
  "/player-safety",
  "/admin"
];

export const TABLE_PATHS = [
  "/session-desk",
  "/sessions",
  "/dice",
  "/notes",
  "/characters"
];

export const ARCHIVE_PATHS = [
  "/archive",
  "/category",
  "/maps",
  "/timeline",
  "/handouts",
  "/page",
  "/editor",
  "/edit"
];

function startsWithAny(pathname = "", paths = []) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
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
  if (rest === "reveal") return "/handouts";
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
  const params = new URLSearchParams(search || "");
  params.delete("world");
  params.delete("scopeWorld");
  const nextSearch = params.toString();
  return `${normalizeLegacyWorldPath(pathname)}${nextSearch ? `?${nextSearch}` : ""}`;
}

export function changeScopePath(pathname = "/archive", search = "", world = null) {
  const basePath = normalizeLegacyWorldPath(pathname || "/archive");
  const params = new URLSearchParams(search || "");
  if (world) params.set("world", worldSlug(world));
  else {
    params.delete("world");
    params.delete("scopeWorld");
  }
  const nextSearch = params.toString();
  return `${basePath}${nextSearch ? `?${nextSearch}` : ""}`;
}

export function pageToolFromPath(pathname = "") {
  const normalized = normalizeLegacyWorldPath(pathname || "/");
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
