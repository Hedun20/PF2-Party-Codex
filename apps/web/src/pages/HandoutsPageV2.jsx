import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BookOpen, Eye, ImageIcon, Sparkles } from "lucide-react";
import { api } from "../api/client.js";
import { labelCategory } from "../utils/labels.js";

function compactText(text = "", limit = 170) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "Краткое описание пока не добавлено.";
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function imageFor(page = {}) {
  return page.handoutImage || page.avatarImage || page.mapImage || page.image || page.tokenImage || page.frontmatter?.handoutImage || page.frontmatter?.avatarImage || "";
}

function visibleVaultHandout(page = {}, mode = "player") {
  if (mode !== "gm" && page.visibility !== "public") return false;
  return Boolean(page.handoutImage || page.frontmatter?.handoutImage || page.visibility === "public");
}

function assetUrl(path = "") {
  if (!path) return "";
  return path.startsWith("/api/") ? path : `/api/assets/${String(path).replace(/^images\//, "")}`;
}

function MongoHandoutCard({ handout }) {
  return (
    <article className="codex-card handout-card">
      <div className="handout-card-placeholder"><ImageIcon size={26} /></div>
      <div className="handout-card-body">
        <span className="kicker">{handout.visibility || "материал"}</span>
        <h2>{handout.title || "Без названия"}</h2>
        <p>{compactText(handout.body || handout.summary || handout.description || "")}</p>
        {handout.releasedAt ? <p>Открыто: {handout.releasedAt}</p> : null}
      </div>
    </article>
  );
}

function VaultHandoutCard({ page }) {
  const image = imageFor(page);
  return (
    <article className="codex-card handout-card">
      {image ? <img src={assetUrl(image)} alt="" /> : <div className="handout-card-placeholder"><ImageIcon size={26} /></div>}
      <div className="handout-card-body">
        <span className="kicker">{labelCategory(page.category)}</span>
        <h2>{page.title}</h2>
        <p>{compactText(page.summary || page.frontmatter?.summary)}</p>
        <Link to={`/page/${encodeURIComponent(page.path)}`}><BookOpen size={15} /> Открыть</Link>
      </div>
    </article>
  );
}

export default function HandoutsPageV2({ pages = [], mode = "player" }) {
  const vaultItems = useMemo(() => pages.filter((page) => visibleVaultHandout(page, mode)).slice(0, 60), [pages, mode]);
  const [state, setState] = useState({ loading: true, error: "", handouts: [], role: "" });

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: "", handouts: [], role: "" });
    api.handouts()
      .then((data) => {
        if (!active) return;
        setState({ loading: false, error: "", handouts: Array.isArray(data.handouts) ? data.handouts : [], role: data.role || "" });
      })
      .catch((error) => {
        if (!active) return;
        setState({ loading: false, error: error.message || "Не удалось загрузить материалы игрокам.", handouts: [], role: "" });
      });
    return () => { active = false; };
  }, []);

  const showVaultFallback = Boolean(state.error && vaultItems.length);
  const showMongo = !state.loading && !state.error && state.handouts.length > 0;
  const showEmpty = !state.loading && !state.error && state.handouts.length === 0;

  return (
    <div className="page-stack handouts-page">
      <section className="hero-panel">
        <span className="kicker">Материалы игрокам</span>
        <h1>Открытые материалы</h1>
        <p>Это письма, портреты, картинки, улики, описания сцен и другие “раздатки”, которые GM подготовил и открыл участникам. Reveal — это действие GM: открыть материал игрокам.</p>
        <div className="workspace-identity-strip">
          {state.role ? <span>Роль: {state.role}</span> : null}
          <span>{mode === "gm" ? "GM видит подготовленные и открытые материалы" : "Участник видит только открытые материалы"}</span>
        </div>
      </section>

      {state.loading ? (
        <section className="codex-card workspace-status-card">
          <Sparkles size={24} />
          <h2>Загружаю материалы</h2>
          <p>Проверяю материалы, открытые для текущей кампании.</p>
        </section>
      ) : null}

      {state.error && !vaultItems.length ? (
        <section className="codex-card workspace-status-card">
          <AlertTriangle size={24} />
          <h2>Материалы недоступны</h2>
          <p>{state.error}</p>
        </section>
      ) : null}

      {showVaultFallback ? (
        <>
          <section className="codex-card workspace-status-card">
            <AlertTriangle size={22} />
            <span className="kicker">Совместимость со старым архивом</span>
            <p>Ниже показаны публичные материалы из старого архива кампании.</p>
          </section>
          <section className="handout-grid">{vaultItems.map((page) => <VaultHandoutCard key={page.path} page={page} />)}</section>
        </>
      ) : null}

      {showMongo ? <section className="handout-grid">{state.handouts.map((handout) => <MongoHandoutCard key={handout.id || handout.title} handout={handout} />)}</section> : null}

      {showEmpty ? (
        <section className="codex-card workspace-status-card">
          <Eye size={24} />
          <h2>Пока нет открытых материалов</h2>
          <p>{mode === "gm" ? "Добавьте материал или публичную статью, чтобы она появилась здесь для участников." : "GM ещё не открыл материалы для вашей группы."}</p>
        </section>
      ) : null}
    </div>
  );
}
