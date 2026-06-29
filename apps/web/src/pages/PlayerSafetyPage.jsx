import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, FileSearch, Filter, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "../api/client.js";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";
import { labelCategory } from "../utils/labels.js";

const filters = [
  ["all", "Все"],
  ["review-needed", "Проверить"],
  ["contains-secrets", "Есть секреты"],
  ["gm-only", "Только GM"],
  ["safe", "Безопасно"]
];

function statusLabel(status) {
  return {
    safe: "Безопасно",
    "contains-secrets": "Есть секреты",
    "gm-only": "Только GM",
    "review-needed": "Нужно проверить"
  }[status] || status;
}

function statusIcon(status) {
  if (status === "safe") return <CheckCircle2 size={16} />;
  if (status === "gm-only") return <EyeOff size={16} />;
  if (status === "contains-secrets") return <ShieldAlert size={16} />;
  return <AlertTriangle size={16} />;
}

function compact(value = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

function dangerMessage(message = "") {
  return /access|gm|forbidden|ошиб|нельзя/i.test(message);
}

export default function PlayerSafetyPage({ pages = [] }) {
  const [report, setReport] = useState({ totals: {}, pages: [] });
  const [filter, setFilter] = useState("review-needed");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.playerSafety()
      .then((data) => {
        setReport(data);
        setFocused(data.pages?.find((item) => item.safety?.reviewNeeded) || data.pages?.[0] || null);
      })
      .catch((error) => setMessage(error.message));
  }, []);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (report.pages || []).filter((item) => {
      const statusMatch = filter === "all" || item.safety?.status === filter || (filter === "review-needed" && item.safety?.reviewNeeded);
      const queryMatch = !needle || [item.title, item.path, item.category, item.world, item.summary]
        .some((value) => String(value || "").toLowerCase().includes(needle));
      return statusMatch && queryMatch;
    });
  }, [report.pages, filter, query]);

  const totals = report.totals || {};

  return (
    <div className="page-stack player-safety-page">
      <header className="list-header player-safety-header">
        <div>
          <span className="kicker">GM Safety Review</span>
          <h1>Проверка секретов перед игроками</h1>
          <p>Здесь мастер видит, какие статьи можно показывать игрокам, а какие требуют ручной проверки. Player API отдает только public-версии: без GM-only статей, secret-блоков, скрытых пинов и мастерских слоев карты.</p>
        </div>
        <div className="safety-total-grid">
          <div><strong>{totals.total || 0}</strong><span>статей</span></div>
          <div><strong>{totals.playerVisible || 0}</strong><span>видны игрокам</span></div>
          <div><strong>{totals.containsSecrets || 0}</strong><span>с секретами</span></div>
          <div><strong>{totals.reviewNeeded || 0}</strong><span>проверить</span></div>
        </div>
      </header>

      {message && <div className={`status-message ${dangerMessage(message) ? "danger-message" : ""}`}>{message}</div>}

      <section className="codex-card safety-principle-card">
        <div>
          <ShieldCheck size={24} />
          <strong>Как работает защита</strong>
        </div>
        <p>Секреты вырезаются на сервере, а не прячутся стилями в браузере. Даже если игрок откроет DevTools, в ответе API не должно быть GM-текста, скрытых объектов карты или приватных полей frontmatter.</p>
      </section>

      <section className="safety-toolbar codex-card">
        <div className="safety-filter-row">
          <Filter size={16} />
          {filters.map(([value, label]) => (
            <button key={value} type="button" className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
        <label className="safety-search">
          <FileSearch size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти статью, мир, путь или категорию..." />
        </label>
      </section>

      <section className="safety-review-layout">
        <div className="safety-review-list">
          {rows.map((item) => (
            <button key={item.path} type="button" className={`safety-review-row ${focused?.path === item.path ? "is-active" : ""} safety-${item.safety?.status || "safe"}`} onClick={() => setFocused(item)}>
              <span>{statusIcon(item.safety?.status)}</span>
              <strong>{item.title}</strong>
              <em>{labelCategory(item.category)} · {item.playerVisible ? "видна игрокам" : "скрыта от игроков"}</em>
              <small>{compact(item.summary || item.playerContentPreview || item.path)}</small>
            </button>
          ))}
          {!rows.length && <p className="empty-copy">По этому фильтру ничего нет. Можно переключиться на “Все” или очистить поиск.</p>}
        </div>

        <aside className="codex-card safety-focus-panel">
          {focused ? (
            <>
              <div className="safety-focus-head">
                <span className={`safety-status-pill safety-${focused.safety?.status || "safe"}`}>{statusIcon(focused.safety?.status)} {statusLabel(focused.safety?.status)}</span>
                <strong>{focused.title}</strong>
                <p>{focused.path}</p>
              </div>

              <div className="safety-focus-actions">
                <CodexButton as={Link} to={`/page/${encodeURIComponent(focused.path)}`} variant="secondary" size="sm"><Eye size={15} /> Открыть статью</CodexButton>
                <CodexButton as={Link} to={`/edit/${encodeURIComponent(focused.path)}`} variant="ghost" size="sm"><Sparkles size={15} /> Исправить</CodexButton>
              </div>

              <dl className="safety-facts">
                <div><dt>Visibility</dt><dd>{focused.visibility || "public"}</dd></div>
                <div><dt>Player API</dt><dd>{focused.playerVisible ? "отдает safe-версию" : "не отдает статью"}</dd></div>
                <div><dt>Secret blocks</dt><dd>{focused.safety?.secretBlockCount || 0}</dd></div>
                <div><dt>GM map layer</dt><dd>{(focused.safety?.gmOnlyMapObjects || 0) + (focused.safety?.gmOnlyPins || 0)}</dd></div>
              </dl>

              {focused.safety?.warnings?.length > 0 && (
                <div className="safety-warning-box">
                  <strong>Что проверить</strong>
                  <ul>{focused.safety.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                </div>
              )}

              <div className="safety-player-preview">
                <span className="kicker">Player-safe preview</span>
                {focused.playerVisible && focused.playerContentPreview ? (
                  <MarkdownViewer content={focused.playerContentPreview} pages={pages} />
                ) : (
                  <p>Игроки не получают эту статью или публичный текст пока пустой.</p>
                )}
              </div>
            </>
          ) : (
            <p>Выбери статью слева, чтобы увидеть player-safe preview и причины проверки.</p>
          )}
        </aside>
      </section>
    </div>
  );
}
