function safeRandom(rng = Math.random) {
  const value = Number(rng());
  if (!Number.isFinite(value)) return 0;
  return Math.min(0.999999999, Math.max(0, value));
}

export function numericModifier(value) {
  if (value === undefined || value === null || value === "") return 0;
  const match = String(value).replace(/\s+/g, "").match(/[+-]?\d+/);
  return match ? Number(match[0]) : 0;
}

export function extractDiceFormula(value = "") {
  const match = String(value).match(/(?:^|\s)(\d*)d(\d+)(?:\s*([+-])\s*(\d+))?/i);
  if (!match) return "";
  const count = Number(match[1] || 1);
  const sides = Number(match[2]);
  const modifier = match[3] && match[4] ? `${match[3]}${match[4]}` : "";
  if (!Number.isInteger(count) || count < 1 || count > 100) return "";
  if (!Number.isInteger(sides) || sides < 2 || sides > 1000) return "";
  return `${count}d${sides}${modifier}`;
}

export function rollFormula(value, { label = "Бросок", rng = Math.random } = {}) {
  const formula = extractDiceFormula(value);
  if (!formula) return null;
  const parsed = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!parsed) return null;

  const count = Number(parsed[1]);
  const sides = Number(parsed[2]);
  const modifier = Number(parsed[3] || 0);
  const rolls = Array.from({ length: count }, () => Math.floor(safeRandom(rng) * sides) + 1);
  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
  const modifierText = modifier > 0 ? ` + ${modifier}` : modifier < 0 ? ` - ${Math.abs(modifier)}` : "";

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label,
    formula,
    rolls,
    modifier,
    total,
    breakdown: `${rolls.join(" + ")}${modifierText} = ${total}`
  };
}

export function rollCheck(label, modifier, rng = Math.random) {
  const normalized = numericModifier(modifier);
  const formula = `1d20${normalized > 0 ? `+${normalized}` : normalized < 0 ? normalized : ""}`;
  return rollFormula(formula, { label, rng });
}
