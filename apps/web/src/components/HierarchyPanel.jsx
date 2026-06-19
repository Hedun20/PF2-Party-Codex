import { Link } from "react-router-dom";

function toPage(path) {
  return `/page/${encodeURIComponent(path)}`;
}

const labels = {
  worlds: "Миры",
  countries: "Страны",
  cities: "Города",
  npcs: "NPC",
  enemies: "Враги",
  quests: "Квесты",
  locations: "Локации",
  sessions: "Сессии",
  lore: "Лор"
};

export default function HierarchyPanel({ title = "Дочерние статьи", items = [] }) {
  if (!items.length) return null;
  const groups = items.reduce((acc, item) => {
    const key = item.category || item.type || "lore";
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <section className="hierarchy-panel">
      <div className="panel-heading">
        <span className="kicker">Niagara-структура</span>
        <h2>{title}</h2>
      </div>
      <div className="hierarchy-columns">
        {Object.entries(groups).map(([category, pages]) => (
          <div className="hierarchy-column" key={category}>
            <h3>{labels[category] || category}</h3>
            {pages.map((page) => (
              <Link key={page.path} to={toPage(page.path)}>
                <strong>{page.title}</strong>
                <span>{page.summary}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
