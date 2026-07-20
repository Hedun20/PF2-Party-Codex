import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ImageIcon } from "lucide-react";
import { api } from "../api/client.js";
import { labelCategory } from "../utils/labels.js";
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader
} from "../components/ui/Silverleaf.jsx";

function compactText(text = "", limit = 170) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "Краткое описание пока не добавлено.";
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function imageFor(page = {}) {
  return page.handoutImage || page.avatarImage || page.mapImage || page.image || page.tokenImage || page.frontmatter?.handoutImage || page.frontmatter?.avatarImage || "";
}

function visibleEntryHandout(page = {}, mode = "player") {
  if (mode !== "gm" && page.visibility !== "public") return false;
  return Boolean(page.handoutImage || page.frontmatter?.handoutImage || page.visibility === "public");
}

function assetUrl(path = "") {
  if (!path) return "";
  return path.startsWith("/api/") ? path : `/api/assets/${String(path).replace(/^images\//, "")}`;
}

function MongoHandoutCard({ handout }) {
  return (
    <Card className="handout-card">
      <div className="handout-card-placeholder"><ImageIcon size={28} strokeWidth={1.35} /></div>
      <div className="handout-card-body">
        <Chip tone="gold">{handout.visibility || "материал"}</Chip>
        <h2>{handout.title || "Без названия"}</h2>
        <p>{compactText(handout.body || handout.summary || handout.description || "")}</p>
        {handout.releasedAt ? <p className="handout-card-date">Открыто: {handout.releasedAt}</p> : null}
      </div>
    </Card>
  );
}

function EntryHandoutCard({ page }) {
  const image = imageFor(page);
  return (
    <Card className="handout-card">
      {image ? <img src={assetUrl(image)} alt="" /> : <div className="handout-card-placeholder"><ImageIcon size={28} strokeWidth={1.35} /></div>}
      <div className="handout-card-body">
        <Chip tone="gold">{labelCategory(page.category)}</Chip>
        <h2>{page.title}</h2>
        <p>{compactText(page.summary || page.frontmatter?.summary)}</p>
        <Link className="handout-open-link" to={`/page/${encodeURIComponent(page.path)}`}><BookOpen size={16} /> Открыть материал</Link>
      </div>
    </Card>
  );
}

export default function HandoutsPage({ pages = [], mode = "player" }) {
  const entryItems = useMemo(() => pages.filter((page) => visibleEntryHandout(page, mode)).slice(0, 60), [pages, mode]);
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
        setState({ loading: false, error: error.message || "Handouts API failed.", handouts: [], role: "" });
      });
    return () => { active = false; };
  }, []);

  const showEntryFallback = Boolean(state.error && entryItems.length);
  const showMongo = !state.loading && !state.error && state.handouts.length > 0;
  const showEmpty = !state.loading && !state.error && state.handouts.length === 0;
  const meta = [
    state.role ? `Роль: ${state.role}` : null,
    mode === "gm" ? "GM видит подготовленные и открытые материалы" : "Участник видит только открытые материалы"
  ].filter(Boolean);

  return (
    <div className="page-stack handouts-page">
      <PageHeader
        eyebrow="Материалы / Reveal"
        title="Материалы для участников"
        description="Изображения, тексты и подсказки, которые GM подготовил или уже открыл участникам активной кампании."
        meta={meta}
      />

      {state.loading ? <LoadingState title="Загружаю материалы" description="Проверяю handouts и открытые статьи активной кампании." /> : null}

      {state.error && !entryItems.length ? <ErrorState title="Материалы недоступны" description={state.error} /> : null}

      {showEntryFallback ? (
        <>
          <Notice tone="warning" title="Используется резервный источник">Проекция handouts недоступна. Ниже показаны открытые материалы из статей той же кампании.</Notice>
          <section className="handout-grid" aria-label="Материалы из статей">{entryItems.map((page) => <EntryHandoutCard key={page.path} page={page} />)}</section>
        </>
      ) : null}

      {showMongo ? <section className="handout-grid" aria-label="Материалы кампании">{state.handouts.map((handout) => <MongoHandoutCard key={handout.id || handout.title} handout={handout} />)}</section> : null}

      {showEmpty ? <EmptyState title="Пока нет открытых материалов" description={mode === "gm" ? "Добавьте handout или публичную статью, чтобы материал появился здесь." : "GM ещё не открыл материалы для вашей группы."} /> : null}
    </div>
  );
}
