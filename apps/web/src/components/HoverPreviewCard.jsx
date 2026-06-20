import { labelCategory } from "../utils/labels.js";

const typeLabels = {
  world: "мир",
  country: "страна",
  city: "город",
  location: "локация",
  npc: "NPC",
  enemy: "враг",
  quest: "квест",
  session: "сессия",
  lore: "лор",
  timelineEvent: "событие"
};

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function cleanMarkdownText(value = "") {
  return String(value)
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?]]/g, "$1")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_`~]/g, "")
    .trim();
}

function firstReadableParagraph(page) {
  const content = cleanMarkdownText(page.content || "");
  const paragraph = content
    .split(/\n{2,}|\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.length > 80);
  return paragraph || page.summary || "Описание пока не заполнено.";
}

export default function HoverPreviewCard({ page, mode }) {
  const previewText = firstReadableParagraph(page);
  const facts = [
    ["Категория", labelCategory(page.category)],
    ["Тип", typeLabels[page.type] || page.type],
    ["Мир", page.world],
    ["Страна", page.country],
    ["Город", page.city],
    ["Связи", page.links?.length || page.related?.length || 0],
    ["Обновлено", formatDate(page.modifiedAt)]
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  return (
    <aside className="hover-card codex-card__details" aria-label="Метаданные статьи">
      <div className="codex-card__preview-head">
        <span>{labelCategory(page.category)}</span>
        <strong>{page.title}</strong>
      </div>
      <p className="codex-card__preview-text">{previewText}</p>
      <dl>
        {facts.map(([label, value]) => (
          <div key={label} className="codex-card__fact">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        {mode === "gm" && page.visibility !== "public" && (
          <div className="codex-card__fact">
            <dt>Видимость</dt>
            <dd>{page.visibility}</dd>
          </div>
        )}
      </dl>
    </aside>
  );
}
