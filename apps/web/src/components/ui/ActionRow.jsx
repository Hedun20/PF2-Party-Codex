function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export default function ActionRow({ children, className = "", align = "start" }) {
  return <div className={classNames("action-row", `action-row--${align}`, className)}>{children}</div>;
}
