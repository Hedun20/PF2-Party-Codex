import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PenLine, Trash2 } from "lucide-react";
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

export default function PageView({ mode, pages = [], onChanged }) {
  const { path } = useParams();
  const decodedPath = decodeURIComponent(path);
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [error, setError] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setError("");
    setPage(null);
    api.page(decodedPath, mode)
      .then((data) => setPage(data.page))
      .catch(() => setError(decodedPath));
  }, [decodedPath, mode]);


  async function deleteCurrentPage() {
    if (!page || isDeleting) return;
    const backlinkCount = page.backlinks?.length || 0;
    const warning = backlinkCount
      ? `\n\nНа статью есть обратные ссылки: ${backlinkCount}. Ссылки останутся как фантомные/ненаписанные, сам файл уйдёт в корзину.`
      : "";
    const confirmed = window.confirm(`Удалить статью «${page.title}»?${warning}\n\nФайл будет перемещён в _trash, не уничтожен навсегда.`);
    if (!confirmed) return;

    setIsDeleting(true);
    setDeleteMessage("");
    try {
      const data = await api.deletePage(page.path);
      await onChanged?.();
      navigate(page.category ? `/category/${page.category}` : "/", { replace: true });
      setDeleteMessage(`Статья перемещена в корзину: ${data.deleted.trashPath}`);
    } catch (deleteError) {
      setDeleteMessage(deleteError.message);
    } finally {
      setIsDeleting(false);
    }
  }

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
            <CodexButton type="button" variant="danger" size="sm" onClick={deleteCurrentPage} disabled={isDeleting}>
              <Trash2 size={16} />
              <span>{isDeleting ? "Удаляю…" : "Удалить"}</span>
            </CodexButton>
          </div>
        )}
      </header>
      {deleteMessage && <div className="status-message danger-message">{deleteMessage}</div>}
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
