export const mapObjectTypes = [
  { value: "city", label: "Город", color: "#8ad8ff" },
  { value: "country", label: "Страна", color: "#f0ce7a" },
  { value: "location", label: "Локация", color: "#4dd4a1" },
  { value: "npc", label: "NPC", color: "#d8b4fe" },
  { value: "enemy", label: "Враг", color: "#ff6b6b" },
  { value: "quest", label: "Квест", color: "#ffd166" },
  { value: "danger", label: "Опасность", color: "#ff8f3d" },
  { value: "secret", label: "Секрет GM", color: "#e54bb4" },
  { value: "portal", label: "Портал", color: "#7c5cff" },
  { value: "trade", label: "Торговля", color: "#52e6b8" }
];

export const mapObjectTypeByValue = Object.fromEntries(mapObjectTypes.map((item) => [item.value, item]));

export function labelMapObjectType(value = "location") {
  return mapObjectTypeByValue[value]?.label || value || "Объект";
}

export function colorMapObjectType(value = "location") {
  return mapObjectTypeByValue[value]?.color || "#4dd4a1";
}

export function pageToMapObjectType(page = {}) {
  const type = page.type || page.category;
  const category = page.category || "";
  if (type === "city" || category === "cities") return "city";
  if (type === "country" || category === "countries") return "country";
  if (type === "npc" || category === "npcs") return "npc";
  if (type === "enemy" || category === "enemies") return "enemy";
  if (type === "quest" || category === "quests") return "quest";
  if (type === "location" || category === "locations") return "location";
  return "location";
}
