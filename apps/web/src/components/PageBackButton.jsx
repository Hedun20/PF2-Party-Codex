import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/Silverleaf.jsx";
import { parentPathFor } from "../routing/appRoutes.js";

export default function PageBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const parent = parentPathFor(location.pathname);

  if (!parent) return null;

  return (
    <nav className="page-back-navigation" aria-label="Навигация назад">
      <Button type="button" variant="ghost" size="sm" icon={ArrowLeft} className="page-back-button" onClick={() => navigate(parent)}>
        Назад
      </Button>
    </nav>
  );
}
