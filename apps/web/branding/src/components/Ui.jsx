import { LoaderCircle } from "lucide-react";

export function Button({ variant = "primary", size = "md", icon: Icon, loading = false, children, className = "", ...props }) {
  return (
    <button className={`sl-button sl-button--${variant} sl-button--${size} ${className}`.trim()} type="button" {...props}>
      {loading ? <LoaderCircle className="sl-spin" size={16} aria-hidden="true" /> : Icon ? <Icon size={16} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}

export function IconButton({ label, icon: Icon, active = false, className = "", ...props }) {
  return (
    <button className={`sl-icon-button${active ? " is-active" : ""} ${className}`.trim()} type="button" aria-label={label} title={label} {...props}>
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

export function Chip({ tone = "neutral", children }) {
  return <span className={`sl-chip sl-chip--${tone}`}>{children}</span>;
}

export function Panel({ title, eyebrow, actions, className = "", children }) {
  return (
    <section className={`sl-panel ${className}`.trim()}>
      {(title || eyebrow || actions) && (
        <header className="sl-panel__header">
          <div>
            {eyebrow ? <p className="sl-eyebrow">{eyebrow}</p> : null}
            {title ? <h2>{title}</h2> : null}
          </div>
          {actions ? <div className="sl-panel__actions">{actions}</div> : null}
        </header>
      )}
      <div className="sl-panel__body">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, icon: Icon }) {
  return (
    <article className="sl-stat">
      <span className="sl-stat__icon">{Icon ? <Icon size={19} aria-hidden="true" /> : null}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </div>
    </article>
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <label className={`sl-field${error ? " has-error" : ""}`}>
      <span className="sl-field__label">{label}</span>
      {children}
      {error ? <small className="sl-field__error">{error}</small> : hint ? <small className="sl-field__hint">{hint}</small> : null}
    </label>
  );
}

export function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <header className="sl-page-header">
      <div className="sl-page-header__copy">
        {eyebrow ? <p className="sl-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="sl-page-header__actions">{actions}</div> : null}
    </header>
  );
}
