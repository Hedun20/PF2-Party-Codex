import { labelCategory } from "../utils/labels.js";

export default function HoverPreviewCard({ page, mode }) {
  return (
    <aside className="hover-card">
      <strong>{page.title}</strong>
      <p>{page.summary || "Описание пока не заполнено."}</p>
      <dl>
        <dt>Категория</dt>
        <dd>{labelCategory(page.category)}</dd>
        <dt>Связи</dt>
        <dd>{page.links?.length || 0}</dd>
        <dt>Обновлено</dt>
        <dd>{new Date(page.modifiedAt).toLocaleDateString()}</dd>
        {mode === "gm" && page.visibility !== "public" && (
          <>
            <dt>Видимость</dt>
            <dd>{page.visibility}</dd>
          </>
        )}
      </dl>
    </aside>
  );
}
