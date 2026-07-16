import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { enrichPf2Character } from "../apps/server/src/services/pf2CharacterEnrichmentService.js";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Foundry enrichment recovers actions, spell ranks and actor defenses", () => {
  const enriched = enrichPf2Character({
    source: { type: "foundry-pf2e-actor-json" },
    stats: {},
    combat: { attacks: [{ name: "Longsword", bonus: 12 }], resistances: [], weaknesses: [], immunities: [] },
    magic: { spells: [{ name: "Fear" }] },
    progression: { feats: [{ name: "Reactive Strike", type: "class" }] },
    rawImport: {
      system: {
        attributes: {
          resistances: [{ type: "fire", value: 5 }],
          weaknesses: [{ type: "cold", value: 3 }],
          immunities: ["sleep"]
        },
        resources: { heroPoints: { value: 2 } }
      },
      items: [
        { name: "Longsword", type: "weapon", system: { category: "martial" } },
        { name: "Reactive Strike", type: "action", system: { actionType: { value: "reaction" } } },
        { name: "Fear", type: "spell", system: { level: { value: 1 }, actions: { value: 2 }, traits: { traditions: ["occult"] }, preparation: { mode: "prepared" } } },
        { name: "Frightened", type: "condition", system: { value: { value: 1 } } }
      ]
    }
  });

  assert.equal(enriched.stats.heroPoints, 2);
  assert.equal(enriched.combat.attacks[0].actions, "1");
  assert.equal(enriched.combat.resistances[0].value, 5);
  assert.equal(enriched.combat.weaknesses[0].value, 3);
  assert.equal(enriched.combat.conditions[0].name, "Frightened");
  assert.equal(enriched.progression.feats[0].actions, "reaction");
  assert.equal(enriched.magic.spells[0].level, 1);
  assert.equal(enriched.magic.spells[0].actions, "2");
  assert.equal(enriched.magic.spells[0].tradition, "occult");
});

test("Pathbuilder enrichment preserves existing values and fills missing tactical metadata", () => {
  const enriched = enrichPf2Character({
    source: { type: "pathbuilder-json" },
    stats: { heroPoints: 1 },
    combat: { attacks: [{ name: "Fist", actions: "1" }], resistances: ["physical 2"], weaknesses: [], immunities: [] },
    magic: { spells: [{ name: "Telekinetic Maneuver" }] },
    progression: { feats: [{ name: "Intimidating Glare", type: "skill" }] },
    rawImport: {
      build: {
        resistances: ["fire 5"],
        weaknesses: ["cold 3"],
        conditions: [{ name: "frightened", value: 1 }],
        spells: [{ name: "Telekinetic Maneuver", level: 2, actions: 2, tradition: "occult" }],
        skillFeats: [{ name: "Intimidating Glare", actions: 1 }]
      }
    }
  });

  assert.equal(enriched.stats.heroPoints, 1);
  assert.deepEqual(enriched.combat.resistances, ["physical 2"]);
  assert.equal(enriched.combat.weaknesses[0].value, 3);
  assert.equal(enriched.combat.conditions[0].value, 1);
  assert.equal(enriched.magic.spells[0].level, 2);
  assert.equal(enriched.magic.spells[0].actions, "2");
  assert.equal(enriched.progression.feats[0].actions, "1");
});

test("character persistence enriches normalized data before Mongo insertion", () => {
  const repository = read("apps/server/src/repositories/charactersRepository.js");

  assert.match(repository, /import \{ enrichPf2Character \}/);
  assert.match(repository, /const enriched = enrichPf2Character\(normalized\)/);
  assert.match(repository, /combat: enriched\.combat/);
  assert.match(repository, /magic: enriched\.magic/);
  assert.match(repository, /progression: enriched\.progression/);
});
