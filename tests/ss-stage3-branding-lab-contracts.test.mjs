import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const brandingRoot = path.join(root, "apps", "web", "branding");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

test("branding lab is an isolated JSX multi-page prototype", () => {
  assert.ok(fs.existsSync(path.join(brandingRoot, "index.html")));
  assert.ok(fs.existsSync(path.join(brandingRoot, "src", "main.jsx")));
  const vite = read("apps/web/vite.config.js");
  assert.match(vite, /branding\/index\.html/);
  assert.match(vite, /rollupOptions/);
  const main = read("apps/web/branding/src/main.jsx");
  assert.match(main, /HashRouter/);
});

test("branding brochure exposes the four-page review flow", () => {
  const app = read("apps/web/branding/src/BrandingApp.jsx");
  for (const route of ["/foundations", "/character", "/dice", "/invitations"]) {
    assert.ok(app.includes(`path="${route}"`), `missing branding route ${route}`);
  }
});

test("Silverleaf Dark has one semantic geometry and typography contract", () => {
  const tokens = read("apps/web/branding/src/theme/silverleaf-dark.css");
  for (const token of [
    "--sl-bg-canvas",
    "--sl-bg-sidebar",
    "--sl-bg-surface",
    "--sl-border-default",
    "--sl-frame-gold",
    "--sl-frame-teal",
    "--sl-text-primary",
    "--sl-accent-emerald",
    "--sl-accent-moon",
    "--sl-accent-gold",
    "--sl-danger",
    "--sl-focus",
    "--sl-action-width",
    "--sl-action-height",
    "--sl-field-height",
    "--sl-sidebar-expanded",
    "--sl-sidebar-collapsed"
  ]) assert.ok(tokens.includes(token), `missing semantic token ${token}`);

  assert.match(tokens, /family=Cinzel/);
  assert.match(tokens, /family=Inter/);
  assert.match(tokens, /--sl-action-width:\s*248px/);
  assert.match(tokens, /--sl-action-height:\s*56px/);
  assert.match(tokens, /--sl-field-height:\s*48px/);
  assert.match(tokens, /--sl-font-display:\s*"Cinzel"/);
  assert.match(tokens, /--sl-font-body:\s*"Inter"/);
});

test("approved corrected v3 primary button keeps its locked geometry", () => {
  const ui = read("apps/web/branding/src/components/Ui.jsx");
  const css = read("apps/web/branding/src/silverleaf-components.css");
  const entry = read("apps/web/branding/src/branding.css");

  assert.match(entry, /silverleaf-components\.css/);
  assert.doesNotMatch(entry, /silverleaf-components-extra/);
  assert.match(ui, /SilverleafLeafIcon/);
  assert.match(ui, /primary-button-default-v3/);
  assert.match(ui, /sl-button__diamond--left/);
  assert.match(ui, /sl-button__diamond--right/);
  assert.match(css, /\.sl-button--primary\s*\{[\s\S]*width:\s*var\(--sl-action-width\)/);
  assert.match(css, /\.sl-button--primary\s*\{[\s\S]*height:\s*var\(--sl-action-height\)/);
  assert.match(css, /width:\s*148px/);
  assert.match(css, /top:\s*50%/);
  assert.match(css, /margin-top:\s*-6px/);
  assert.match(css, /left:\s*1px/);
  assert.match(css, /right:\s*1px/);
});

test("secondary v3 matches the primary footprint while remaining visually subordinate", () => {
  const ui = read("apps/web/branding/src/components/Ui.jsx");
  const css = read("apps/web/branding/src/silverleaf-components.css");
  const foundations = read("apps/web/branding/src/pages/FoundationsPage.jsx");

  assert.match(ui, /secondary-button-default-v3/);
  assert.match(css, /\.sl-button--secondary\s*\{[\s\S]*width:\s*var\(--sl-action-width\)/);
  assert.match(css, /\.sl-button--secondary\s*\{[\s\S]*height:\s*var\(--sl-action-height\)/);
  assert.match(css, /background:\s*rgba\(3, 13, 10, 0\.55\)/);
  assert.match(foundations, /same 248 × 56 px footprint/);
  assert.match(foundations, /Secondary v3 review candidate/);
});

test("text and custom select controls are fluid and never use the native popup", () => {
  const ui = read("apps/web/branding/src/components/Ui.jsx");
  const css = read("apps/web/branding/src/silverleaf-components.css");
  const foundations = read("apps/web/branding/src/pages/FoundationsPage.jsx");

  assert.match(ui, /function TextInput/);
  assert.match(ui, /text-input-default-v3/);
  assert.match(ui, /function SelectInput/);
  assert.match(ui, /select-default-v2/);
  assert.match(ui, /role="combobox"/);
  assert.match(ui, /role="listbox"/);
  assert.match(ui, /sl-select-menu/);
  assert.doesNotMatch(ui, /<select className="sl-select-input__control"/);
  assert.match(css, /\.sl-text-input,[\s\S]*\.sl-select-input,[\s\S]*width:\s*100%/);
  assert.match(css, /height:\s*var\(--sl-field-height\)/);
  assert.match(css, /\.sl-select-menu\s*\{/);
  assert.match(foundations, /Custom listbox: no browser-native white popup/);
});

test("navigation cards chips and icons use one visual language", () => {
  const ui = read("apps/web/branding/src/components/Ui.jsx");
  const css = read("apps/web/branding/src/silverleaf-components.css");
  const foundations = read("apps/web/branding/src/pages/FoundationsPage.jsx");

  for (const component of [
    "sidebar-item-default-v2",
    "archive-card-default-v2",
    "chip-default-v2",
    "icon-button-default-v2"
  ]) assert.match(ui, new RegExp(component));

  assert.match(css, /\.sl-icon-medallion\s*\{/);
  assert.match(css, /\.sl-sidebar-item\.is-active/);
  assert.match(css, /\.sl-archive-card\s*\{/);
  assert.match(css, /\.sl-chip\s*\{/);
  assert.match(foundations, /Unified icon and navigation grammar/);
});

test("second layer primitives live in the same canonical component stylesheet", () => {
  const ui = read("apps/web/branding/src/components/Ui.jsx");
  const entry = read("apps/web/branding/src/branding.css");
  const css = read("apps/web/branding/src/silverleaf-components.css");
  const foundations = read("apps/web/branding/src/pages/FoundationsPage.jsx");

  assert.doesNotMatch(entry, /silverleaf-components-extra/);
  for (const component of [
    "textarea-default-v2",
    "tabs-default-v2",
    "icon-button-default-v2",
    "table-row-default-v2",
    "dialog-default-v2"
  ]) assert.match(ui, new RegExp(component));

  assert.match(css, /\.sl-textarea-input\s*\{/);
  assert.match(css, /\.sl-tabs\s*\{/);
  assert.match(css, /\.sl-table-row\s*\{/);
  assert.match(css, /\.sl-dialog-card\s*\{/);
  assert.match(foundations, /Tabs, Textarea & Icon Buttons/);
  assert.match(foundations, /Table Row & Dialog/);
});

test("shell uses Silverleaf branding instead of the old generic gem shell", () => {
  const shell = read("apps/web/branding/src/components/BrandingShell.jsx");
  const css = [
    read("apps/web/branding/src/base.css"),
    read("apps/web/branding/src/responsive.css")
  ].join("\n");

  assert.match(shell, /SilverleafLeafIcon/);
  assert.doesNotMatch(shell, /\bGem\b/);
  assert.match(shell, /TextInput className="branding-search"/);
  assert.match(shell, /branding-nav__marker/);
  assert.match(shell, /setCollapsed/);
  assert.match(shell, /setMobileOpen/);
  assert.match(css, /branding-sidebar\.is-mobile-open/);
  assert.match(css, /--sl-sidebar-expanded/);
  assert.match(css, /--sl-sidebar-collapsed/);
});

test("premium surface pass carries the primary button craft into the shell and content surfaces", () => {
  const entry = read("apps/web/branding/src/branding.css");
  const surface = read("apps/web/branding/src/silverleaf-surface-pass.css");

  assert.match(entry, /silverleaf-surface-pass\.css/);
  assert.match(surface, /\.sl-panel::before/);
  assert.match(surface, /\.sl-archive-card::before/);
  assert.match(surface, /\.sl-dialog-card::before/);
  assert.match(surface, /--sl-surface-gold-outer/);
  assert.match(surface, /--sl-surface-teal-inner/);
  assert.match(surface, /aspect-ratio:\s*1\s*\/\s*1/);
  assert.match(surface, /flex:\s*0\s+0\s+var\(--sl-icon-control-size\)/);
  assert.match(surface, /\.branding-grid--stats\s*\{/);
  assert.match(surface, /grid-template-columns:\s*repeat\(4, minmax\(220px, 1fr\)\)/);
  assert.match(surface, /container-name:\s*silverleaf-dense-data/);
  assert.match(surface, /@container silverleaf-dense-data \(max-width: 920px\)/);
});

test("review pages contain real interactive JSX rather than screenshots", () => {
  const character = read("apps/web/branding/src/pages/CharacterDossierPage.jsx");
  const dice = read("apps/web/branding/src/pages/DiceWorkspacePage.jsx");
  const invitations = read("apps/web/branding/src/pages/InvitationsPage.jsx");
  assert.match(character, /setActiveTab/);
  assert.match(character, /CharacterDossierPage/);
  assert.match(dice, /Math\.random/);
  assert.match(dice, /setHistory/);
  assert.match(invitations, /submitInvite/);
  assert.match(invitations, /setInvites/);
});

test("branding JSX does not import legacy production components or styles", () => {
  const sourceFiles = walk(path.join(brandingRoot, "src")).filter((file) => /\.(jsx|js|css)$/.test(file));
  for (const file of sourceFiles) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\.\.\/\.\.\/src\//, `${path.relative(root, file)} imports production source`);
    assert.doesNotMatch(source, /stage\d+|hotfix|stabilization/i, `${path.relative(root, file)} depends on legacy styling`);
  }
});
