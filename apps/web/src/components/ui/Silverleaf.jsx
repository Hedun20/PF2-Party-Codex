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

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

export function SilverleafLeafIcon({ size = 20, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M19.2 3.4C13.1 4 8.1 7.3 6 12.2c-1 2.3-1.3 4.7-1.2 7.1 2.4.1 4.8-.3 6.9-1.4 4.7-2.3 7.1-7.3 7.5-14.5Z" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round" />
      <path d="M4 21c2.2-5.7 6.1-10 11.9-13" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <path d="M7.4 14.9c1.7 0 3.2.4 4.7 1.1M10.2 11.3c.2-1.4.1-2.7-.2-3.9M12.7 8.9c1.4.1 2.7.5 3.8 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function Button({ variant = "primary", size = "md", icon: Icon, loading = false, children, className = "", type = "button", ...props }) {
  const ResolvedIcon = loading ? LoaderCircle : Icon || (variant === "primary" ? SilverleafLeafIcon : null);
  return (
    <button
      type={type}
      className={cx("sl-button", `sl-button--${variant}`, `sl-button--${size}`, className)}
      aria-busy={loading || undefined}
      disabled={loading || props.disabled}
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

export function IconButton({ label, icon: Icon, active = false, className = "", type = "button", ...props }) {
  return (
    <button type={type} className={cx("sl-icon-button", active && "is-active", className)} aria-label={label} title={label} {...props}>
      <Icon size={18} strokeWidth={1.45} aria-hidden="true" />
    </button>
  );
}

export function TextInput({ icon: Icon, className = "", inputClassName = "", error = false, ...props }) {
  return (
    <span className={cx("sl-text-input", error && "is-error", className)}>
      <input className={cx("sl-text-input__control", inputClassName)} {...props} />
      {Icon ? <><span className="sl-control-divider" aria-hidden="true" /><Icon className="sl-control-icon" size={17} strokeWidth={1.55} aria-hidden="true" /></> : null}
    </span>
  );
}

export function TextareaInput({ className = "", error = false, ...props }) {
  return <span className={cx("sl-textarea-input", error && "is-error", className)}><textarea className="sl-textarea-input__control" {...props} /></span>;
}

function normalizeOptions(children) {
  return Children.toArray(children).filter(isValidElement).map((child) => ({
    value: String(child.props.value ?? ""),
    label: child.props.children,
    disabled: Boolean(child.props.disabled)
  }));
}

export function SelectInput({ className = "", children, value, defaultValue, onChange, name, disabled = false, error = false, ...props }) {
  const options = useMemo(() => normalizeOptions(children), [children]);
  const [internalValue, setInternalValue] = useState(() => String(defaultValue ?? options[0]?.value ?? ""));
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const rootRef = useRef(null);
  const listboxId = useId();
  const selectedValue = value === undefined ? internalValue : String(value);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === selectedValue));
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    const close = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const commit = (nextValue) => {
    if (value === undefined) setInternalValue(nextValue);
    onChange?.({ target: { value: nextValue, name } });
    setOpen(false);
  };

  const move = (direction) => {
    if (!options.length) return;
    let next = highlightedIndex;
    do next = (next + direction + options.length) % options.length;
    while (options[next]?.disabled && next !== highlightedIndex);
    setHighlightedIndex(next);
  };

  const onKeyDown = (event) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { setOpen(true); setHighlightedIndex(selectedIndex); }
      else move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) { setOpen(true); setHighlightedIndex(selectedIndex); }
      else if (!options[highlightedIndex]?.disabled) commit(options[highlightedIndex].value);
    } else if (event.key === "Escape") setOpen(false);
  };

  return (
    <span ref={rootRef} className={cx("sl-select-input", open && "is-open", disabled && "is-disabled", error && "is-error", className)}>
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      <button
        type="button"
        className="sl-select-input__trigger"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => { setOpen((current) => !current); setHighlightedIndex(selectedIndex); }}
        onKeyDown={onKeyDown}
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
              type="button"
              role="option"
              aria-selected={option.value === selectedValue}
              disabled={option.disabled}
              className={cx("sl-select-option", index === highlightedIndex && "is-highlighted", option.value === selectedValue && "is-selected")}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => commit(option.value)}
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

export function Field({ label, hint, error, children, className = "" }) {
  return <label className={cx("sl-field", className)}>{label ? <span className="sl-field__label">{label}</span> : null}{children}{error ? <span className="sl-field__error">{error}</span> : hint ? <span className="sl-field__hint">{hint}</span> : null}</label>;
}

export function Chip({ tone = "neutral", children, className = "" }) {
  return <span className={cx("sl-chip", `sl-chip--${tone}`, className)}>{children}</span>;
}

export function Panel({ title, eyebrow, actions, className = "", children }) {
  return (
    <section className={cx("sl-panel", className)}>
      {(title || eyebrow || actions) ? <header className="sl-panel__header"><div>{eyebrow ? <p className="sl-eyebrow">{eyebrow}</p> : null}{title ? <h2>{title}</h2> : null}</div>{actions ? <div className="sl-panel__actions">{actions}</div> : null}</header> : null}
      <div className="sl-panel__body">{children}</div>
    </section>
  );
}

export function Tabs({ items, active, onChange, className = "" }) {
  return <div className={cx("sl-tabs", className)} role="tablist">{items.map((item) => <button key={item.value} type="button" role="tab" aria-selected={active === item.value} className={cx("sl-tab", active === item.value && "is-active")} onClick={() => onChange?.(item.value)}>{item.label}</button>)}</div>;
}

export function Notice({ tone = "info", title, children, className = "", role = tone === "danger" ? "alert" : "status" }) {
  if (!title && !children) return null;
  return <div className={cx("sl-notice", `sl-notice--${tone}`, className)} role={role}>{title ? <strong>{title}</strong> : null}{children ? <span>{children}</span> : null}</div>;
}

export function StatePanel({ icon: Icon, title, description, action, tone = "neutral" }) {
  return <section className={cx("sl-state-panel", `sl-state-panel--${tone}`)}>{Icon ? <span className="sl-icon-medallion sl-icon-medallion--large"><Icon size={30} strokeWidth={1.35} /></span> : null}<h2>{title}</h2>{description ? <p>{description}</p> : null}{action}</section>;
}

export function DialogCard({ eyebrow, title, description, actions, children, className = "" }) {
  return <section className={cx("sl-dialog-card", className)} role="dialog" aria-modal="true"><span className="sl-dialog-card__ornament" aria-hidden="true"><i /><SilverleafLeafIcon size={17} /><i /></span><header>{eyebrow ? <span>{eyebrow}</span> : null}<h2>{title}</h2></header><div className="sl-dialog-card__body">{description ? <p>{description}</p> : null}{children}</div>{actions ? <footer>{actions}</footer> : null}</section>;
}
