import { Link } from "react-router-dom";

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export default function CodexCard({ as, to, href, className = "", tone = "default", children, ...props }) {
  const Component = as || (to ? Link : href ? "a" : "article");
  return (
    <Component
      {...props}
      {...(to ? { to } : {})}
      {...(href ? { href } : {})}
      className={classNames("codex-card", `codex-card--${tone}`, className)}
    >
      {children}
    </Component>
  );
}
