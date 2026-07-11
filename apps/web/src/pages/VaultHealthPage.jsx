import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import StatusMessage from "../components/ui/StatusMessage.jsx";

export default function VaultHealthPage({ mode }) {
  const [audit, setAudit] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setAudit(null);
    setError("");
    api.audit(mode)
      .then((data) => {
        if (active) setAudit(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Не удалось проверить vault.");
      });
    return () => {
      active = false;
    };
  }, [mode]);

  if (error) return <div className="page-stack"><StatusMessage tone="danger" role="alert">{error}</StatusMessage></div>;
  if (!audit) return <div className="list-header"><h1>Проверяем vault</h1></div>;

  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">Помощник мастера</span>
        <h1>Контроль vault</h1>
        <p>Система ищет битые пины, отсутствующие карты, статьи без связей и нарушенную иерархию.</p>
      </header>
      <section className="audit-summary">
        <div><strong>{audit.errors}</strong><span>ошибки</span></div>
        <div><strong>{audit.warnings}</strong><span>предупреждения</span></div>
        <div><strong>{audit.info}</strong><span>заметки</span></div>
      </section>
      <section className="audit-list">
        {(audit.issues || []).map((issue, index) => (
          <Link key={`${issue.path}-${index}`} className={`audit-item ${issue.level}`} to={`/page/${encodeURIComponent(issue.path)}`}>
            <span>{issue.level}</span>
            <strong>{issue.title}</strong>
            <p>{issue.message}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
