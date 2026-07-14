import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { entrySectionQuery } from "../apps/server/src/routes/archive.js";
import { getWorlds, isWorldPage } from "../apps/web/src/utils/worldContext.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function source(relativePath) {
  return fs.readFile(path.join(rootDir, relativePath), "utf8");
}

test("world detection accepts canonical, legacy and path-based world entries", () => {
  assert.equal(isWorldPage({ category: "worlds", title: "Вальдран", path: "worlds/valdran.md" }), true);
  assert.equal(isWorldPage({ category: "world", title: "Мир Шторма", path: "lore/storm.md" }), true);
  assert.equal(isWorldPage({ frontmatter: { type: "world" }, title: "Старый мир", path: "legacy/old.md" }), true);
  assert.equal(isWorldPage({ title: "Мир по пути", path: "Миры/storm.md" }), true);
  assert.equal(isWorldPage({ category: "lore", title: "Не мир", path: "lore/note.md" }), false);

  const worlds = getWorlds([
    { category: "world", title: "Мир Шторма", path: "lore/storm.md" },
    { type: "world", title: "Мир Шторма", path: "worlds/storm-copy.md", frontmatter: { slug: "мир-шторма" } },
    { category: "worlds", title: "Вальдран", path: "worlds/valdran.md" }
  ]);
  assert.equal(worlds.length, 2);
});

test("archive summary queries canonical entry-backed maps, timeline and sessions", () => {
  const timeline = entrySectionQuery("campaign-id", "owner", "timelineEvents");
  const maps = entrySectionQuery("campaign-id", "owner", "maps");
  const sessions = entrySectionQuery("campaign-id", "player", "sessions");

  assert.deepEqual(timeline.$and[1].$or, [
    { type: "timelineEvent" },
    { category: { $in: ["timeline", "lore/timeline"] } }
  ]);
  assert.deepEqual(maps.$and[1].$or, [{ type: "map" }, { category: "maps" }]);
  assert.deepEqual(sessions.$and[1].$or, [{ type: "session" }, { category: "sessions" }]);
  assert.deepEqual(sessions.$and[0].visibility, { $in: ["public", "revealed"] });
});

test("critical dropdowns use portal menus instead of clipped header children", async () => {
  const [topbar, timeline, floatingMenu, select, css] = await Promise.all([
    source("apps/web/src/components/CodexTopbar.jsx"),
    source("apps/web/src/pages/TimelinePage.jsx"),
    source("apps/web/src/components/ui/FloatingMenu.jsx"),
    source("apps/web/src/components/ui/CodexSelect.jsx"),
    source("apps/web/src/styles/stage19-select-archive-hotfix.css")
  ]);

  assert.match(topbar, /<FloatingMenu/);
  assert.match(topbar, /topbar-dropdown-menu--portal/);
  assert.match(floatingMenu, /createPortal/);
  assert.match(select, /role="listbox"/);
  assert.match(timeline, /<CodexSelect/);
  assert.match(timeline, /getWorlds\(pages\)/);
  assert.match(css, /appearance:\s*auto\s*!important/);
  assert.match(css, /position:\s*fixed/);
});
