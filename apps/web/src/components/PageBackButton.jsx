import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import CodexButton from "./ui/CodexButton.jsx";
import { parentPathFor } from "../routing/appRoutes.js";

export default function PageBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const parent = parentPathFor(location.pathname);

  if (!parent) return null;

  return (
    <nav className="page-back-navigation" aria-label="Навигация назад">
      <CodexButton type="button" variant="ghost" size="sm" className="page-back-button" onClick={() => navigate(parent)}>
        <ArrowLeft size={16} aria-hidden="true" />
        Назад
      </CodexButton>
    </nav>
  );
}
