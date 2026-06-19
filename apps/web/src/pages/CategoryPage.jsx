import { useParams } from "react-router-dom";
import EntityCard from "../components/EntityCard.jsx";

export default function CategoryPage({ pages, mode }) {
  const params = useParams();
  const category = `${params.category}${params["*"] ? `/${params["*"]}` : ""}`;
  const items = pages.filter((page) => page.category === category || page.category?.startsWith(`${category}/`));
  const title = category.split("/").map((part) => part.replace(/^\w/, (c) => c.toUpperCase())).join(" / ");

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
