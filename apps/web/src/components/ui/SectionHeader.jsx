function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export default function SectionHeader({ kicker, title, description, actions = null, className = "" }) {
  return (
    <div className={classNames("section-header", className)}>
      <div>
        {kicker ? <span className="kicker">{kicker}</span> : null}
        {title ? <h2>{title}</h2> : null}
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="section-header-actions">{actions}</div> : null}
    </div>
  );
}
