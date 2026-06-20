import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PenLine } from "lucide-react";
import { api } from "../api/client.js";
import ArticleFactsPanel from "../components/ArticleFactsPanel.jsx";
import HierarchyPanel from "../components/HierarchyPanel.jsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import PageMap from "../components/PageMap.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";
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

export default function PageView({ mode, pages = [] }) {
  const { path } = useParams();
  const decodedPath = decodeURIComponent(path);
  const [page, setPage] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setPage(null);
    api.page(decodedPath, mode)
      .then((data) => setPage(data.page))
      .catch(() => setError(decodedPath));
  }, [decodedPath, mode]);

  if (error) {
    return (
      <div className="page-stack">
        <header className="list-header">
          <span className="kicker">Фантомная ссылка</span>
          <h1>{error}</h1>
          <p>На эту статью уже есть ссылка, но сам Markdown-файл ещё не создан.</p>
          <CodexButton as={Link} to={`/missing?target=${encodeURIComponent(error)}`}>
            Открыть в ненаписанных статьях
          </CodexButton>
        </header>
      </div>
    );
  }

  if (!page) return <div className="list-header"><h1>Загрузка статьи</h1></div>;

  return (
    <div className="page-stack">
      <header className="list-header article-page-header">
        <div className="article-title-block">
          <span className="kicker">{labelCategory(page.category)}</span>
          <h1>{page.title}</h1>
          <p>{page.summary}</p>
          <div className="tag-row">{page.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div>
        </div>
        {mode === "gm" && (
          <div className="editor-actions article-header-actions">
            <CodexButton as={Link} to={`/edit/${encodeURIComponent(page.path)}`} size="sm">
              <PenLine size={16} />
              <span>Редактировать</span>
            </CodexButton>
          </div>
        )}
      </header>
      <PageMap page={page} mode={mode} />
      <div className="article-main-layout">
        <div className="article-main-content">
          <HierarchyPanel title="Внутренний слой статьи" items={page.children} />
          <MarkdownViewer content={page.content} pages={pages} />
        </div>
        <ArticleFactsPanel page={page} mode={mode} />
      </div>
      <LinkList title="Связанные статьи" items={page.relatedPages} />
      <LinkList title="Обратные ссылки" items={page.backlinks} />
    </div>
  );
}
