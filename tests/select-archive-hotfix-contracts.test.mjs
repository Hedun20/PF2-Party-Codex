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

test("critical header and Timeline controls use browser-native selects", async () => {
  const [topbar, timeline, css] = await Promise.all([
    source("apps/web/src/components/CodexTopbar.jsx"),
    source("apps/web/src/pages/TimelinePage.jsx"),
    source("apps/web/src/styles/stage20-native-selects.css")
  ]);

  assert.match(topbar, /<select aria-label="Активная кампания"/);
  assert.match(topbar, /<select aria-label="Раздел приложения"/);
  assert.match(topbar, /<select aria-label="Мир кампании"/);
  assert.doesNotMatch(topbar, /FloatingMenu|HeaderDropdown|CodexSelect/);

  assert.match(timeline, /<select aria-label="Фильтр мира timeline"/);
  assert.match(timeline, /<select aria-label="Фильтр типа timeline"/);
  assert.doesNotMatch(timeline, /CodexSelect|FloatingMenu/);
  assert.match(timeline, /getWorlds\(pages\)/);

  assert.match(css, /topbar-native-select/);
  assert.match(css, /timeline-control--native-select/);
  assert.doesNotMatch(css, /position:\s*fixed/);
});

test("select styles use one canonical native layer", async () => {
  const styleIndex = await source("apps/web/src/styles/index.css");

  assert.match(styleIndex, /stage20-native-selects\.css/);
  assert.doesNotMatch(styleIndex, /magic-select\.css/);
  assert.doesNotMatch(styleIndex, /stage19-select-archive-hotfix\.css/);
});

test("world page remains archive-first and delegates live play to the table", async () => {
  const worldPage = await source("apps/web/src/pages/WorldDashboardPage.jsx");

  assert.match(worldPage, /Архив мира/);
  assert.match(worldPage, /Хроника сессий/);
  assert.doesNotMatch(worldPage, /Start Session|Session Mode|GM Desktop|Player Reveal|Open live portal/);
  assert.doesNotMatch(worldPage, /worldRoute\(world\)\}\/session|worldRoute\(world\)\}\/reveal/);
});

test("live viewport regressions keep archive cards, notes and editor controls readable", async () => {
  const [archivePage, editorPage, notesPage, styleIndex, stabilizationCss] = await Promise.all([
    source("apps/web/src/pages/CampaignArchivePage.jsx"),
    source("apps/web/src/pages/EditorPage.jsx"),
    source("apps/web/src/pages/NotesPage.jsx"),
    source("apps/web/src/styles/index.css"),
    source("apps/web/src/styles/stage36-ui-stabilization.css")
  ]);

  assert.match(archivePage, /Событие хронологии/);
  assert.doesNotMatch(archivePage, /<span> · \{itemSubline/);
  assert.match(editorPage, /material-type-menu__options/);
  assert.doesNotMatch(editorPage, /<select id="material-type-select"/);
  assert.match(notesPage, /notes-delete-button[\s\S]*Удалить/);
  assert.match(styleIndex, /stage36-ui-stabilization\.css/);
  assert.match(stabilizationCss, /archive-recent-card\.codex-card > \.codex-button/);
  assert.match(stabilizationCss, /notes-delete-button\.codex-button/);
  assert.match(stabilizationCss, /material-type-menu__options/);
  assert.match(stabilizationCss, /repeat\(7, minmax\(0, 1fr\)\)/);
  assert.match(stabilizationCss, /repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(archivePage, /items\.length > 5/);
  assert.match(stabilizationCss, /grid-auto-rows: var\(--archive-recent-item-height\)/);
  assert.match(stabilizationCss, /var\(--archive-recent-item-height\) \* 5/);
});

test("retired safety review and GM-secret controls stay out of the product UI", async () => {
  const [app, sidebar, gmTools, pageView, editor, visualEditor, apiClient, toolsRoute] = await Promise.all([
    source("apps/web/src/App.jsx"),
    source("apps/web/src/components/CodexSidebar.jsx"),
    source("apps/web/src/pages/GMToolsPage.jsx"),
    source("apps/web/src/pages/PageView.jsx"),
    source("apps/web/src/pages/EditorPage.jsx"),
    source("apps/web/src/components/ArticleVisualEditor.jsx"),
    source("apps/web/src/api/client.js"),
    source("apps/server/src/routes/tools.js")
  ]);

  for (const productSurface of [app, sidebar, gmTools, pageView, apiClient, toolsRoute]) {
    assert.doesNotMatch(productSurface, /player-safety|PlayerSafetyPage|Safety Review/);
  }
  assert.doesNotMatch(pageView, /article-safety-banner|page\.playerSafety/);
  assert.doesNotMatch(editor, /structured-secret-textarea|form\.gmSecrets/);
  assert.doesNotMatch(visualEditor, /appendGmSecretsBlock|>\+ GM secret<|>\+ Reveal note<|structured-secret-field/);
  assert.doesNotMatch(apiClient, /playerSafety:/);
  assert.doesNotMatch(toolsRoute, /campaignPlayerSafetyReview/);
  await assert.rejects(fs.access(path.join(rootDir, "apps/web/src/pages/PlayerSafetyPage.jsx")));
});
