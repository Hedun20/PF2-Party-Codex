import { useParams } from "react-router-dom";
import EntityCard from "../components/EntityCard.jsx";
import { labelCategory } from "../utils/labels.js";

export default function CategoryPage({ pages, mode }) {
  const params = useParams();
  const category = `${params.category}${params["*"] ? `/${params["*"]}` : ""}`;
  const items = pages.filter((page) => page.category === category || page.category?.startsWith(`${category}/`));
  const title = labelCategory(category);

  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">Раздел архива</span>
        <h1>{title}</h1>
        <p>{items.length} видимых записей в режиме {mode === "gm" ? "GM" : "игрока"}.</p>
      </header>
      <div className="card-grid">{items.map((page) => <EntityCard key={page.path} page={page} mode={mode} />)}</div>
    </div>
  );
}
