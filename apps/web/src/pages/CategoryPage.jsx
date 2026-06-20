import { useParams } from "react-router-dom";
import EntityCard from "../components/EntityCard.jsx";
import WorldAtlas from "../components/WorldAtlas.jsx";
import TimelinePage from "./TimelinePage.jsx";
import { labelCategory } from "../utils/labels.js";

export default function CategoryPage({ pages, mode }) {
  const params = useParams();
  const category = `${params.category}${params["*"] ? `/${params["*"]}` : ""}`;
  const items = pages.filter((page) => page.category === category || page.category?.startsWith(`${category}/`));
  const title = labelCategory(category);

  if (category === "worlds") {
    return (
      <div className="page-stack">
        <header className="list-header worlds-header">
          <span className="kicker">Раздел архива</span>
          <h1>{title}</h1>
          <p>Главные миры кампании. Отсюда мастер проваливается в страны, города, NPC, врагов, квесты, локации и карты. Timeline стоит сразу под мирами, чтобы история не жила в отдельном подвале.</p>
        </header>
        <WorldAtlas pages={pages} />
        <TimelinePage pages={pages} mode={mode} embedded />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">Раздел архива</span>
        <h1>{title}</h1>
        <p>{items.length} видимых записей в режиме {mode === "gm" ? "GM" : "игрока"}.</p>
      </header>
      <div className="codex-card-grid card-grid">{items.map((page) => <EntityCard key={page.path} page={page} mode={mode} />)}</div>
    </div>
  );
}
