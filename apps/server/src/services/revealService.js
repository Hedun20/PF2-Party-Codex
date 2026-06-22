import { getPage } from "./vaultService.js";
import { slugify } from "../utils/slugify.js";

const revealByWorld = new Map();

function worldKey(world = "") {
  return slugify(world || "world");
}

function imageForPage(page = {}) {
  return page.handoutImage
    || page.frontmatter?.handoutImage
    || page.avatarImage
    || page.frontmatter?.avatarImage
    || page.mapImage
    || page.frontmatter?.mapImage
    || page.image
    || page.frontmatter?.image
    || page.tokenImage
    || page.frontmatter?.tokenImage
    || "";
}

function compactContent(content = "") {
  const text = String(content || "").trim();
  if (!text) return "";
  return text.length > 2400 ? `${text.slice(0, 2400).trim()}\n\n...` : text;
}

function buildHandout(page, world = "", note = "") {
  return {
    world,
    path: page.path,
    title: page.title,
    category: page.category,
    type: page.type,
    summary: page.summary || page.frontmatter?.summary || "",
    tags: page.tags || [],
    image: imageForPage(page),
    content: compactContent(page.content),
    note: String(note || "").trim(),
    revealedAt: new Date().toISOString()
  };
}

export function getRevealState(world = "") {
  return revealByWorld.get(worldKey(world)) || {
    world,
    active: null,
    history: []
  };
}

export function revealPageToPlayers({ world = "", path = "", note = "" } = {}) {
  const page = getPage(path, "player");
  if (!page) {
    const error = new Error("Эту статью нельзя показать игрокам: она не найдена или не является public/player-safe.");
    error.status = 404;
    throw error;
  }

  const key = worldKey(world || page.world || page.frontmatter?.world || "world");
  const existing = revealByWorld.get(key) || { world: world || page.world || "", active: null, history: [] };
  const active = buildHandout(page, existing.world || world || page.world || "", note);
  const history = [active, ...(existing.history || []).filter((item) => item.path !== active.path)].slice(0, 8);
  const next = { world: active.world, active, history };
  revealByWorld.set(key, next);
  return next;
}

export function clearRevealState(world = "") {
  const key = worldKey(world);
  const existing = revealByWorld.get(key) || { world, active: null, history: [] };
  const next = { ...existing, world: existing.world || world, active: null };
  revealByWorld.set(key, next);
  return next;
}
