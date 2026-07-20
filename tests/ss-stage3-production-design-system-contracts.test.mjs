import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const primitiveNames = [
  "Button",
  "IconButton",
  "Input",
  "Select",
  "Textarea",
  "Card",
  "Panel",
  "Badge",
  "Tabs",
  "Table",
  "Dialog",
  "Drawer",
  "Tooltip",
  "Notice",
  "LoadingState",
  "EmptyState",
  "ErrorState",
  "ForbiddenState",
  "PageHeader"
];

test("production CSS has one canonical Silverleaf entrypoint above a bounded legacy layer", () => {
  const index = read("apps/web/src/styles/index.css");
  assert.match(index, /silverleaf\/tokens\.css/);
  assert.match(index, /silverleaf\/base\.css/);
  assert.match(index, /silverleaf\/components\.css/);
  assert.match(index, /silverleaf\/advanced-primitives\.css/);
  assert.match(index, /silverleaf\/shell\.css/);
  assert.match(index, /silverleaf\/page-composition\.css/);
  assert.match(index, /silverleaf\/adapter-controls\.css/);
  assert.match(index, /silverleaf\/adapter-pages\.css/);
  assert.match(index, /silverleaf\/adapter-responsive\.css/);
  assert.match(index, /Temporary compatibility boundary/);
  assert.match(index, /stage25-player-management\.css" layer\(legacy\)/);
  assert.doesNotMatch(index, /layer\(stage\d+/);
  assert.ok(index.indexOf("adapter-responsive.css") > index.indexOf("stage25-player-management.css"));
});

test("production Silverleaf tokens cover semantic visual, motion, breakpoint and layering foundations", () => {
  const tokens = read("apps/web/src/styles/silverleaf/tokens.css");
  for (const token of [
    "--sl-bg-canvas",
    "--sl-bg-surface",
    "--sl-border-default",
    "--sl-text-primary",
    "--sl-accent-gold",
    "--sl-danger",
    "--sl-shadow-md",
    "--sl-radius-sm",
    "--sl-space-6",
    "--sl-motion-fast",
    "--sl-ease-standard",
    "--sl-breakpoint-mobile",
    "--sl-breakpoint-shell",
    "--sl-z-dropdown",
    "--sl-z-modal"
  ]) assert.match(tokens, new RegExp(token.replaceAll("-", "\\-")));

  assert.match(tokens, /--sl-action-width:\s*248px/);
  assert.match(tokens, /--sl-action-height:\s*56px/);
  assert.match(tokens, /--sl-field-height:\s*48px/);
  assert.match(tokens, /--sl-icon-control-size:\s*40px/);
  assert.match(tokens, /--sl-font-display:\s*"Cinzel"/);
  assert.match(tokens, /--sl-font-body:\s*"Inter"/);
});

test("one canonical production module exports the complete Stage 3 primitive set", () => {
  const ui = read("apps/web/src/components/ui/Silverleaf.jsx");
  const barrel = read("apps/web/src/components/ui/index.js");
  for (const name of primitiveNames) {
    assert.match(ui, new RegExp(`export (?:function|const) ${name}\\b`), `missing canonical ${name}`);
  }
  assert.match(barrel, /export \* from "\.\/Silverleaf\.jsx"/);
  assert.match(barrel, /Compatibility adapters/);
  assert.match(barrel, /default as EmptyState/);
});

test("approved primary geometry and custom listbox remain locked", () => {
  const ui = read("apps/web/src/components/ui/Silverleaf.jsx");
  const css = read("apps/web/src/styles/silverleaf/components.css");
  assert.match(ui, /SilverleafLeafIcon/);
  assert.match(ui, /sl-button__diamond--left/);
  assert.match(ui, /role="combobox"/);
  assert.match(ui, /role="listbox"/);
  assert.match(ui, /sl-select-menu/);
  assert.doesNotMatch(ui, /<select/);
  assert.match(css, /\.sl-button--primary\s*\{[\s\S]*width:\s*var\(--sl-action-width\)/);
  assert.match(css, /\.sl-button--primary\s*\{[\s\S]*height:\s*var\(--sl-action-height\)/);
  assert.match(css, /\.sl-icon-button\s*\{[\s\S]*aspect-ratio:\s*1\/1/);
});

test("shared controls implement focus, active, disabled, loading and error states", () => {
  const ui = read("apps/web/src/components/ui/Silverleaf.jsx");
  const base = read("apps/web/src/styles/silverleaf/base.css");
  const components = read("apps/web/src/styles/silverleaf/components.css");
  const advanced = read("apps/web/src/styles/silverleaf/advanced-primitives.css");
  assert.match(ui, /aria-busy=\{loading \|\| undefined\}/);
  assert.match(ui, /aria-invalid=\{error \|\| undefined\}/);
  assert.match(components, /:hover:not\(:disabled\)/);
  assert.match(components, /:active:not\(:disabled\)/);
  assert.match(components, /\.sl-button:disabled/);
  assert.match(components, /\.is-error/);
  assert.match(base, /:focus-visible/);
  assert.match(base, /prefers-reduced-motion:\s*reduce/);
  assert.match(advanced, /\.sl-card\.is-interactive:hover/);
  assert.match(advanced, /\.sl-table tbody tr\.is-selected/);
});

test("Select, Tabs, Dialog and Drawer include keyboard and focus management", () => {
  const ui = read("apps/web/src/components/ui/Silverleaf.jsx");
  for (const key of ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End", "Escape", "Tab"]) {
    assert.match(ui, new RegExp(`event\\.key === "${key}"|includes\\(event\\.key\\)`), `missing ${key} behavior`);
  }
  assert.match(ui, /useModalBehavior/);
  assert.match(ui, /document\.body\.style\.overflow = "hidden"/);
  assert.match(ui, /previousFocusRef\.current\?\.focus/);
  assert.match(ui, /role="dialog" aria-modal="true"/);
  assert.match(ui, /role="tooltip"/);
  assert.match(ui, /role="tablist"/);
  assert.match(ui, /tabIndex=\{active === item\.value \? 0 : -1\}/);
});

test("Card, Table, PageHeader and overlays have responsive production styling", () => {
  const css = read("apps/web/src/styles/silverleaf/advanced-primitives.css");
  assert.match(css, /\.sl-card/);
  assert.match(css, /\.sl-table-scroll/);
  assert.match(css, /\.sl-page-header/);
  assert.match(css, /\.sl-overlay/);
  assert.match(css, /\.sl-dialog/);
  assert.match(css, /\.sl-drawer/);
  assert.match(css, /\.sl-tooltip__bubble/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
});

test("compatibility adapters render canonical Silverleaf primitives instead of alternate designs", () => {
  const button = read("apps/web/src/components/ui/CodexButton.jsx");
  const card = read("apps/web/src/components/ui/CodexCard.jsx");
  const hero = read("apps/web/src/components/ui/PageHero.jsx");
  const empty = read("apps/web/src/components/ui/EmptyState.jsx");
  const status = read("apps/web/src/components/ui/StatusMessage.jsx");
  assert.match(button, /"sl-button"/);
  assert.match(button, /sl-button__diamond--left/);
  assert.match(card, /import \{ Card \}/);
  assert.match(card, /<Card/);
  assert.match(hero, /import \{ PageHeader \}/);
  assert.match(hero, /<PageHeader/);
  assert.match(empty, /import \{ StatePanel \}/);
  assert.match(status, /import \{ Notice \}/);
});

test("final page composition removes the purple prototype and protects all production routes", () => {
  const composition = read("apps/web/src/styles/silverleaf/page-composition.css");
  const controls = read("apps/web/src/styles/silverleaf/adapter-controls.css");
  const pages = read("apps/web/src/styles/silverleaf/adapter-pages.css");
  const responsive = read("apps/web/src/styles/silverleaf/adapter-responsive.css");
  const handouts = read("apps/web/src/pages/HandoutsPage.jsx");
  const foundry = read("apps/web/src/pages/FoundryImportExportPage.jsx");
  const back = read("apps/web/src/components/PageBackButton.jsx");

  assert.match(composition, /\.cinematic-world-bg\s*\{[\s\S]*opacity:\s*0\s*!important/);
  assert.match(composition, /\.route-breadcrumbs ol\s*\{[\s\S]*list-style:\s*none/);
  assert.match(composition, /font:\s*500 clamp\(34px,\s*4\.6vw,\s*64px\)/);
  assert.match(controls, /\.codex-button\.sl-button--primary/);
  assert.match(controls, /width:\s*var\(--sl-action-width\)/);
  assert.match(controls, /\.codex-card\.sl-card/);
  assert.match(pages, /\.archive-summary-grid/);
  assert.match(pages, /\.archive-count-card/);
  assert.match(pages, /\.workspace-grid/);
  assert.match(pages, /\.archive-recent-grid/);
  assert.match(responsive, /@media \(max-width: 1180px\)/);
  assert.match(responsive, /@media \(max-width: 620px\)/);
  assert.match(handouts, /PageHeader/);
  assert.match(foundry, /PageHeader/);
  assert.match(back, /\.\/ui\/Silverleaf\.jsx/);
  assert.doesNotMatch(back, /CodexButton/);
});

test("production shell consumes Silverleaf primitives and avoids native topbar selects", () => {
  const shell = read("apps/web/src/components/ApplicationShell.jsx");
  const sidebar = read("apps/web/src/components/CodexSidebar.jsx");
  const topbar = read("apps/web/src/components/CodexTopbar.jsx");
  assert.match(shell, /Notice/);
  assert.match(shell, /DESKTOP_SIDEBAR_QUERY/);
  assert.match(sidebar, /SilverleafLeafIcon/);
  assert.match(sidebar, /IconButton/);
  assert.match(topbar, /SelectInput/);
  assert.doesNotMatch(topbar, /<select/);
  assert.match(topbar, /topbar-settings-link/);
});

test("migrated shell code cannot import legacy or alternate primitive implementations", () => {
  const migrated = [
    "apps/web/src/components/ApplicationShell.jsx",
    "apps/web/src/components/CodexSidebar.jsx",
    "apps/web/src/components/CodexTopbar.jsx"
  ].map(read).join("\n");
  assert.doesNotMatch(migrated, /stage\d+|hotfix|stabilization/i);
  assert.doesNotMatch(migrated, /CodexButton|CodexCard|MagicSelectLayer|LoreDropdown/);
  assert.match(migrated, /\.\/ui\/Silverleaf\.jsx/);
});

test("production design system remains independent from the Branding Lab", () => {
  const sources = [
    read("apps/web/src/components/ui/Silverleaf.jsx"),
    read("apps/web/src/styles/silverleaf/tokens.css"),
    read("apps/web/src/styles/silverleaf/components.css"),
    read("apps/web/src/styles/silverleaf/advanced-primitives.css"),
    read("apps/web/src/styles/silverleaf/shell.css"),
    read("apps/web/src/styles/silverleaf/page-composition.css"),
    read("apps/web/src/styles/silverleaf/adapter-controls.css"),
    read("apps/web/src/styles/silverleaf/adapter-pages.css"),
    read("apps/web/src/styles/silverleaf/adapter-responsive.css")
  ].join("\n");
  assert.doesNotMatch(sources, /branding\//i);
  assert.doesNotMatch(sources, /stage\d+|hotfix|stabilization/i);
});
