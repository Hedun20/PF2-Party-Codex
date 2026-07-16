import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  actionKey,
  actionLabel,
  characterAbilities,
  defensiveCollections,
  skillRanks,
  spellsByRank
} from "../apps/web/src/utils/pf2CharacterPresentation.js";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("PF2 action economy separates actions, reactions and passive feats", () => {
  const grouped = characterAbilities({
    feats: [
      { name: "Exploit Vulnerability", type: "class", actions: "1" },
      { name: "Reactive Strike", type: "class", actions: "reaction" },
      { name: "Toughness", type: "general" }
    ]
  });

  assert.equal(actionKey(grouped.actions[0]), "1");
  assert.equal(actionLabel(grouped.actions[0]), "1 действие");
  assert.equal(grouped.actions.length, 1);
  assert.equal(grouped.reactions.length, 1);
  assert.equal(grouped.passiveGroups[0].label, "Общие фиты");
});

test("spells are grouped from highest rank down with cantrips at rank zero", () => {
  const groups = spellsByRank([
    { name: "Shield", level: 0 },
    { name: "Fear", rank: 1 },
    { name: "Fireball", level: 3 }
  ]);

  assert.deepEqual(groups.map((group) => group.rank), [3, 1, 0]);
  assert.equal(groups[2].label, "Чары");
});

test("defenses and imported proficiency aliases remain structured", () => {
  const defenses = defensiveCollections({
    resistances: ["fire 5"],
    weaknesses: [{ name: "cold", value: 3 }],
    immunities: ["sleep"],
    conditions: [{ name: "frightened", value: 1 }]
  });
  const ranks = skillRanks([
    { rank: "Мастер" },
    { rank: "Эксперт" },
    { rank: "trained" }
  ]);

  assert.deepEqual(defenses.map((group) => group.items.length), [1, 1, 1, 1]);
  assert.deepEqual(ranks.map((item) => item.label), ["Обучен", "Эксперт", "Мастер"]);
});

test("character dossier presents PF2 table-play sections before reference groups", () => {
  const dossier = read("apps/web/src/pages/CharactersPage.jsx");

  assert.match(dossier, /title="Действия"/);
  assert.match(dossier, /title="Реакции"/);
  assert.match(dossier, /spellsByRank/);
  assert.match(dossier, /defensiveCollections/);
  assert.match(dossier, /title="Владение навыками"/);
  assert.match(dossier, /Временные HP/);
  assert.match(dossier, /Фокус/);
  assert.ok(dossier.indexOf('data-character-zone="table-play"') < dossier.indexOf('data-character-zone="reference"'));
});

test("character editor persists PF2 actions, defenses, conditions and spell rank data", () => {
  const editor = read("apps/web/src/components/CharacterEditorView.jsx");

  assert.match(editor, /\["defenses", "Защиты"\]/);
  assert.match(editor, /proficiencyRank/);
  assert.match(editor, /resistances: defensePayload\("resistances"\)/);
  assert.match(editor, /weaknesses: defensePayload\("weaknesses"\)/);
  assert.match(editor, /immunities: defensePayload\("immunities"\)/);
  assert.match(editor, /conditions: defensePayload\("conditions"\)/);
  assert.match(editor, /focusPoints: numeric\(form\.focusPoints\)/);
  assert.match(editor, /Подготовка/);
  assert.match(editor, /ActionSelect/);
});
