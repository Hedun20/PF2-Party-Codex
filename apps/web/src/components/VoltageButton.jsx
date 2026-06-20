// Compatibility wrapper. Earlier patches used animated VoltageButton, but the project now
// standardizes every action on the calm "Вернуться к статье" button style.
function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export default function VoltageButton({
  as: Component = "button",
  children,
  className = "",
  innerClassName = "",
  type = "button",
  disabled = false,
  ...props
}) {
  const isButton = Component === "button";
  return (
    <Component
      {...props}
      className={classNames("upload-button codex-action-button", className, innerClassName)}
      {...(isButton ? { type, disabled } : { "aria-disabled": disabled || undefined })}
    >
      {children}
    </Component>
  );
}
