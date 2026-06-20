import { useId } from "react";

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export default function VoltageButton({
  as: Component = "button",
  children,
  className = "",
  innerClassName = "",
  variant = "gold",
  size = "md",
  type = "button",
  disabled = false,
  ...props
}) {
  const reactId = useId().replace(/:/g, "");
  const glowId = `voltage-glow-${reactId}`;
  const isButton = Component === "button";

  const innerProps = {
    ...props,
    className: classNames("voltage-button__inner", innerClassName),
    ...(isButton ? { type, disabled } : { "aria-disabled": disabled || undefined }),
  };

  return (
    <span className={classNames("voltage-button", `voltage-button--${variant}`, `voltage-button--${size}`, className)}>
      <Component {...innerProps}>{children}</Component>
      <svg className="voltage-button__svg" viewBox="0 0 240 72" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <filter id={glowId} x="-35%" y="-70%" width="170%" height="240%">
            <feGaussianBlur stdDeviation="3.2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          className="voltage-button__line voltage-button__line--one"
          filter={`url(#${glowId})`}
          d="M22 36 C22 15 39 10 58 10 H182 C203 10 218 18 218 36 C218 55 203 62 182 62 H58 C38 62 22 55 22 36 Z"
        />
        <path
          className="voltage-button__line voltage-button__line--two"
          filter={`url(#${glowId})`}
          d="M28 36 C28 20 43 16 61 16 H179 C196 16 212 22 212 36 C212 50 196 56 179 56 H61 C43 56 28 51 28 36 Z"
        />
      </svg>
      <span className="voltage-button__dots" aria-hidden="true">
        <span className="voltage-button__dot voltage-button__dot--1" />
        <span className="voltage-button__dot voltage-button__dot--2" />
        <span className="voltage-button__dot voltage-button__dot--3" />
        <span className="voltage-button__dot voltage-button__dot--4" />
        <span className="voltage-button__dot voltage-button__dot--5" />
      </span>
    </span>
  );
}
