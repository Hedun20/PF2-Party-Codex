import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function calculatePosition(anchor, { minWidth = 220, matchWidth = false } = {}) {
  const rect = anchor.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(
    Math.max(matchWidth ? rect.width : minWidth, rect.width),
    Math.max(220, viewportWidth - 24)
  );
  const left = Math.min(Math.max(12, rect.left), Math.max(12, viewportWidth - width - 12));
  const spaceBelow = viewportHeight - rect.bottom - 12;
  const spaceAbove = rect.top - 12;
  const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
  const maxHeight = Math.max(150, Math.min(420, (openAbove ? spaceAbove : spaceBelow) - 8));

  return {
    left,
    width,
    maxHeight,
    top: openAbove ? undefined : rect.bottom + 8,
    bottom: openAbove ? viewportHeight - rect.top + 8 : undefined
  };
}

export default function FloatingMenu({
  open,
  anchorRef,
  onClose,
  children,
  id,
  className = "",
  minWidth = 220,
  matchWidth = false,
  role = "menu"
}) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPosition(null);
      return undefined;
    }

    const update = () => {
      if (anchorRef.current) setPosition(calculatePosition(anchorRef.current, { minWidth, matchWidth }));
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef, minWidth, matchWidth]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (anchorRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      onClose?.();
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose?.();
      window.requestAnimationFrame(() => anchorRef.current?.focus());
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, anchorRef, onClose]);

  if (!open || !position || typeof document === "undefined") return null;

  const style = {
    left: position.left,
    width: position.width,
    maxHeight: position.maxHeight,
    ...(position.top === undefined ? {} : { top: position.top }),
    ...(position.bottom === undefined ? {} : { bottom: position.bottom })
  };

  return createPortal(
    <div ref={menuRef} id={id} role={role} className={`floating-menu-layer ${className}`.trim()} style={style}>
      {children}
    </div>,
    document.body
  );
}
