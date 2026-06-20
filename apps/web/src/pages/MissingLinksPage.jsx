import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileQuestion, PenLine, Sparkles } from "lucide-react";
import { api } from "../api/client.js";
import CodexButton from "../components/ui/CodexButton.jsx";
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
      <header className="list-header missing-hero">
        <span className="kicker">План работ по лору</span>
        <h1>Ненаписанные статьи</h1>
        <p>Сюда попадают wiki-ссылки из Markdown, на которые уже ссылается лор, но отдельной статьи ещё нет.</p>
      </header>

      {message && <p className="save-message">{message}</p>}

      <section className="missing-guide-panel">
        <div>
          <span className="kicker">Как это работает</span>
          <h2>Пиши сначала историю, а статьи создавай потом</h2>
          <p>В любой Markdown-статье можно написать `[[Восстание крестьян 1342]]`. Если такой статьи нет, ссылка станет фантомной и появится в этом списке.</p>
        </div>
        <CodexButton as={Link} to="/editor?title=Восстание крестьян 1342">
          <Sparkles size={16} />
          Попробовать пример
        </CodexButton>
      </section>

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
            <CodexButton as={Link} to={`/editor?title=${encodeURIComponent(item.title)}`}>
              <PenLine size={16} />
              Создать статью
            </CodexButton>
          </article>
        ))}
      </section>

      {!items.length && (
        <section className="empty-missing-state">
          <FileQuestion size={34} />
          <div>
            <h2>Фантомных ссылок пока нет</h2>
            <p>Это хороший знак: текущий vault не содержит ссылок на несуществующие статьи. Чтобы проверить механику, добавь в любую статью ссылку формата `[[Название будущей статьи]]`.</p>
          </div>
        </section>
      )}
    </div>
  );
}
