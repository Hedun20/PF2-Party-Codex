import { EyeOff, GitBranch, Link2, MapPinned } from "lucide-react";
import { labelCategory } from "../utils/labels.js";

const typeLabels = {
  world: "мир",
  country: "страна",
  city: "город",
  location: "локация",
  npc: "NPC",
  pc: "PC",
  enemy: "враг",
  quest: "квест",
  session: "сессия",
  lore: "лор",
  guide: "гайд",
  example: "пример",
  map: "карта",
  timelineEvent: "событие"
};

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function countRelations(page) {
  const values = [
    page.links?.length,
    page.relatedPages?.length,
    page.backlinks?.length,
    page.children?.length
  ].filter((item) => Number.isFinite(item));
  return values.reduce((total, item) => total + item, 0);
}

export default function HoverPreviewCard({ page, mode }) {
  const relationCount = countRelations(page);
  const facts = [
    ["Категория", labelCategory(page.category)],
    ["Тип", typeLabels[page.type] || page.type],
    ["Мир", page.world],
    ["Страна", page.country],
    ["Город", page.city],
    ["Связи", relationCount],
    ["Обновлено", formatDate(page.modifiedAt)]
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  return (
    <aside className="hover-card codex-card__details" aria-label="Детали записи">
      <div className="codex-card__details-head">
        <span><GitBranch size={14} /> Детали записи</span>
        {page.mapImage && <MapPinned size={15} aria-label="Есть карта" />}
      </div>
      <dl>
        {facts.map(([label, value]) => (
          <div key={label} className="codex-card__fact">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        {mode === "gm" && page.visibility !== "public" && (
          <div className="codex-card__fact codex-card__fact--gm">
            <dt><EyeOff size={13} /> Видимость</dt>
            <dd>{page.visibility}</dd>
          </div>
        )}
      </dl>
      <span className="codex-card__open-hint"><Link2 size={13} /> Нажми, чтобы открыть статью</span>
    </aside>
  );
}
