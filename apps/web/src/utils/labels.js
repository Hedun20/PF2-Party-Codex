export const categoryLabels = {
  dashboard: "Главная",
  worlds: "Миры",
  countries: "Страны",
  cities: "Города",
  npcs: "NPC",
  enemies: "Враги",
  quests: "Квесты",
  sessions: "Сессии",
  locations: "Локации",
  lore: "Лор",
  "lore/gods": "Боги",
  "lore/factions": "Фракции",
  "lore/history": "История",
  "lore/planes": "Планы",
  "lore/artifacts": "Артефакты",
  "lore/magic": "Магия",
  "lore/cults": "Культы",
  "lore/prophecies": "Пророчества"
};

export function labelCategory(category = "") {
  return categoryLabels[category] || category;
}
