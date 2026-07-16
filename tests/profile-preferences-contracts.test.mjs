import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("profiles are unique per user and update the canonical account name", () => {
  const repository = read("apps/server/src/repositories/profilesRepository.js");

  assert.match(repository, /collections\.profiles/);
  assert.match(repository, /createIndex\(\{ userId: 1 \}, \{ unique: true \}\)/);
  assert.match(repository, /LANGUAGES = new Set\(\["ru", "en", "de", "uk"\]\)/);
  assert.match(repository, /THEMES = new Set\(\["system", "dark", "light"\]\)/);
  assert.match(repository, /Display name must be 120 characters or fewer/);
  assert.match(repository, /users\(\)\.updateOne/);
  assert.match(repository, /name: displayName/);
});

test("profile API is authenticated, audited and mounted without expanding route surface accounting", () => {
  const routes = read("apps/server/src/routes/auth.js");

  assert.match(routes, /const profileRouter = Router\(\)/);
  assert.match(routes, /profileRouter\.get\("\/"/);
  assert.match(routes, /profileRouter\.patch\("\/"/);
  assert.match(routes, /requireUser\(req\)/);
  assert.match(routes, /authRouter\.use\("\/profile", profileRouter\)/);
  assert.match(routes, /action: "profile\.update"/);
});

test("profile page remains available without campaign membership and saves account preferences", () => {
  const page = read("apps/web/src/pages/ProfilePage.jsx");
  const client = read("apps/web/src/api/client.js");

  assert.match(client, /profile: \(\) => request\("\/profile"\)/);
  assert.match(client, /updateProfile: \(payload\) => request\("\/profile", \{ method: "PATCH"/);
  assert.match(page, /api\.profile\(\)/);
  assert.match(page, /api\.updateProfile\(form\)/);
  assert.match(page, /option value="ru"/);
  assert.match(page, /option value="system"/);
  assert.match(page, /Создать или выбрать кампанию/);
  assert.doesNotMatch(page, /return <OnboardingPage/);
});

test("editable profile workspace reuses established responsive layout primitives", () => {
  const page = read("apps/web/src/pages/ProfilePage.jsx");
  const index = read("apps/web/src/styles/index.css");

  assert.match(page, /workspace-grid settings-grid/);
  assert.match(page, /editor-form profile-editor-card/);
  assert.match(page, /builder-section two-col/);
  assert.doesNotMatch(index, /stage26-profile\.css/);
});
