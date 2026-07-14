import assert from "node:assert/strict";
import test from "node:test";
import { extractDiceFormula, numericModifier, rollCheck, rollFormula } from "../apps/web/src/utils/diceRoller.js";

test("dice formula extraction accepts PF2 damage text", () => {
  assert.equal(extractDiceFormula("2d8+6 рубящего"), "2d8+6");
  assert.equal(extractDiceFormula("урон: 4d6 + 4 психического"), "4d6+4");
  assert.equal(extractDiceFormula("без формулы"), "");
});

test("formula rolls expose total and readable breakdown", () => {
  const roll = rollFormula("2d8+6", { label: "Бастард-меч · урон", rng: () => 0 });
  assert.equal(roll.label, "Бастард-меч · урон");
  assert.equal(roll.formula, "2d8+6");
  assert.deepEqual(roll.rolls, [1, 1]);
  assert.equal(roll.total, 8);
  assert.equal(roll.breakdown, "1 + 1 + 6 = 8");
});

test("checks normalize signed modifiers into a d20 roll", () => {
  assert.equal(numericModifier("атака +15"), 15);
  const roll = rollCheck("Запугивание", "+16", () => 0);
  assert.equal(roll.formula, "1d20+16");
  assert.equal(roll.total, 17);
});
