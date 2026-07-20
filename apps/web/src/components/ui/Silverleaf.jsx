import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  Inbox,
  LoaderCircle,
  ShieldX,
  X
} from "lucide-react";

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

function focusableElements(root) {
  if (!root) return [];
  return [...root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
}

function useModalBehavior({ open, onClose, containerRef }) {
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => focusableElements(containerRef.current)[0]?.focus());

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusableElements(containerRef.current);
      if (!elements.length) {
        event.preventDefault();
        containerRef.current?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose, containerRef]);
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
      <input className={cx("sl-text-input__control", inputClassName)} aria-invalid={error || undefined} {...props} />
      {Icon ? <><span className="sl-control-divider" aria-hidden="true" /><Icon className="sl-control-icon" size={17} strokeWidth={1.55} aria-hidden="true" /></> : null}
    </span>
  );
}

export const Input = TextInput;

export function TextareaInput({ className = "", error = false, ...props }) {
  return <span className={cx("sl-textarea-input", error && "is-error", className)}><textarea className="sl-textarea-input__control" aria-invalid={error || undefined} {...props} /></span>;
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
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setHighlightedIndex(0);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      setHighlightedIndex(Math.max(0, options.length - 1));
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
        aria-invalid={error || undefined}
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

export const Select = SelectInput;
export const Textarea = TextareaInput;

export function Field({ label, hint, error, children, className = "" }) {
  return <label className={cx("sl-field", className)}>{label ? <span className="sl-field__label">{label}</span> : null}{children}{error ? <span className="sl-field__error">{error}</span> : hint ? <span className="sl-field__hint">{hint}</span> : null}</label>;
}

export function Chip({ tone = "neutral", children, className = "" }) {
  return <span className={cx("sl-chip", `sl-chip--${tone}`, className)}>{children}</span>;
}

export function Badge(props) {
  return <Chip {...props} className={cx("sl-badge", props.className)} />;
}

export function Card({ as: Component = "article", interactive = false, selected = false, className = "", children, ...props }) {
  return <Component className={cx("sl-card", interactive && "is-interactive", selected && "is-selected", className)} {...props}>{children}</Component>;
}

export function Panel({ title, eyebrow, actions, className = "", children }) {
  return (
    <section className={cx("sl-panel", className)}>
      {(title || eyebrow || actions) ? <header className="sl-panel__header"><div>{eyebrow ? <p className="sl-eyebrow">{eyebrow}</p> : null}{title ? <h2>{title}</h2> : null}</div>{actions ? <div className="sl-panel__actions">{actions}</div> : null}</header> : null}
      <div className="sl-panel__body">{children}</div>
    </section>
  );
}

export function Tabs({ items, active, onChange, className = "", label = "Sections" }) {
  const onKeyDown = (event, index) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else next = (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
    onChange?.(items[next].value);
    event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[next]?.focus();
  };

  return (
    <div className={cx("sl-tabs", className)} role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={active === item.value}
          tabIndex={active === item.value ? 0 : -1}
          className={cx("sl-tab", active === item.value && "is-active")}
          onClick={() => onChange?.(item.value)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Table({ caption, className = "", children, ...props }) {
  return <div className="sl-table-scroll"><table className={cx("sl-table", className)} {...props}>{caption ? <caption>{caption}</caption> : null}{children}</table></div>;
}
export function TableHead({ children }) { return <thead>{children}</thead>; }
export function TableBody({ children }) { return <tbody>{children}</tbody>; }
export function TableRow({ selected = false, children, className = "", ...props }) { return <tr className={cx(selected && "is-selected", className)} {...props}>{children}</tr>; }
export function TableHeaderCell({ children, scope = "col", ...props }) { return <th scope={scope} {...props}>{children}</th>; }
export function TableCell({ children, ...props }) { return <td {...props}>{children}</td>; }

export function Notice({ tone = "info", title, children, className = "", role = tone === "danger" ? "alert" : "status" }) {
  if (!title && !children) return null;
  return <div className={cx("sl-notice", `sl-notice--${tone}`, className)} role={role}>{title ? <strong>{title}</strong> : null}{children ? <span>{children}</span> : null}</div>;
}

export function StatePanel({ icon: Icon, title, description, action, tone = "neutral", busy = false, className = "" }) {
  return <section className={cx("sl-state-panel", `sl-state-panel--${tone}`, className)} aria-busy={busy || undefined}>{Icon ? <span className="sl-icon-medallion sl-icon-medallion--large"><Icon className={busy ? "sl-spin" : undefined} size={30} strokeWidth={1.35} /></span> : null}<h2>{title}</h2>{description ? <p>{description}</p> : null}{action}</section>;
}

export function LoadingState({ title = "Loading", description = "The archive is preparing this view.", action }) {
  return <StatePanel icon={LoaderCircle} title={title} description={description} action={action} busy />;
}
export function EmptyState({ title = "Nothing here yet", description = "Create the first record when you are ready.", action }) {
  return <StatePanel icon={Inbox} title={title} description={description} action={action} />;
}
export function ErrorState({ title = "Something went wrong", description = "The operation could not be completed. Try again.", action }) {
  return <StatePanel icon={AlertTriangle} title={title} description={description} action={action} tone="danger" />;
}
export function ForbiddenState({ title = "Access restricted", description = "Your campaign role does not allow this action.", action }) {
  return <StatePanel icon={ShieldX} title={title} description={description} action={action} tone="warning" />;
}
export function DisabledState({ title = "Unavailable", description = "This action is currently unavailable.", action }) {
  return <StatePanel icon={Ban} title={title} description={description} action={action} />;
}

export function PageHeader({ eyebrow, title, description, actions, meta, className = "", children }) {
  return (
    <header className={cx("sl-page-header", className)}>
      <div className="sl-page-header__copy">
        {eyebrow ? <p className="sl-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {meta ? <div className="sl-page-header__meta">{meta}</div> : null}
      </div>
      {actions ? <div className="sl-page-header__actions">{actions}</div> : null}
      {children ? <div className="sl-page-header__content">{children}</div> : null}
    </header>
  );
}

export function Tooltip({ content, children, placement = "top", className = "" }) {
  const id = useId();
  return (
    <span className={cx("sl-tooltip", `sl-tooltip--${placement}`, className)} tabIndex={0} aria-describedby={id}>
      {children}
      <span id={id} className="sl-tooltip__bubble" role="tooltip">{content}</span>
    </span>
  );
}

export function DialogCard({ eyebrow, title, description, actions, children, className = "" }) {
  return <section className={cx("sl-dialog-card", className)}><span className="sl-dialog-card__ornament" aria-hidden="true"><i /><SilverleafLeafIcon size={17} /><i /></span><header>{eyebrow ? <span>{eyebrow}</span> : null}<h2>{title}</h2></header><div className="sl-dialog-card__body">{description ? <p>{description}</p> : null}{children}</div>{actions ? <footer>{actions}</footer> : null}</section>;
}

export function Dialog({ open, onClose, eyebrow, title, description, actions, children, closeLabel = "Close dialog", className = "" }) {
  const containerRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useModalBehavior({ open, onClose, containerRef });
  if (!open) return null;

  return (
    <div className="sl-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <section ref={containerRef} className={cx("sl-dialog", className)} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex={-1}>
        <header className="sl-dialog__header">
          <div>{eyebrow ? <p className="sl-eyebrow">{eyebrow}</p> : null}<h2 id={titleId}>{title}</h2></div>
          <IconButton label={closeLabel} icon={X} onClick={onClose} />
        </header>
        <div className="sl-dialog__body">{description ? <p id={descriptionId}>{description}</p> : null}{children}</div>
        {actions ? <footer className="sl-dialog__footer">{actions}</footer> : null}
      </section>
    </div>
  );
}

export function Drawer({ open, onClose, title, eyebrow, children, actions, side = "right", closeLabel = "Close drawer", className = "" }) {
  const containerRef = useRef(null);
  const titleId = useId();
  useModalBehavior({ open, onClose, containerRef });
  if (!open) return null;

  return (
    <div className="sl-overlay sl-overlay--drawer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <aside ref={containerRef} className={cx("sl-drawer", `sl-drawer--${side}`, className)} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="sl-drawer__header"><div>{eyebrow ? <p className="sl-eyebrow">{eyebrow}</p> : null}<h2 id={titleId}>{title}</h2></div><IconButton label={closeLabel} icon={X} onClick={onClose} /></header>
        <div className="sl-drawer__body">{children}</div>
        {actions ? <footer className="sl-drawer__footer">{actions}</footer> : null}
      </aside>
    </div>
  );
}
