import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("production CSS has one canonical Silverleaf entrypoint above a bounded legacy layer", () => {
  const index = read("apps/web/src/styles/index.css");
  assert.match(index, /silverleaf\/tokens\.css/);
  assert.match(index, /silverleaf\/base\.css/);
  assert.match(index, /silverleaf\/components\.css/);
  assert.match(index, /silverleaf\/shell\.css/);
  assert.match(index, /Temporary compatibility boundary/);
  assert.match(index, /stage25-player-management\.css" layer\(legacy\)/);
  assert.doesNotMatch(index, /layer\(stage\d+/);
});

test("production Silverleaf tokens preserve the approved action and field geometry", () => {
  const tokens = read("apps/web/src/styles/silverleaf/tokens.css");
  assert.match(tokens, /--sl-action-width:\s*248px/);
  assert.match(tokens, /--sl-action-height:\s*56px/);
  assert.match(tokens, /--sl-field-height:\s*48px/);
  assert.match(tokens, /--sl-icon-control-size:\s*40px/);
  assert.match(tokens, /--sl-font-display:\s*"Cinzel"/);
  assert.match(tokens, /--sl-font-body:\s*"Inter"/);
});

test("production primitives include the locked primary button and custom listbox", () => {
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

test("production design system remains independent from the Branding Lab", () => {
  const sources = [
    read("apps/web/src/components/ui/Silverleaf.jsx"),
    read("apps/web/src/styles/silverleaf/tokens.css"),
    read("apps/web/src/styles/silverleaf/components.css"),
    read("apps/web/src/styles/silverleaf/shell.css")
  ].join("\n");
  assert.doesNotMatch(sources, /branding\//i);
  assert.doesNotMatch(sources, /stage\d+|hotfix|stabilization/i);
});
