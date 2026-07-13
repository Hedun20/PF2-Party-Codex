import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import CodexButton from "./ui/CodexButton.jsx";

const MAIN_ROUTES = new Set(["/", "/gm", "/player"]);

function normalizePath(pathname = "/") {
  const value = pathname.replace(/\/+$/, "");
  return value || "/";
}

function fallbackPath(pathname) {
  const worldMatch = pathname.match(/^\/world\/([^/]+)(?:\/(.+))?$/);
  if (worldMatch?.[2]) return `/world/${worldMatch[1]}`;
  if (worldMatch) return "/archive";

  if (/^\/(?:page|edit)\//.test(pathname)) return "/archive";
  if (["/editor", "/category", "/timeline", "/maps", "/characters", "/handouts", "/sessions", "/notes", "/dice", "/guide", "/missing", "/foundry"].some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return "/archive";
  }

  return "/";
}

export default function PageBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = normalizePath(location.pathname);

  const hidden = MAIN_ROUTES.has(pathname)
    || pathname === "/campaigns"
    || pathname.startsWith("/invite/");

  if (hidden) return null;

  const goBack = () => {
    const hasInternalHistory = location.key && location.key !== "default" && window.history.length > 1;
    if (hasInternalHistory) {
      navigate(-1);
      return;
    }
    navigate(fallbackPath(pathname));
  };

  return (
    <nav className="page-back-navigation" aria-label="Навигация назад">
      <CodexButton type="button" variant="ghost" size="sm" className="page-back-button" onClick={goBack}>
        <ArrowLeft size={16} aria-hidden="true" />
        Назад
      </CodexButton>
    </nav>
  );
}
