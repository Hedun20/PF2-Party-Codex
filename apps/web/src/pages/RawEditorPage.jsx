import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../api/client.js";
import ArticleVisualEditor from "../components/ArticleVisualEditor.jsx";

export default function RawEditorPage({ mode, onSaved, pages = [] }) {
  const { path } = useParams();
  const decodedPath = decodeURIComponent(path);
  const navigate = useNavigate();
  const [raw, setRaw] = useState("");
  const [frontmatter, setFrontmatter] = useState(null);
  const [content, setContent] = useState("");
  const [page, setPage] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (mode !== "gm") return;
    setMessage("");
    api.rawPage(decodedPath, mode)
      .then((data) => {
        setRaw(data.raw || "");
        setPage(data.page);
        setFrontmatter(data.frontmatter || {});
        setContent(data.content || "");
      })
      .catch((error) => setMessage(error.message));
  }, [decodedPath, mode]);

  async function saveRaw() {
    try {
      const data = await api.saveRawPage({ requestedPath: decodedPath, raw });
      setMessage(`Markdown сохранён: ${data.page.path}`);
      onSaved?.();
      navigate(`/page/${encodeURIComponent(data.page.path)}`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveStructured() {
    try {
      const title = frontmatter.name || frontmatter.title || page?.title || "Без названия";
      const data = await api.savePage({
        requestedPath: decodedPath,
        frontmatter: {
          ...(frontmatter || {}),
          title,
          name: title,
          type: frontmatter?.type || "lore",
          category: frontmatter?.category || page?.category || "lore",
          visibility: frontmatter?.visibility || "public"
        },
        content
      });
      setMessage(`Статья сохранена: ${data.page.path}`);
      onSaved?.();
      navigate(`/page/${encodeURIComponent(data.page.path)}`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (mode !== "gm") {
    return (
      <div className="page-stack">
        <header className="list-header">
          <span className="kicker">Только для мастера</span>
          <h1>Редактор скрыт</h1>
          <p>Переключись в GM-режим, чтобы редактировать Markdown-файлы.</p>
        </header>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <header className="list-header editor-hero article-page-header">
        <div>
          <span className="kicker">Редактор статьи</span>
          <h1>{page?.title || "Загрузка статьи"}</h1>
          <p>{decodedPath}</p>
        </div>
        <div className="editor-actions article-header-actions">
          <Link className="upload-button" to={`/page/${encodeURIComponent(decodedPath)}`}>
            <ArrowLeft size={16} /> Вернуться к статье
          </Link>
        </div>
      </header>

      <ArticleVisualEditor
        frontmatter={frontmatter}
        content={content}
        raw={raw}
        pages={pages}
        mode="edit"
        path={decodedPath}
        onFrontmatterChange={setFrontmatter}
        onContentChange={setContent}
        onRawChange={setRaw}
        onSaveStructured={saveStructured}
        onSaveRaw={saveRaw}
        message={message}
      />
    </div>
  );
}
