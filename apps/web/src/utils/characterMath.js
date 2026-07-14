export const PROFICIENCY_RANKS = [
  { value: "untrained", label: "Необучен", bonus: 0 },
  { value: "trained", label: "Обучен", bonus: 2 },
  { value: "expert", label: "Эксперт", bonus: 4 },
  { value: "master", label: "Мастер", bonus: 6 },
  { value: "legendary", label: "Легенда", bonus: 8 }
];

export const ABILITY_OPTIONS = [
  { value: "str", label: "Сила" },
  { value: "dex", label: "Ловкость" },
  { value: "con", label: "Телосложение" },
  { value: "int", label: "Интеллект" },
  { value: "wis", label: "Мудрость" },
  { value: "cha", label: "Харизма" }
];

export function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function proficiencyBonus(rank = "untrained", level = 1) {
  const record = PROFICIENCY_RANKS.find((item) => item.value === rank);
  if (!record || record.value === "untrained") return 0;
  return numeric(level, 1) + record.bonus;
}

export function calculateSkillModifier(skill = {}, { level = 1, abilities = {} } = {}) {
  if ((skill.calculationMode || "auto") === "manual") return numeric(skill.manualModifier ?? skill.modifier, 0);
  return numeric(abilities[skill.ability || "int"], 0)
    + proficiencyBonus(skill.rank, level)
    + numeric(skill.itemBonus, 0)
    + numeric(skill.otherBonus, 0);
}

export function withCalculatedModifier(skill = {}, context = {}) {
  return { ...skill, modifier: calculateSkillModifier(skill, context) };
}
