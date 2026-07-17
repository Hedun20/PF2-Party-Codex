import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { breadcrumbsFor } from "../routing/appRoutes.js";

export default function RouteBreadcrumbs({ session, activeWorld }) {
  const location = useLocation();
  const items = breadcrumbsFor(location.pathname, {
    campaignName: session?.activeCampaign?.name || "Кампания",
    worldName: activeWorld?.title || "Мир"
  });

  if (items.length < 2) return null;

  return (
    <nav className="route-breadcrumbs" aria-label="Хлебные крошки">
      <ol>
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${item.id}-${index}`}>
              {index > 0 ? <ChevronRight size={14} aria-hidden="true" /> : null}
              {current || !item.to ? <span aria-current={current ? "page" : undefined}>{item.label}</span> : <Link to={item.to}>{item.label}</Link>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
