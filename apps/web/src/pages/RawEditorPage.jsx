import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Save } from "lucide-react";
import { api } from "../api/client.js";

export default function RawEditorPage({ mode, onSaved }) {
  const { path } = useParams();
  const decodedPath = decodeURIComponent(path);
  const navigate = useNavigate();
  const [raw, setRaw] = useState("");
  const [page, setPage] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (mode !== "gm") return;
    api.rawPage(decodedPath, mode)
      .then((data) => {
        setRaw(data.raw);
        setPage(data.page);
      })
      .catch((error) => setMessage(error.message));
  }, [decodedPath, mode]);

  async function save() {
    try {
      const data = await api.saveRawPage({ requestedPath: decodedPath, raw });
      setMessage(`Сохранено: ${data.page.path}`);
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
      <header className="list-header editor-hero">
        <span className="kicker">Редактор Markdown</span>
        <h1>{page?.title || "Загрузка статьи"}</h1>
        <p>{decodedPath}</p>
        <div className="editor-actions">
          <button className="gold-button" type="button" onClick={save}>
            <Save size={16} />
            Сохранить
          </button>
          <Link className="upload-button" to={`/page/${encodeURIComponent(decodedPath)}`}>Вернуться к статье</Link>
        </div>
      </header>

      <section className="raw-editor-panel">
        <textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          spellCheck="false"
          aria-label="Markdown статьи"
        />
      </section>

      {message && <p className="save-message">{message}</p>}
    </div>
  );
}
