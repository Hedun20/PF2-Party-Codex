import { Link } from "react-router-dom";

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export default function CodexButton({
  as,
  to,
  href,
  children,
  className = "",
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  ...props
}) {
  const Component = as || (to ? Link : href ? "a" : "button");
  const isDisabledLink = disabled && Component !== "button";
  const componentProps = {
    ...props,
    className: classNames("codex-button", `codex-button--${variant}`, `codex-button--${size}`, className),
    ...(to ? { to } : {}),
    ...(href ? { href } : {}),
    ...(Component === "button" ? { type, disabled } : { "aria-disabled": disabled || undefined }),
    ...(isDisabledLink ? { onClick: (event) => event.preventDefault(), tabIndex: -1 } : {})
  };
  return (
    <Component {...componentProps}>
      <span className="codex-button__ripple" aria-hidden="true" />
      <span className="codex-button__content">{children}</span>
    </Component>
  );
}
