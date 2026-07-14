import { EyeOff, GitBranch, Link2, MapPinned } from "lucide-react";

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function countRelations(page = {}) {
  const lists = [page.links, page.relatedPages, page.backlinks, page.children];
  return lists.reduce((total, list) => total + (Array.isArray(list) ? list.length : 0), 0);
}

export default function HoverPreviewCard({ page, mode }) {
  const relations = countRelations(page);
  const updated = formatDate(page.modifiedAt);
  const restricted = mode === "gm" && page.visibility !== "public";

  return (
    <footer className="entity-card__technical" aria-label="Технические данные записи">
      <span><GitBranch size={13} /> {relations ? `${relations} связей` : "Нет связей"}</span>
      {page.mapImage ? <span><MapPinned size={13} /> Есть карта</span> : null}
      {updated ? <span>Обновлено {updated}</span> : null}
      {restricted ? <span className="entity-card__private"><EyeOff size={13} /> {page.visibility}</span> : null}
      <span className="entity-card__open"><Link2 size={13} /> Открыть</span>
    </footer>
  );
}
