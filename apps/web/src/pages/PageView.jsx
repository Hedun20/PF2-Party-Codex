import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { api } from "../api/client.js";
import HierarchyPanel from "../components/HierarchyPanel.jsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import PageMap from "../components/PageMap.jsx";
import { labelCategory } from "../utils/labels.js";

function LinkList({ title, items = [] }) {
  if (!items.length) return null;
  return (
    <section className="link-panel">
      <h2>{title}</h2>
      <div className="related-grid">
        {items.map((item) => (
          <Link key={item.path} to={`/page/${encodeURIComponent(item.path)}`}>
            <span>{labelCategory(item.category)}</span>
            <strong>{item.title}</strong>
            <p>{item.summary}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function PageView({ mode }) {
  const { path } = useParams();
  const decodedPath = decodeURIComponent(path);
  const [page, setPage] = useState(null);

  useEffect(() => {
    api.page(decodedPath, mode).then((data) => setPage(data.page));
  }, [decodedPath, mode]);

  if (!page) return <div className="list-header"><h1>Загрузка статьи</h1></div>;

  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">{labelCategory(page.category)}</span>
        <h1>{page.title}</h1>
        <p>{page.summary}</p>
        <div className="tag-row">{page.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div>
      </header>
      <PageMap page={page} />
      <HierarchyPanel title="Внутренний слой статьи" items={page.children} />
      <MarkdownViewer content={page.content} />
      <LinkList title="Связанные статьи" items={page.relatedPages} />
      <LinkList title="Обратные ссылки" items={page.backlinks} />
    </div>
  );
}
