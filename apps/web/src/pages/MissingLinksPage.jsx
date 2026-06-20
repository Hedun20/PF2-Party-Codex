import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileQuestion, PenLine } from "lucide-react";
import { api } from "../api/client.js";
import { labelCategory } from "../utils/labels.js";

export default function MissingLinksPage({ mode }) {
  const [searchParams] = useSearchParams();
  const target = searchParams.get("target") || "";
  const [missingLinks, setMissingLinks] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.missingLinks(mode)
      .then((data) => setMissingLinks(data.missingLinks))
      .catch((error) => setMessage(error.message));
  }, [mode]);

  const focused = useMemo(() => {
    if (!target) return missingLinks;
    const normalized = target.toLowerCase();
    return missingLinks.filter((item) => item.title.toLowerCase() === normalized);
  }, [missingLinks, target]);

  const items = focused.length ? focused : missingLinks;

  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">План работ по лору</span>
        <h1>Ненаписанные статьи</h1>
        <p>Здесь собраны wiki-ссылки из Markdown, на которые уже ссылается лор, но отдельной статьи ещё нет.</p>
      </header>

      {message && <p className="save-message">{message}</p>}

      <section className="missing-grid">
        {items.map((item) => (
          <article className={target === item.title ? "missing-card active" : "missing-card"} key={item.slug}>
            <div className="missing-card-head">
              <FileQuestion size={22} />
              <div>
                <span>{item.count} упоминаний</span>
                <h2>{item.title}</h2>
              </div>
            </div>
            <div className="missing-sources">
              {item.sources.map((source) => (
                <Link key={source.path} to={`/page/${encodeURIComponent(source.path)}`}>
                  <span>{labelCategory(source.category)}</span>
                  <strong>{source.title}</strong>
                </Link>
              ))}
            </div>
            <Link className="gold-button" to={`/editor?title=${encodeURIComponent(item.title)}`}>
              <PenLine size={16} />
              Создать статью
            </Link>
          </article>
        ))}
      </section>

      {!items.length && (
        <section className="tool-panel">
          <h2>Фантомных ссылок нет</h2>
          <p className="builder-hint">Можно писать новые будущие статьи прямо в Markdown через формат `[[Название будущей статьи]]`.</p>
        </section>
      )}
    </div>
  );
}
