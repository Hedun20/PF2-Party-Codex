function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export default function StatusMessage({ children, tone = "info", className = "", role = "status" }) {
  if (!children) return null;
  return <p className={classNames("status-message", `status-message--${tone}`, className)} role={role}>{children}</p>;
}
