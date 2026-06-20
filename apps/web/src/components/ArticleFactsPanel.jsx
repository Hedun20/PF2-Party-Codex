import { Link } from "react-router-dom";
import { BookOpen, CalendarDays, Eye, Globe2, MapPin, Shield, Sparkles, Tag, UsersRound } from "lucide-react";
import { labelCategory } from "../utils/labels.js";

const factKeys = [
  ["world", "Мир", Globe2],
  ["country", "Страна", Shield],
  ["city", "Город", MapPin],
  ["location", "Локация", MapPin],
  ["faction", "Фракция", UsersRound],
  ["role", "Роль", UsersRound],
  ["level", "Level", Sparkles],
  ["threat", "Опасность", Shield],
  ["year", "Год", CalendarDays],
  ["timelineYear", "Timeline", CalendarDays],
  ["status", "Статус", Eye]
];

function mediaUrl(path = "") {
  if (!path) return "";
  return path.startsWith("/api/assets/") ? path : `/api/assets/${path.replace(/^images\//, "")}`;
}

function stringifyValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value === true) return "да";
  if (value === false) return "нет";
  return value ? String(value) : "";
}

export default function ArticleFactsPanel({ page, mode = "player" }) {
  if (!page) return null;
  const fm = page.frontmatter || {};
  const image = page.avatarImage || page.tokenImage || page.handoutImage || page.image || "";
  const facts = factKeys
    .map(([key, label, Icon]) => ({ key, label, Icon, value: stringifyValue(page[key] ?? fm[key]) }))
    .filter((fact) => fact.value);
  const tags = Array.isArray(page.tags) ? page.tags : [];
  const hasContent = image || facts.length || tags.length || page.visibility || page.modifiedAt;

  if (!hasContent) return null;

  return (
    <aside className="article-facts-panel" aria-label="Краткая карточка статьи">
      {image && (
        <div className="article-facts-media">
          <img src={mediaUrl(image)} alt={page.title} />
        </div>
      )}

      <div className="article-facts-head">
        <span className="kicker">Инфобокс</span>
        <strong>{page.title}</strong>
        <em>{labelCategory(page.category)}</em>
      </div>

      <dl className="article-facts-list">
        <div>
          <dt><BookOpen size={15} /> Тип</dt>
          <dd>{fm.type || page.type || "article"}</dd>
        </div>
        {page.visibility && (
          <div>
            <dt><Eye size={15} /> Слой</dt>
            <dd>{page.visibility === "gm" ? "GM-only" : page.visibility}</dd>
          </div>
        )}
        {facts.map(({ key, label, Icon, value }) => (
          <div key={key}>
            <dt><Icon size={15} /> {label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {tags.length > 0 && (
        <div className="article-facts-tags">
          <span><Tag size={15} /> Теги</span>
          <div>{tags.slice(0, 10).map((tag) => <em key={tag}>{tag}</em>)}</div>
        </div>
      )}

      {mode === "gm" && page.path && (
        <Link className="article-facts-path" to={`/edit/${encodeURIComponent(page.path)}`}>{page.path}</Link>
      )}
    </aside>
  );
}
