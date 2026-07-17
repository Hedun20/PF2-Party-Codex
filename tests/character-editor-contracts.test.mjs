import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { calculateSkillModifier, proficiencyBonus } from "../apps/web/src/utils/characterMath.js";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("PF2e proficiency adds level only for trained ranks", () => {
  assert.equal(proficiencyBonus("untrained", 6), 0);
  assert.equal(proficiencyBonus("trained", 6), 8);
  assert.equal(proficiencyBonus("expert", 6), 10);
  assert.equal(proficiencyBonus("master", 6), 12);
  assert.equal(proficiencyBonus("legendary", 6), 14);
});

test("automatic and manual skill modes produce deterministic modifiers", () => {
  const context = { level: 6, abilities: { cha: 4 } };
  assert.equal(calculateSkillModifier({ ability: "cha", rank: "master", itemBonus: 0, otherBonus: 0, calculationMode: "auto" }, context), 16);
  assert.equal(calculateSkillModifier({ ability: "cha", rank: "master", manualModifier: 19, calculationMode: "manual" }, context), 19);
});

test("character editor uses separate structured rows instead of pipe-delimited textareas", () => {
  const editor = read("apps/web/src/components/CharacterEditorView.jsx");
  assert.match(editor, /Добавить навык/);
  assert.match(editor, /Добавить атаку/);
  assert.match(editor, /Добавить способность/);
  assert.match(editor, /Добавить заклинание или силу/);
  assert.match(editor, /Добавить предмет/);
  assert.doesNotMatch(editor, /название \| бонус/);
  assert.doesNotMatch(editor, /название \| ранг/);
});

test("character dossier prioritizes table play before reference material", () => {
  const dossier = read("apps/web/src/pages/CharactersPage.jsx");
  const styles = read("apps/web/src/styles/stage21-character-dossier.css");
  const tablePlay = dossier.indexOf('data-character-zone="table-play"');
  const reference = dossier.indexOf('data-character-zone="reference"');

  assert.ok(tablePlay >= 0, "table-play zone is present");
  assert.ok(reference > tablePlay, "reference rail follows the primary table-play zone");
  assert.match(dossier, /character-tactical-strip/);
  assert.match(dossier, /character-dossier-layout--single/);
  assert.match(styles, /\.character-dossier-main/);
  assert.match(styles, /\.character-dossier-reference/);
  assert.match(styles, /@media \(max-width: 680px\)/);
});

test("global native selects are not intercepted by a custom select layer", () => {
  const shell = read("apps/web/src/components/ApplicationShell.jsx");
  const topbar = read("apps/web/src/components/CodexTopbar.jsx");
  assert.doesNotMatch(shell, /MagicSelectLayer/);
  assert.doesNotMatch(topbar, /MagicSelectLayer|CodexSelect/);
  assert.match(shell, /CodexTopbar/);
  assert.match(topbar, /<select aria-label="Активная кампания"/);
});

test("timeline uses the shared padded entity detail inspector", () => {
  const timeline = read("apps/web/src/pages/TimelinePage.jsx");
  const inspector = read("apps/web/src/components/EntityDetailPanel.jsx");
  assert.match(timeline, /EntityDetailPanel/);
  assert.match(inspector, /entity-detail-panel__facts/);
  assert.match(inspector, /entity-detail-panel__actions/);
});
