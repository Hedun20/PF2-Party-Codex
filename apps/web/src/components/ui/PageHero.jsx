function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export default function PageHero({ kicker, title, description, children, className = "", actions = null }) {
  return (
    <section className={classNames("hero-panel", className)}>
      {kicker ? <span className="kicker">{kicker}</span> : null}
      {title ? <h1>{title}</h1> : null}
      {description ? <p>{description}</p> : null}
      {actions ? <div className="page-hero-actions">{actions}</div> : null}
      {children}
    </section>
  );
}
