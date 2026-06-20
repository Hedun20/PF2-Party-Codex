import { CalendarDays, Eye, FileText, Globe2, Link2, MapPin, Shield, Sparkles, Tag, UsersRound } from "lucide-react";
import { labelCategory } from "../utils/labels.js";

const factKeys = [
  ["world", "Мир", Globe2],
  ["country", "Страна", Shield],
  ["city", "Город", MapPin],
  ["location", "Локация", MapPin],
  ["faction", "Фракция", UsersRound],
  ["role", "Роль", UsersRound],
  ["level", "Уровень", Sparkles],
  ["threat", "Опасность", Shield],
  ["loreSubtype", "Подтип лора", FileText],
  ["timelineYear", "Год timeline", CalendarDays],
  ["year", "Год", CalendarDays]
];

function stringifyValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value === true) return "да";
  if (value === false) return "нет";
  return value ? String(value) : "";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ru-RU", { year: "numeric", month: "short", day: "numeric" });
}

export default function ArticleFactsPanel({ page, mode = "player" }) {
  if (!page) return null;
  const fm = page.frontmatter || {};
  const tags = Array.isArray(page.tags) ? page.tags : [];
  const relatedCount = (page.relatedPages?.length || 0) + (page.backlinks?.length || 0);

  const facts = [
    { key: "category", label: "Категория", Icon: FileText, value: labelCategory(page.category) },
    { key: "type", label: "Тип", Icon: FileText, value: stringifyValue(fm.type || page.type) },
    { key: "visibility", label: "Видимость", Icon: Eye, value: page.visibility === "gm" ? "только GM" : stringifyValue(page.visibility) },
    ...factKeys.map(([key, label, Icon]) => ({ key, label, Icon, value: stringifyValue(page[key] ?? fm[key]) })),
    { key: "relatedCount", label: "Связи", Icon: Link2, value: relatedCount ? String(relatedCount) : "" },
    { key: "updated", label: "Обновлено", Icon: CalendarDays, value: formatDate(page.modifiedAt) },
    { key: "path", label: "Файл", Icon: FileText, value: mode === "gm" ? page.path : "" }
  ].filter((fact) => fact.value);

  if (!facts.length && !tags.length) return null;

  return (
    <aside className="article-facts-panel" aria-label="Метаданные статьи">
      <div className="article-facts-head">
        <span className="kicker">Инфобокс</span>
        <em>Факты и связи</em>
      </div>

      <dl className="article-facts-list">
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
    </aside>
  );
}
