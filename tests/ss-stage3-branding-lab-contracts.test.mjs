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

test("branding brochure exposes the approved four-page review flow", () => {
  const app = read("apps/web/branding/src/BrandingApp.jsx");
  for (const route of ["/foundations", "/character", "/dice", "/invitations"]) {
    assert.ok(app.includes(`path="${route}"`), `missing branding route ${route}`);
  }
});

test("Silverleaf Dark has a fixed semantic token and typography contract", () => {
  const tokens = read("apps/web/branding/src/theme/silverleaf-dark.css");
  for (const token of [
    "--sl-bg-canvas",
    "--sl-bg-sidebar",
    "--sl-bg-surface",
    "--sl-border-default",
    "--sl-text-primary",
    "--sl-accent-emerald",
    "--sl-accent-moon",
    "--sl-accent-gold",
    "--sl-danger",
    "--sl-focus",
    "--sl-sidebar-expanded",
    "--sl-sidebar-collapsed"
  ]) {
    assert.ok(tokens.includes(token), `missing semantic token ${token}`);
  }
  assert.match(tokens, /family=Cinzel/);
  assert.match(tokens, /family=Inter/);
  assert.match(tokens, /--sl-font-display:\s*"Cinzel"/);
  assert.match(tokens, /--sl-font-body:\s*"Inter"/);
});

test("corrected v3 primary button keeps the current default review geometry", () => {
  const ui = read("apps/web/branding/src/components/Ui.jsx");
  const css = read("apps/web/branding/src/silverleaf-components.css");
  const foundations = read("apps/web/branding/src/pages/FoundationsPage.jsx");
  const entry = read("apps/web/branding/src/branding.css");

  assert.match(entry, /silverleaf-components\.css/);
  assert.match(ui, /SilverleafLeafIcon/);
  assert.match(ui, /primary-button-default-v3/);
  assert.match(ui, /sl-button__diamond--left/);
  assert.match(ui, /sl-button__diamond--right/);
  assert.match(css, /width:\s*248px/);
  assert.match(css, /height:\s*56px/);
  assert.match(css, /width:\s*148px/);
  assert.match(css, /100%\s+84%/);
  assert.match(css, /7px\s+50%/);
  assert.match(css, /top:\s*50%/);
  assert.match(css, /margin-top:\s*-6px/);
  assert.match(css, /left:\s*1px/);
  assert.match(css, /right:\s*1px/);
  assert.doesNotMatch(css, /translate\([+-]?34%/);
  assert.match(foundations, /Primary Button · corrected v3/);
  assert.match(foundations, /Default candidate only/);
  assert.match(foundations, /No decorative corner dashes/);
});

test("shell prototype covers expanded, collapsed and mobile navigation", () => {
  const shell = read("apps/web/branding/src/components/BrandingShell.jsx");
  const css = [
    read("apps/web/branding/src/branding.css"),
    read("apps/web/branding/src/base.css"),
    read("apps/web/branding/src/responsive.css")
  ].join("\n");
  assert.match(shell, /setCollapsed/);
  assert.match(shell, /is-collapsed/);
  assert.match(shell, /setMobileOpen/);
  assert.match(css, /--sl-sidebar-expanded/);
  assert.match(css, /--sl-sidebar-collapsed/);
  assert.match(css, /branding-sidebar\.is-mobile-open/);
});

test("approved review pages contain real interactive JSX rather than screenshots", () => {
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
