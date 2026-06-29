import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Eye, NotebookPen, PenLine, Plus, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import ArticleFactsPanel from "../components/ArticleFactsPanel.jsx";
import HierarchyPanel from "../components/HierarchyPanel.jsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import PageMap from "../components/PageMap.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";
import { labelCategory } from "../utils/labels.js";
import { notesForPage, usePlayerNotes } from "../utils/playerNotes.js";

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

function ArticleNotesPanel({ page }) {
  const { notes, addNote } = usePlayerNotes();
  const linkedNotes = useMemo(() => notesForPage(notes, page.path), [notes, page.path]);

  function addArticleNote() {
    addNote({ title: `Заметка: ${page.title}`, linkedPath: page.path, linkedTitle: page.title });
  }

  return (
    <section className="codex-card article-notes-panel">
      <div className="article-notes-head">
        <div>
          <span className="kicker">Personal notes</span>
          <h2>Мои заметки к статье</h2>
        </div>
        <NotebookPen size={20} />
      </div>
      {linkedNotes.length ? (
        <div className="article-notes-list">
          {linkedNotes.slice(0, 4).map((note) => (
            <Link key={note.id} to={`/notes?article=${encodeURIComponent(page.path)}`}>
              <strong>{note.title}</strong>
              <span>{note.body ? note.body.slice(0, 120) : "Пустая заметка"}</span>
            </Link>
          ))}
        </div>
      ) : <p className="empty-copy">К этой статье пока нет личных заметок.</p>}
      <div className="article-notes-actions">
        <CodexButton type="button" size="sm" onClick={addArticleNote}><Plus size={15} /> Добавить</CodexButton>
        <CodexButton as={Link} to={`/notes?article=${encodeURIComponent(page.path)}`} variant="secondary" size="sm">Открыть Notes</CodexButton>
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
  const [playerPreview, setPlayerPreview] = useState(null);
  const [previewMessage, setPreviewMessage] = useState("");
  const canEdit = mode === "gm";

  useEffect(() => {
    setError("");
    setPage(null);
    setPlayerPreview(null);
    setPreviewMessage("");
    api.page(decodedPath, mode)
      .then((data) => setPage(data.page))
      .catch(() => setError(decodedPath));
  }, [decodedPath, mode]);

  async function loadPlayerPreview() {
    setPreviewMessage("");
    setPlayerPreview(null);
    try {
      const data = await api.page(decodedPath, "player");
      setPlayerPreview(data.page);
      setPreviewMessage("Это ровно та player-safe версия, которую отдаёт player API.");
    } catch {
      setPreviewMessage("Игроки не смогут открыть эту статью: она GM-only, review-needed или скрыта целиком.");
    }
  }

  async function deleteCurrentPage() {
    if (!page || isDeleting || !canEdit) return;
    const backlinkCount = page.backlinks?.length || 0;
    const warning = backlinkCount ? `\n\nНа статью есть обратные ссылки: ${backlinkCount}. Файл уйдет в корзину, ссылки останутся фантомными.` : "";
    if (!window.confirm(`Удалить статью «${page.title}»?${warning}`)) return;

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
          <p>{canEdit ? "На эту статью уже есть ссылка, но Markdown-файл ещё не создан." : "Эта ссылка пока не опубликована для игроков."}</p>
          {canEdit ? (
            <CodexButton as={Link} to={`/missing?target=${encodeURIComponent(error)}`}>Открыть в ненаписанных статьях</CodexButton>
          ) : (
            <CodexButton as={Link} variant="secondary" to="/">Вернуться в архив</CodexButton>
          )}
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
        {canEdit && (
          <div className="editor-actions article-header-actions">
            <CodexButton type="button" variant="secondary" size="sm" onClick={loadPlayerPreview}><Eye size={16} /><span>Preview as Player</span></CodexButton>
            <CodexButton as={Link} to={`/edit/${encodeURIComponent(page.path)}`} size="sm"><PenLine size={16} /><span>Редактировать</span></CodexButton>
            <CodexButton type="button" variant="danger" size="sm" onClick={deleteCurrentPage} disabled={isDeleting}><Trash2 size={16} /><span>{isDeleting ? "Удаляю..." : "Удалить"}</span></CodexButton>
          </div>
        )}
      </header>
      {deleteMessage && <div className="status-message danger-message">{deleteMessage}</div>}
      {canEdit && page.playerSafety && (
        <section className={`codex-card article-safety-banner safety-${page.playerSafety.status}`}>
          <div>
            {page.playerSafety.status === "safe" ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
            <strong>{page.playerSafety.status === "safe" ? "Player-safe" : "Требует проверки перед игроками"}</strong>
            <p>{page.playerSafety.warnings?.[0] || "Секретных блоков не найдено. Игроки получат только public-версию."}</p>
          </div>
          <CodexButton as={Link} to="/player-safety" variant="ghost" size="sm">Открыть Safety Review</CodexButton>
        </section>
      )}
      {previewMessage && (
        <section className={`codex-card article-player-preview ${playerPreview ? "" : "is-blocked"}`}>
          <div className="article-player-preview-head">
            <span className="kicker">Preview as Player</span>
            <strong>{previewMessage}</strong>
          </div>
          {playerPreview?.content && <MarkdownViewer content={playerPreview.content} pages={pages} canEdit={false} />}
        </section>
      )}
      <PageMap page={page} mode={mode} />
      <div className="article-main-layout">
        <div className="article-main-content">
          <HierarchyPanel title="Внутренний слой статьи" items={page.children} />
          <MarkdownViewer content={page.content} pages={pages} canEdit={canEdit} />
        </div>
        <div className="article-side-stack">
          <ArticleFactsPanel page={page} mode={mode} />
          <ArticleNotesPanel page={page} />
        </div>
      </div>
      <LinkList title="Связанные статьи" items={page.relatedPages} />
      <LinkList title="Обратные ссылки" items={page.backlinks} />
    </div>
  );
}