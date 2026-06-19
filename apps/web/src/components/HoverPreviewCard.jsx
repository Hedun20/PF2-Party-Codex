export default function HoverPreviewCard({ page, mode }) {
  return (
    <aside className="hover-card">
      <strong>{page.title}</strong>
      <p>{page.summary || "No summary yet."}</p>
      <dl>
        <dt>Category</dt>
        <dd>{page.category}</dd>
        <dt>Links</dt>
        <dd>{page.links?.length || 0}</dd>
        <dt>Updated</dt>
        <dd>{new Date(page.modifiedAt).toLocaleDateString()}</dd>
        {mode === "gm" && page.visibility !== "public" && (
          <>
            <dt>Visibility</dt>
            <dd>{page.visibility}</dd>
          </>
        )}
      </dl>
    </aside>
  );
}
