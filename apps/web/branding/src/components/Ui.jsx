import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from "react";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";

export function SilverleafLeafIcon({ size = 20, ...props }) {
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
        ? "secondary-button-default-v3"
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
        {ResolvedIcon ? <ResolvedIcon className={loading ? "sl-spin" : undefined} size={variant === "primary" ? 20 : 17} aria-hidden="true" /> : null}
        <span>{children}</span>
      </span>
    </button>
  );
}

export function TextInput({ icon: Icon, className = "", inputClassName = "", ...props }) {
  return (
    <span className={`sl-text-input ${className}`.trim()} data-component="text-input-default-v3">
      <input className={`sl-text-input__control ${inputClassName}`.trim()} {...props} />
      {Icon ? (
        <>
          <span className="sl-control-divider" aria-hidden="true" />
          <Icon className="sl-control-icon" size={17} strokeWidth={1.55} aria-hidden="true" />
        </>
      ) : null}
    </span>
  );
}

export function TextareaInput({ className = "", ...props }) {
  return (
    <span className={`sl-textarea-input ${className}`.trim()} data-component="textarea-default-v2">
      <textarea className="sl-textarea-input__control" {...props} />
    </span>
  );
}

function normalizeSelectOptions(children) {
  return Children.toArray(children)
    .filter(isValidElement)
    .map((child) => ({
      value: String(child.props.value ?? ""),
      label: child.props.children,
      disabled: Boolean(child.props.disabled)
    }));
}

export function SelectInput({
  className = "",
  children,
  value,
  defaultValue,
  onChange,
  name,
  disabled = false,
  ...props
}) {
  const options = useMemo(() => normalizeSelectOptions(children), [children]);
  const [internalValue, setInternalValue] = useState(() => String(defaultValue ?? options[0]?.value ?? ""));
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const rootRef = useRef(null);
  const listboxId = useId();
  const selectedValue = value === undefined ? internalValue : String(value);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === selectedValue));
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const commitValue = (nextValue) => {
    if (value === undefined) setInternalValue(nextValue);
    onChange?.({ target: { value: nextValue, name } });
    setOpen(false);
  };

  const moveHighlight = (direction) => {
    if (!options.length) return;
    let next = highlightedIndex;
    do {
      next = (next + direction + options.length) % options.length;
    } while (options[next]?.disabled && next !== highlightedIndex);
    setHighlightedIndex(next);
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlightedIndex(selectedIndex);
      } else {
        moveHighlight(1);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setHighlightedIndex(selectedIndex);
      } else {
        moveHighlight(-1);
      }
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) {
        const option = options[highlightedIndex];
        if (option && !option.disabled) commitValue(option.value);
      } else {
        setOpen(true);
        setHighlightedIndex(selectedIndex);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <span
      ref={rootRef}
      className={`sl-select-input${open ? " is-open" : ""}${disabled ? " is-disabled" : ""} ${className}`.trim()}
      data-component="select-default-v2"
    >
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      <button
        className="sl-select-input__trigger"
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => {
          setOpen((current) => !current);
          setHighlightedIndex(selectedIndex);
        }}
        onKeyDown={handleKeyDown}
        {...props}
      >
        <span className="sl-select-input__value">{selectedOption?.label}</span>
        <span className="sl-control-divider" aria-hidden="true" />
        <ChevronDown className="sl-control-icon" size={17} strokeWidth={1.55} aria-hidden="true" />
      </button>
      {open ? (
        <span className="sl-select-menu" id={listboxId} role="listbox" aria-activedescendant={`${listboxId}-${highlightedIndex}`}>
          {options.map((option, index) => (
            <button
              key={option.value}
              id={`${listboxId}-${index}`}
              className={`sl-select-option${index === highlightedIndex ? " is-highlighted" : ""}${option.value === selectedValue ? " is-selected" : ""}`}
              type="button"
              role="option"
              aria-selected={option.value === selectedValue}
              disabled={option.disabled}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => commitValue(option.value)}
            >
              <span>{option.label}</span>
              {option.value === selectedValue ? <Check size={15} strokeWidth={1.7} aria-hidden="true" /> : null}
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}

export function Tabs({ items, active, onChange }) {
  return (
    <div className="sl-tabs" role="tablist" data-component="tabs-default-v2">
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
      data-component="sidebar-item-default-v2"
      {...props}
    >
      <span className="sl-sidebar-item__marker" aria-hidden="true" />
      {Icon ? <Icon size={19} strokeWidth={1.45} aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}

export function ArchiveCard({ icon: Icon, eyebrow, title, description, meta, children, className = "" }) {
  return (
    <article className={`sl-archive-card ${className}`.trim()} data-component="archive-card-default-v2">
      <div className="sl-archive-card__art" aria-hidden="true">
        <span className="sl-icon-medallion sl-icon-medallion--large">
          {Icon ? <Icon size={32} strokeWidth={1.35} /> : <SilverleafLeafIcon size={32} />}
        </span>
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
    <div className="sl-table-row" data-component="table-row-default-v2">
      <span className="sl-icon-medallion">{Icon ? <Icon size={18} strokeWidth={1.45} aria-hidden="true" /> : null}</span>
      <div className="sl-table-row__copy"><strong>{title}</strong>{subtitle ? <span>{subtitle}</span> : null}</div>
      {meta ? <div className="sl-table-row__meta">{meta}</div> : null}
      {actions ? <div className="sl-table-row__actions">{actions}</div> : null}
    </div>
  );
}

export function DialogCard({ eyebrow, title, description, actions, children }) {
  return (
    <section className="sl-dialog-card" role="dialog" aria-modal="false" data-component="dialog-default-v2">
      <span className="sl-dialog-card__ornament" aria-hidden="true"><i /><SilverleafLeafIcon size={17} /><i /></span>
      <header><div>{eyebrow ? <span>{eyebrow}</span> : null}<h3>{title}</h3></div></header>
      <div className="sl-dialog-card__body">{description ? <p>{description}</p> : null}{children}</div>
      {actions ? <footer>{actions}</footer> : null}
    </section>
  );
}

export function IconButton({ label, icon: Icon, active = false, className = "", ...props }) {
  return (
    <button className={`sl-icon-button${active ? " is-active" : ""} ${className}`.trim()} type="button" aria-label={label} title={label} data-component="icon-button-default-v2" {...props}>
      <Icon size={18} strokeWidth={1.45} aria-hidden="true" />
    </button>
  );
}

export function Chip({ tone = "neutral", children }) {
  return <span className={`sl-chip sl-chip--${tone}`} data-component="chip-default-v2">{children}</span>;
}

export function Panel({ title, eyebrow, actions, className = "", children }) {
  return (
    <section className={`sl-panel ${className}`.trim()} data-component="panel-default-v2">
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
      <span className="sl-icon-medallion">{Icon ? <Icon size={19} strokeWidth={1.45} aria-hidden="true" /> : null}</span>
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
    <div className={`sl-field${error ? " has-error" : ""}`}>
      <span className="sl-field__label">{label}</span>
      {children}
      {error ? <small className="sl-field__error">{error}</small> : hint ? <small className="sl-field__hint">{hint}</small> : null}
    </div>
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
