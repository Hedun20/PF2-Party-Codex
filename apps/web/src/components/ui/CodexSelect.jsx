import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import FloatingMenu from "./FloatingMenu.jsx";

function normalizedOptions(options = []) {
  return options.map((option) => typeof option === "string"
    ? { value: option, label: option, disabled: false }
    : { value: String(option.value ?? ""), label: option.label ?? String(option.value ?? ""), disabled: Boolean(option.disabled) });
}

export default function CodexSelect({
  value = "",
  onChange,
  options = [],
  ariaLabel = "Выбор значения",
  icon: Icon = null,
  className = "",
  disabled = false
}) {
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const items = useMemo(() => normalizedOptions(options), [options]);
  const selected = items.find((option) => option.value === String(value)) || items[0] || { label: "—", value: "" };
  const menuId = `codex-select-${ariaLabel.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-")}`;

  function choose(option) {
    if (!option || option.disabled) return;
    onChange?.(option.value);
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <div className={`codex-select ${open ? "is-open" : ""} ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className="codex-select__trigger"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        {Icon ? <Icon size={16} aria-hidden="true" /> : null}
        <span>{selected.label}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      <FloatingMenu
        open={open}
        anchorRef={triggerRef}
        onClose={() => setOpen(false)}
        id={menuId}
        className="codex-select__menu"
        matchWidth
        minWidth={220}
        role="listbox"
      >
        {items.map((option) => {
          const active = option.value === String(value);
          return (
            <button
              key={`${option.value}-${option.label}`}
              type="button"
              role="option"
              aria-selected={active}
              disabled={option.disabled}
              className={active ? "codex-select__option is-active" : "codex-select__option"}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {active ? <Check size={16} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </FloatingMenu>
    </div>
  );
}
