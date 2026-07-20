import { Link } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { SilverleafLeafIcon } from "./Silverleaf.jsx";

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
  loading = false,
  icon: Icon,
  ...props
}) {
  const Component = as || (to ? Link : href ? "a" : "button");
  const isButton = Component === "button";
  const isDisabledLink = (disabled || loading) && !isButton;
  const ResolvedIcon = loading ? LoaderCircle : Icon || (variant === "primary" ? SilverleafLeafIcon : null);
  const componentProps = {
    ...props,
    className: classNames("sl-button", `sl-button--${variant}`, `sl-button--${size}`, "codex-button", className),
    "aria-busy": loading || undefined,
    ...(to ? { to } : {}),
    ...(href ? { href } : {}),
    ...(isButton ? { type, disabled: disabled || loading } : { "aria-disabled": disabled || loading || undefined }),
    ...(isDisabledLink ? { onClick: (event) => event.preventDefault(), tabIndex: -1 } : {})
  };

  return (
    <Component {...componentProps}>
      {variant === "primary" ? (
        <>
          <span className="sl-button__surface" aria-hidden="true" />
          <span className="sl-button__diamond sl-button__diamond--left" aria-hidden="true" />
          <span className="sl-button__diamond sl-button__diamond--right" aria-hidden="true" />
        </>
      ) : null}
      <span className="sl-button__content codex-button__content">
        {ResolvedIcon ? <ResolvedIcon className={loading ? "sl-spin" : undefined} size={variant === "primary" ? 20 : 17} aria-hidden="true" /> : null}
        <span>{children}</span>
      </span>
    </Component>
  );
}
