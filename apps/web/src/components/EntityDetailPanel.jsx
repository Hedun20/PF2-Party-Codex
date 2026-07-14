import { Link2, MapPin } from "lucide-react";

export default function EntityDetailPanel({
  kicker = "Выбранная запись",
  title,
  description = "",
  badge = null,
  facts = [],
  location = [],
  related = [],
  actions = null,
  empty = null,
  className = ""
}) {
  if (!title) {
    return <aside className={`entity-detail-panel entity-detail-panel--empty codex-card ${className}`.trim()}>{empty}</aside>;
  }

  const cleanLocation = location.filter(Boolean);
  const cleanFacts = facts.filter((item) => item?.value !== undefined && item?.value !== null && item?.value !== "");
  const cleanRelated = related.filter(Boolean);

  return (
    <aside className={`entity-detail-panel codex-card ${className}`.trim()}>
      <header className="entity-detail-panel__header">
        <div>
          <span className="kicker">{kicker}</span>
          <h2>{title}</h2>
        </div>
        {badge ? <span className="entity-detail-panel__badge">{badge}</span> : null}
      </header>

      <p className="entity-detail-panel__description">{description || "Описание не заполнено."}</p>

      {cleanFacts.length ? (
        <dl className="entity-detail-panel__facts">
          {cleanFacts.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {cleanLocation.length ? (
        <p className="entity-detail-panel__location"><MapPin size={16} /> {cleanLocation.join(" · ")}</p>
      ) : null}

      {cleanRelated.length ? (
        <section className="entity-detail-panel__related">
          <span className="kicker">Связанные материалы</span>
          <div>{cleanRelated.map((item) => <span key={String(item)}><Link2 size={13} /> {item}</span>)}</div>
        </section>
      ) : null}

      {actions ? <footer className="entity-detail-panel__actions">{actions}</footer> : null}
    </aside>
  );
}
