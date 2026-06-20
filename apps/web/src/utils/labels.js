export const categoryLabels = {
  dashboard: "Главная",
  _guides: "Гайды",
  _examples: "Примеры",
  worlds: "Миры",
  countries: "Страны",
  cities: "Города",
  characters: "Персонажи",
  npcs: "NPC",
  enemies: "Враги",
  quests: "Квесты",
  sessions: "Сессии",
  locations: "Локации",
  maps: "Карты",
  timeline: "Timeline",
  lore: "Лор",
  "lore/gods": "Боги",
  "lore/factions": "Фракции",
  "lore/history": "История",
  "lore/planes": "Планы",
  "lore/artifacts": "Артефакты",
  "lore/magic": "Магия",
  "lore/cults": "Культы",
  "lore/prophecies": "Пророчества",
  "lore/timeline": "Timeline"
};

export function labelCategory(category = "") {
  return categoryLabels[category] || category;
}
