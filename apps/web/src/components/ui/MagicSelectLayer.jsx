import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Sparkles } from "lucide-react";

const OPEN_KEYS = new Set(["Enter", " ", "ArrowDown", "ArrowUp"]);

function isSingleSelect(element) {
  return element instanceof HTMLSelectElement && !element.multiple && Number(element.size || 0) <= 1;
}

function optionList(select) {
  return Array.from(select.options).map((option, index) => ({
    index,
    value: option.value,
    label: option.label || option.textContent || option.value,
    disabled: option.disabled || Boolean(option.closest("optgroup")?.disabled),
    group: option.closest("optgroup")?.label || ""
  }));
}

function firstEnabled(options = []) {
  return Math.max(0, options.findIndex((option) => !option.disabled));
}

function selectedIndex(options = [], value = "") {
  const index = options.findIndex((option) => option.value === String(value));
  return index >= 0 ? index : firstEnabled(options);
}

function nextEnabled(options, current, direction) {
  if (!options.length) return -1;
  let index = current;
  for (let step = 0; step < options.length; step += 1) {
    index = (index + direction + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return current;
}

function positionFor(select) {
  const rect = select.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(Math.max(rect.width, 280), Math.max(240, viewportWidth - 24));
  const left = Math.min(Math.max(12, rect.left), Math.max(12, viewportWidth - width - 12));
  const below = viewportHeight - rect.bottom - 12;
  const above = rect.top - 12;
  const openAbove = below < 250 && above > below;
  const maxHeight = Math.max(170, Math.min(360, (openAbove ? above : below) - 8));
  return {
    left,
    width,
    maxHeight,
    top: openAbove ? undefined : rect.bottom + 8,
    bottom: openAbove ? viewportHeight - rect.top + 8 : undefined,
    openAbove
  };
}

function setNativeSelectValue(select, value) {
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(select, value);
  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

export default function MagicSelectLayer() {
  const [active, setActive] = useState(null);
  const menuRef = useRef(null);

  const openSelect = (select, preferredDirection = 1) => {
    if (!isSingleSelect(select) || select.disabled) return;
    const options = optionList(select);
    if (!options.length) return;
    const current = selectedIndex(options, select.value);
    const highlighted = preferredDirection < 0 ? nextEnabled(options, current, -1) : current;
    select.focus({ preventScroll: true });
    setActive({
      select,
      options,
      value: String(select.value),
      highlighted,
      position: positionFor(select)
    });
  };

  const close = (restoreFocus = false) => {
    const select = active?.select;
    setActive(null);
    if (restoreFocus && select) window.requestAnimationFrame(() => select.focus({ preventScroll: true }));
  };

  const choose = (option) => {
    if (!active?.select || !option || option.disabled) return;
    setNativeSelectValue(active.select, option.value);
    close(true);
  };

  useEffect(() => {
    const onPointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      const select = event.target?.closest?.("select");
      if (select && isSingleSelect(select) && !select.disabled) {
        event.preventDefault();
        openSelect(select);
        return;
      }
      if (active) close(false);
    };

    const onKeyDown = (event) => {
      const select = event.target?.closest?.("select");
      if (!active && select && isSingleSelect(select) && !select.disabled && OPEN_KEYS.has(event.key)) {
        event.preventDefault();
        openSelect(select, event.key === "ArrowUp" ? -1 : 1);
        return;
      }
      if (!active) return;

      if (event.key === "Escape" || event.key === "Tab") {
        if (event.key === "Escape") event.preventDefault();
        close(event.key === "Escape");
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setActive((current) => current ? { ...current, highlighted: nextEnabled(current.options, current.highlighted, direction) } : current);
        return;
      }
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        const enabled = active.options.map((option, index) => ({ option, index })).filter(({ option }) => !option.disabled);
        const target = event.key === "Home" ? enabled[0] : enabled[enabled.length - 1];
        if (target) setActive((current) => current ? { ...current, highlighted: target.index } : current);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        choose(active.options[active.highlighted]);
      }
    };

    const closeForViewportChange = () => active && close(false);

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", closeForViewportChange);
    window.addEventListener("scroll", closeForViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", closeForViewportChange);
      window.removeEventListener("scroll", closeForViewportChange, true);
    };
  }, [active]);

  useEffect(() => {
    if (!active || !menuRef.current) return;
    const highlighted = menuRef.current.querySelector(`[data-option-index="${active.highlighted}"]`);
    highlighted?.scrollIntoView({ block: "nearest" });
  }, [active?.highlighted]);

  if (!active || typeof document === "undefined") return null;

  const style = {
    left: active.position.left,
    width: active.position.width,
    maxHeight: active.position.maxHeight,
    ...(active.position.top === undefined ? {} : { top: active.position.top }),
    ...(active.position.bottom === undefined ? {} : { bottom: active.position.bottom })
  };

  let previousGroup = null;

  return createPortal(
    <div
      ref={menuRef}
      className={`magic-select-menu ${active.position.openAbove ? "magic-select-menu--above" : "magic-select-menu--below"}`}
      style={style}
      role="listbox"
      aria-label={active.select.getAttribute("aria-label") || active.select.closest("label")?.textContent?.trim() || "Выбор значения"}
    >
      <div className="magic-select-menu__aura" aria-hidden="true"><Sparkles size={16} /></div>
      <div className="magic-select-menu__scroll">
        {active.options.map((option, index) => {
          const showGroup = option.group && option.group !== previousGroup;
          previousGroup = option.group || previousGroup;
          const selected = option.value === active.value;
          const highlighted = index === active.highlighted;
          return (
            <div key={`${option.value}-${index}`} className="magic-select-option-wrap">
              {showGroup ? <div className="magic-select-group">{option.group}</div> : null}
              <button
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                data-option-index={index}
                className={`magic-select-option ${selected ? "is-selected" : ""} ${highlighted ? "is-highlighted" : ""}`}
                onPointerEnter={() => !option.disabled && setActive((current) => current ? { ...current, highlighted: index } : current)}
                onClick={() => choose(option)}
              >
                <span className="magic-select-option__label">{option.label}</span>
                {selected ? <Check size={17} aria-hidden="true" /> : <span className="magic-select-option__orb" aria-hidden="true" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
