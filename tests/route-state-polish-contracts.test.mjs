import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("manager routes use a role-aware forbidden page instead of a placeholder", () => {
  const app = read("apps/web/src/App.jsx");
  const denied = read("apps/web/src/pages/AccessDeniedPage.jsx");

  assert.match(app, /const AccessDeniedPage = lazy/);
  assert.match(app, /const accessDeniedElement = <AccessDeniedPage session=\{session\} \/>/);
  assert.doesNotMatch(app, /SimplePlaceholderPage/);
  assert.match(denied, /403 · Campaign permissions/);
  assert.match(denied, /to="\/player"/);
  assert.match(denied, /to="\/archive"/);
  assert.match(denied, /to="\/campaigns"/);
  assert.equal(fs.existsSync(new URL("../apps/web/src/pages/SimplePlaceholderPage.jsx", import.meta.url)), false);
});

test("not-found recovery follows authentication and campaign state", () => {
  const app = read("apps/web/src/App.jsx");
  const notFound = read("apps/web/src/pages/NotFoundPage.jsx");

  assert.match(app, /<NotFoundPage session=\{session\} \/>/);
  assert.match(notFound, /const signedIn = Boolean\(session\?\.user\)/);
  assert.match(notFound, /const hasCampaign = Boolean\(session\?\.activeMembership\?\.id\)/);
  assert.match(notFound, /to="\/archive"/);
  assert.match(notFound, /to="\/campaigns"/);
  assert.match(notFound, /to="\/login"/);
});

test("campaign archive exposes loading, access-change, retry and empty states", () => {
  const archive = read("apps/web/src/pages/CampaignArchivePage.jsx");

  assert.match(archive, /const \[reloadKey, setReloadKey\]/);
  assert.match(archive, /\[401, 403\]\.includes/);
  assert.match(archive, /actionLabel=\{accessChanged \? "Выбрать кампанию" : "Повторить"\}/);
  assert.match(archive, /setReloadKey\(\(value\) => value \+ 1\)/);
  assert.match(archive, /<EmptyState/);
  assert.match(archive, /<StatusMessage>/);
  assert.match(archive, /countSections\.map/);
});

test("recent archive articles navigate directly to their canonical page", () => {
  const archive = read("apps/web/src/pages/CampaignArchivePage.jsx");

  assert.match(archive, /function itemTarget\(section, item = \{\}\)/);
  assert.match(archive, /if \(section === "entries" && item\.path\)/);
  assert.match(archive, /`\/page\/\$\{encodeURIComponent\(item\.path\)\}`/);
  assert.match(archive, /<Link to=\{itemTarget\(section, item\)\}>/);
});
