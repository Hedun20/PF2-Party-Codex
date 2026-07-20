import { ChevronDown, LoaderCircle } from "lucide-react";

function SilverleafLeafIcon({ size = 20, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M19.2 3.4C13.1 4 8.1 7.3 6 12.2c-1 2.3-1.3 4.7-1.2 7.1 2.4.1 4.8-.3 6.9-1.4 4.7-2.3 7.1-7.3 7.5-14.5Z" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round" />
      <path d="M4 21c2.2-5.7 6.1-10 11.9-13" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <path d="M7.4 14.9c1.7 0 3.2.4 4.7 1.1M10.2 11.3c.2-1.4.1-2.7-.2-3.9M12.7 8.9c1.4.1 2.7.5 3.8 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function Button({ variant = "primary", size = "md", icon: Icon, loading = false, children, className = "", ...props }) {
  const ResolvedIcon = loading ? LoaderCircle : Icon || (variant === "primary" ? SilverleafLeafIcon : null);
  const componentName = size === "md"
    ? variant === "primary"
      ? "primary-button-default-v3"
      : variant === "secondary"
        ? "secondary-button-default-v2"
        : undefined
    : undefined;

  return (
    <button
      className={`sl-button sl-button--${variant} sl-button--${size} ${className}`.trim()}
      type="button"
      data-component={componentName}
      {...props}
    >
      {variant === "primary" ? (
        <>
          <span className="sl-button__surface" aria-hidden="true" />
          <span className="sl-button__diamond sl-button__diamond--left" aria-hidden="true" />
          <span className="sl-button__diamond sl-button__diamond--right" aria-hidden="true" />
        </>
      ) : null}
      <span className="sl-button__content">
        {ResolvedIcon ? <ResolvedIcon className={loading ? "sl-spin" : undefined} size={variant === "primary" ? 20 : 16} aria-hidden="true" /> : null}
        <span>{children}</span>
      </span>
    </button>
  );
}

export function TextInput({ icon: Icon, className = "", inputClassName = "", ...props }) {
  return (
    <span className={`sl-text-input ${className}`.trim()} data-component="text-input-default-v2">
      <input className={`sl-text-input__control ${inputClassName}`.trim()} {...props} />
      {Icon ? (
        <>
          <span className="sl-text-input__finial" aria-hidden="true" />
          <Icon className="sl-text-input__icon" size={17} aria-hidden="true" />
        </>
      ) : null}
    </span>
  );
}

export function TextareaInput({ className = "", ...props }) {
  return (
    <span className={`sl-textarea-input ${className}`.trim()} data-component="textarea-default-v1">
      <textarea className="sl-textarea-input__control" {...props} />
    </span>
  );
}

export function SelectInput({ className = "", children, ...props }) {
  return (
    <span className={`sl-select-input ${className}`.trim()} data-component="select-default-v1">
      <select className="sl-select-input__control" {...props}>{children}</select>
      <span className="sl-select-input__finial" aria-hidden="true" />
      <ChevronDown className="sl-select-input__icon" size={17} aria-hidden="true" />
    </span>
  );
}

export function Tabs({ items, active, onChange }) {
  return (
    <div className="sl-tabs" role="tablist" data-component="tabs-default-v1">
      {items.map((item) => (
        <button
          key={item.value}
          className={`sl-tab${active === item.value ? " is-active" : ""}`}
          type="button"
          role="tab"
          aria-selected={active === item.value}
          onClick={() => onChange?.(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function SidebarNavItem({ icon: Icon, active = false, children, className = "", ...props }) {
  return (
    <button
      className={`sl-sidebar-item${active ? " is-active" : ""} ${className}`.trim()}
      type="button"
      data-component="sidebar-item-default-v1"
      {...props}
    >
      <span className="sl-sidebar-item__marker" aria-hidden="true" />
      {Icon ? <Icon size={19} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}

export function ArchiveCard({ icon: Icon, eyebrow, title, description, meta, children, className = "" }) {
  return (
    <article className={`sl-archive-card ${className}`.trim()} data-component="archive-card-default-v1">
      <div className="sl-archive-card__art" aria-hidden="true">
        {Icon ? <Icon size={38} /> : <SilverleafLeafIcon size={38} />}
      </div>
      <div className="sl-archive-card__content">
        {eyebrow ? <span className="sl-archive-card__eyebrow">{eyebrow}</span> : null}
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
        {children}
      </div>
      {meta ? <div className="sl-archive-card__meta">{meta}</div> : null}
    </article>
  );
}

export function TableRow({ icon: Icon, title, subtitle, meta, actions }) {
  return (
    <div className="sl-table-row" data-component="table-row-default-v1">
      <span className="sl-table-row__icon">{Icon ? <Icon size={18} aria-hidden="true" /> : null}</span>
      <div className="sl-table-row__copy"><strong>{title}</strong>{subtitle ? <span>{subtitle}</span> : null}</div>
      {meta ? <div className="sl-table-row__meta">{meta}</div> : null}
      {actions ? <div className="sl-table-row__actions">{actions}</div> : null}
    </div>
  );
}

export function DialogCard({ eyebrow, title, description, actions, children }) {
  return (
    <section className="sl-dialog-card" role="dialog" aria-modal="false" data-component="dialog-default-v1">
      <header><div>{eyebrow ? <span>{eyebrow}</span> : null}<h3>{title}</h3></div></header>
      <div className="sl-dialog-card__body">{description ? <p>{description}</p> : null}{children}</div>
      {actions ? <footer>{actions}</footer> : null}
    </section>
  );
}

export function IconButton({ label, icon: Icon, active = false, className = "", ...props }) {
  return (
    <button className={`sl-icon-button${active ? " is-active" : ""} ${className}`.trim()} type="button" aria-label={label} title={label} data-component="icon-button-default-v1" {...props}>
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

export function Chip({ tone = "neutral", children }) {
  return <span className={`sl-chip sl-chip--${tone}`} data-component="chip-default-v1">{children}</span>;
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
