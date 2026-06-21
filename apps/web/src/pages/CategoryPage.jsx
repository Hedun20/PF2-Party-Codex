import { Link, useParams } from "react-router-dom";
import EntityCard from "../components/EntityCard.jsx";
import WorldAtlas from "../components/WorldAtlas.jsx";
import { labelCategory } from "../utils/labels.js";
import { worldRoute } from "../utils/worldContext.js";

export default function CategoryPage({ pages, mode, activeWorld = null }) {
  const params = useParams();
  const category = `${params.category}${params["*"] ? `/${params["*"]}` : ""}`;
  const items = pages.filter((page) => page.category === category || page.category?.startsWith(`${category}/`));
  const title = labelCategory(category);

  if (category === "worlds" && !activeWorld) {
    return (
      <div className="page-stack">
        <header className="list-header worlds-header">
          <span className="kicker">Раздел архива</span>
          <h1>{title}</h1>
          <p>Главные миры кампании. Это отдельный World Hub: широкие карточки миров, атмосфера, быстрые связи и вход в статьи. Timeline вынесен в собственный раздел, чтобы история не мешала обзору миров.</p>
        </header>
        <WorldAtlas pages={pages} />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">{activeWorld ? `Мир: ${activeWorld.title}` : "Раздел архива"}</span>
        <h1>{title}</h1>
        <p>{items.length} видимых записей {activeWorld ? "в этом мире" : "в общем архиве"} в режиме {mode === "gm" ? "GM" : "игрока"}.</p>
        {activeWorld && <Link className="small-context-link" to={worldRoute(activeWorld)}>← Вернуться на главную мира</Link>}
      </header>
      <div className="codex-card-grid card-grid">{items.map((page) => <EntityCard key={page.path} page={page} mode={mode} />)}</div>
    </div>
  );
}
