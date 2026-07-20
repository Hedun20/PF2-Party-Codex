import { Link } from "react-router-dom";
import { Card } from "./Silverleaf.jsx";

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export default function CodexCard({ as, to, href, className = "", tone = "default", children, interactive, selected = false, ...props }) {
  const Component = as || (to ? Link : href ? "a" : "article");
  return (
    <Card
      as={Component}
      {...props}
      {...(to ? { to } : {})}
      {...(href ? { href } : {})}
      interactive={interactive ?? Boolean(to || href)}
      selected={selected}
      className={classNames("codex-card", `codex-card--${tone}`, className)}
    >
      {children}
    </Card>
  );
}
